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

    if (req.method === "POST") {
      return await handlePost(supabase, req, user.id, profile.role);
    }

    if (req.method === "PUT") {
      return await handlePut(supabase, req, user.id, profile.role);
    }

    if (req.method === "DELETE") {
      return await handleDelete(supabase, req, user.id, profile.role);
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

async function handlePost(
  supabase: ReturnType<typeof import("https://esm.sh/@supabase/supabase-js@2").createClient>,
  req: Request,
  userId: string,
  role: string
) {
  const body = await req.json();
  const { project_id, section_id, row_index, data: rowData } = body;

  if (!project_id || !section_id || row_index === undefined || !rowData) {
    return new Response(
      JSON.stringify({ error: "project_id, section_id, row_index, and data are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!isLjiAdmin(role)) {
    await checkProjectMembership(supabase, project_id, userId);
  }

  const { data, error } = await supabase
    .from("entity_rows")
    .insert({
      project_id,
      section_id,
      row_index,
      data: rowData,
    })
    .select()
    .single();

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Auto-update section status to in_progress if not_started
  await supabase
    .from("project_sections")
    .update({ status: "in_progress", updated_at: new Date().toISOString() })
    .eq("project_id", project_id)
    .eq("section_id", section_id)
    .eq("status", "not_started");

  return new Response(
    JSON.stringify({ data }),
    { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handlePut(
  supabase: ReturnType<typeof import("https://esm.sh/@supabase/supabase-js@2").createClient>,
  req: Request,
  userId: string,
  role: string
) {
  const body = await req.json();
  const { id, project_id, row_index, data: rowData } = body;

  if (!id || !project_id) {
    return new Response(
      JSON.stringify({ error: "id and project_id are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!isLjiAdmin(role)) {
    await checkProjectMembership(supabase, project_id, userId);
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (row_index !== undefined) updatePayload.row_index = row_index;
  if (rowData !== undefined) updatePayload.data = rowData;

  const { data, error } = await supabase
    .from("entity_rows")
    .update(updatePayload)
    .eq("id", id)
    .eq("project_id", project_id)
    .select()
    .single();

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ data }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleDelete(
  supabase: ReturnType<typeof import("https://esm.sh/@supabase/supabase-js@2").createClient>,
  req: Request,
  userId: string,
  role: string
) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const projectId = url.searchParams.get("project_id");

  if (!id || !projectId) {
    return new Response(
      JSON.stringify({ error: "id and project_id are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!isLjiAdmin(role)) {
    await checkProjectMembership(supabase, projectId, userId);
  }

  const { error } = await supabase
    .from("entity_rows")
    .delete()
    .eq("id", id)
    .eq("project_id", projectId);

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
