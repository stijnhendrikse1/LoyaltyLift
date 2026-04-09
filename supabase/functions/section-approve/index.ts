import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import {
  createSupabaseClient,
  getUser,
  getUserProfile,
  isLjiAdmin,
} from "../_shared/supabase.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabase = createSupabaseClient(req);
    const user = await getUser(supabase);
    const profile = await getUserProfile(supabase, user.id);

    // LJI admin only
    if (!isLjiAdmin(profile.role)) {
      return new Response(
        JSON.stringify({ error: "Only LJI admins can approve sections" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { project_id, section_id } = body;

    if (!project_id || !section_id) {
      return new Response(
        JSON.stringify({ error: "project_id and section_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify section exists and is in_review
    const { data: section, error: secErr } = await supabase
      .from("project_sections")
      .select("*")
      .eq("project_id", project_id)
      .eq("section_id", section_id)
      .single();

    if (secErr || !section) {
      return new Response(
        JSON.stringify({ error: "Section not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (section.status !== "in_review") {
      return new Response(
        JSON.stringify({
          error: `Cannot approve section with status "${section.status}". Must be "in_review".`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update status to approved
    const { data: updated, error: updateErr } = await supabase
      .from("project_sections")
      .update({
        status: "approved",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("project_id", project_id)
      .eq("section_id", section_id)
      .select()
      .single();

    if (updateErr) {
      return new Response(
        JSON.stringify({ error: updateErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log activity
    await supabase.from("activity_log").insert({
      project_id,
      user_id: user.id,
      action: "section_approved",
      metadata: { section_id },
    });

    return new Response(
      JSON.stringify({ data: updated }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
