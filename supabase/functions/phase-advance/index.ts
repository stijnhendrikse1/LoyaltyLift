import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import {
  createSupabaseClient,
  getUser,
  getUserProfile,
  isLjiAdmin,
} from "../_shared/supabase.ts";

const PHASE_ORDER = ["discovery", "design", "launch"] as const;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "PUT") {
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
        JSON.stringify({ error: "Only LJI admins can advance project phases" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { project_id } = body;

    if (!project_id) {
      return new Response(
        JSON.stringify({ error: "project_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get current project
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("*")
      .eq("id", project_id)
      .single();

    if (projErr || !project) {
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const currentIndex = PHASE_ORDER.indexOf(
      project.phase as typeof PHASE_ORDER[number]
    );

    if (currentIndex === -1 || currentIndex >= PHASE_ORDER.length - 1) {
      return new Response(
        JSON.stringify({
          error: `Cannot advance beyond "${project.phase}". Project is already at the final phase.`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check all sections in current phase are approved
    const { data: sections, error: secErr } = await supabase
      .from("project_sections")
      .select("section_id, status")
      .eq("project_id", project_id)
      .eq("phase", project.phase)
      .neq("status", "skipped");

    if (secErr) {
      return new Response(
        JSON.stringify({ error: secErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const unapproved = (sections ?? []).filter(
      (s: { status: string }) => s.status !== "approved"
    );

    if (unapproved.length > 0) {
      return new Response(
        JSON.stringify({
          error: "All sections in the current phase must be approved (or skipped) before advancing.",
          unapproved_sections: unapproved.map(
            (s: { section_id: string; status: string }) => ({
              section_id: s.section_id,
              status: s.status,
            })
          ),
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const nextPhase = PHASE_ORDER[currentIndex + 1];

    // Update project phase
    const { data: updated, error: updateErr } = await supabase
      .from("projects")
      .update({
        phase: nextPhase,
        updated_at: new Date().toISOString(),
      })
      .eq("id", project_id)
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
      action: "phase_advanced",
      metadata: { from: project.phase, to: nextPhase },
    });

    return new Response(
      JSON.stringify({
        data: updated,
        advanced: { from: project.phase, to: nextPhase },
      }),
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
