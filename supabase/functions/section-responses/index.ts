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

  try {
    const supabase = createSupabaseClient(req);
    const user = await getUser(supabase);
    const profile = await getUserProfile(supabase, user.id);

    if (req.method === "GET") {
      return await handleGet(supabase, req, user.id, profile.role);
    }

    if (req.method === "PUT") {
      return await handlePut(supabase, req, user.id, profile.role);
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

async function handleGet(
  supabase: ReturnType<typeof import("https://esm.sh/@supabase/supabase-js@2").createClient>,
  req: Request,
  userId: string,
  role: string
) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get("project_id");
  const sectionId = url.searchParams.get("section_id");

  if (!projectId || !sectionId) {
    return new Response(
      JSON.stringify({ error: "project_id and section_id are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!isLjiAdmin(role)) {
    await checkProjectMembership(supabase, projectId, userId);
  }

  // Fetch section status
  const { data: section, error: secErr } = await supabase
    .from("project_sections")
    .select("*")
    .eq("project_id", projectId)
    .eq("section_id", sectionId)
    .single();

  if (secErr) {
    return new Response(
      JSON.stringify({ error: "Section not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Fetch all responses for this section
  const { data: responses, error: respErr } = await supabase
    .from("responses")
    .select("*")
    .eq("project_id", projectId)
    .eq("section_id", sectionId)
    .order("question_key");

  if (respErr) {
    return new Response(
      JSON.stringify({ error: respErr.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Fetch file uploads for this section
  const { data: files, error: fileErr } = await supabase
    .from("file_uploads")
    .select("*")
    .eq("project_id", projectId)
    .eq("section_id", sectionId);

  if (fileErr) {
    return new Response(
      JSON.stringify({ error: fileErr.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({
      data: {
        section,
        responses: responses ?? [],
        files: files ?? [],
      },
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handlePut(
  supabase: ReturnType<typeof import("https://esm.sh/@supabase/supabase-js@2").createClient>,
  req: Request,
  userId: string,
  role: string
) {
  const body = await req.json();
  const { project_id, section_id, question_key, value } = body;

  if (!project_id || !section_id || !question_key || value === undefined) {
    return new Response(
      JSON.stringify({ error: "project_id, section_id, question_key, and value are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!isLjiAdmin(role)) {
    await checkProjectMembership(supabase, project_id, userId);
  }

  // Upsert response (unique on project_id, section_id, question_key)
  const { data, error } = await supabase
    .from("responses")
    .upsert(
      {
        project_id,
        section_id,
        question_key,
        value,
        responded_by: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id,section_id,question_key" }
    )
    .select()
    .single();

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Auto-update section status to in_progress if currently not_started
  await supabase
    .from("project_sections")
    .update({ status: "in_progress", updated_at: new Date().toISOString() })
    .eq("project_id", project_id)
    .eq("section_id", section_id)
    .eq("status", "not_started");

  return new Response(
    JSON.stringify({ data }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
