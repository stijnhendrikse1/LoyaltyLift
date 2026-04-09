import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import {
  createSupabaseClient,
  getUser,
  getUserProfile,
  checkProjectMembership,
  isLjiAdmin,
} from "../_shared/supabase.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabase = createSupabaseClient(req);
    const user = await getUser(supabase);
    const profile = await getUserProfile(supabase, user.id);

    const url = new URL(req.url);
    const projectId = url.searchParams.get("project_id");

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "project_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check membership (LJI admins bypass)
    if (!isLjiAdmin(profile.role)) {
      await checkProjectMembership(supabase, projectId, user.id);
    }

    // Fetch project with all related data
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select(`
        *,
        client_organizations ( * ),
        project_members ( user_id, role, joined_at, profiles:user_id ( id, email, full_name, avatar_url, role ) ),
        project_sections ( id, section_id, status, phase, owner_id, visible, completed_at )
      `)
      .eq("id", projectId)
      .single();

    if (projErr) {
      return new Response(
        JSON.stringify({ error: projErr.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Compute section progress
    const sections = (project.project_sections as Array<{ status: string; phase: string }>) ?? [];
    const total = sections.length;
    const approved = sections.filter((s) => s.status === "approved").length;

    const enriched = {
      ...project,
      progress: {
        total,
        approved,
        percent_complete: total > 0 ? Math.round((approved / total) * 100) : 0,
      },
    };

    return new Response(
      JSON.stringify({ data: enriched }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    const status =
      message === "Unauthorized" ? 401 :
      message === "Not a member of this project" ? 403 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
