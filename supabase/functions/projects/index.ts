import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import {
  createSupabaseClient,
  getUser,
  getUserProfile,
  isLjiAdmin,
} from "../_shared/supabase.ts";

// Section template: all sections that get created for a new project
const SECTION_TEMPLATE = [
  // Discovery phase
  { section_id: "company_overview", phase: "discovery" },
  { section_id: "program_overview", phase: "discovery" },
  { section_id: "program_goals", phase: "discovery" },
  { section_id: "customer_segments", phase: "discovery" },
  { section_id: "competitive_landscape", phase: "discovery" },
  { section_id: "data_inventory", phase: "discovery" },
  { section_id: "tech_stack", phase: "discovery" },
  { section_id: "financial_overview", phase: "discovery" },
  { section_id: "stakeholder_map", phase: "discovery" },
  // Design phase
  { section_id: "earn_structure", phase: "design" },
  { section_id: "burn_structure", phase: "design" },
  { section_id: "tier_design", phase: "design" },
  { section_id: "benefits_catalog", phase: "design" },
  { section_id: "member_experience", phase: "design" },
  { section_id: "data_model", phase: "design" },
  { section_id: "entity_details", phase: "design" },
  { section_id: "communications_plan", phase: "design" },
  // Launch phase
  { section_id: "rollout_plan", phase: "launch" },
  { section_id: "success_metrics", phase: "launch" },
  { section_id: "training_plan", phase: "launch" },
];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient(req);
    const user = await getUser(supabase);
    const profile = await getUserProfile(supabase, user.id);

    if (req.method === "GET") {
      return await handleGet(supabase, user.id, profile.role);
    }

    if (req.method === "POST") {
      if (!isLjiAdmin(profile.role)) {
        return new Response(
          JSON.stringify({ error: "Only LJI admins can create projects" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return await handlePost(supabase, req, user.id);
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

async function handleGet(
  supabase: ReturnType<typeof import("https://esm.sh/@supabase/supabase-js@2").createClient>,
  userId: string,
  role: string
) {
  // LJI admins see all projects; others see only their memberships
  let query = supabase
    .from("projects")
    .select(`
      *,
      client_organizations ( id, name, industry, logo_url ),
      project_sections ( section_id, status, phase )
    `)
    .order("created_at", { ascending: false });

  if (!isLjiAdmin(role)) {
    // Filter to projects user is a member of
    const { data: memberships, error: memErr } = await supabase
      .from("project_members")
      .select("project_id")
      .eq("user_id", userId);

    if (memErr) {
      return new Response(
        JSON.stringify({ error: memErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const projectIds = (memberships ?? []).map((m: { project_id: string }) => m.project_id);
    if (projectIds.length === 0) {
      return new Response(
        JSON.stringify({ data: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    query = query.in("id", projectIds);
  }

  const { data, error } = await query;
  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Compute progress stats per project
  const projects = (data ?? []).map((project: Record<string, unknown>) => {
    const sections = (project.project_sections as Array<{ status: string; phase: string }>) ?? [];
    const total = sections.length;
    const approved = sections.filter((s) => s.status === "approved").length;
    const inReview = sections.filter((s) => s.status === "in_review").length;
    const inProgress = sections.filter((s) => s.status === "in_progress").length;
    const notStarted = sections.filter((s) => s.status === "not_started").length;

    return {
      ...project,
      progress: {
        total,
        approved,
        in_review: inReview,
        in_progress: inProgress,
        not_started: notStarted,
        percent_complete: total > 0 ? Math.round((approved / total) * 100) : 0,
      },
    };
  });

  return new Response(
    JSON.stringify({ data: projects }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handlePost(
  supabase: ReturnType<typeof import("https://esm.sh/@supabase/supabase-js@2").createClient>,
  req: Request,
  userId: string
) {
  const body = await req.json();
  const { client_org_id, program_name } = body;

  if (!client_org_id || !program_name) {
    return new Response(
      JSON.stringify({ error: "client_org_id and program_name are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Create project
  const { data: project, error: projErr } = await supabase
    .from("projects")
    .insert({
      client_org_id,
      program_name,
      lji_lead_id: userId,
      phase: "discovery",
      status: "active",
    })
    .select()
    .single();

  if (projErr) {
    return new Response(
      JSON.stringify({ error: projErr.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Add creator as project member
  const { error: memberErr } = await supabase
    .from("project_members")
    .insert({
      project_id: project.id,
      user_id: userId,
      role: "lji_admin",
    });

  if (memberErr) {
    return new Response(
      JSON.stringify({ error: memberErr.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Create all project_sections from template
  const sectionRows = SECTION_TEMPLATE.map((t) => ({
    project_id: project.id,
    section_id: t.section_id,
    phase: t.phase,
    status: "not_started",
    visible: true,
  }));

  const { error: secErr } = await supabase
    .from("project_sections")
    .insert(sectionRows);

  if (secErr) {
    return new Response(
      JSON.stringify({ error: secErr.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Log activity
  await supabase.from("activity_log").insert({
    project_id: project.id,
    user_id: userId,
    action: "project_created",
    metadata: { program_name },
  });

  return new Response(
    JSON.stringify({ data: project }),
    { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
