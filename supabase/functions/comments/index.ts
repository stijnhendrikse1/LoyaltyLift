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

    if (req.method === "POST") {
      return await handlePost(supabase, req, user.id, profile.role);
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

  if (!projectId) {
    return new Response(
      JSON.stringify({ error: "project_id is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!isLjiAdmin(role)) {
    await checkProjectMembership(supabase, projectId, userId);
  }

  let query = supabase
    .from("comments")
    .select(`
      *,
      author:author_id ( id, email, full_name, avatar_url )
    `)
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (sectionId) {
    query = query.eq("section_id", sectionId);
  }

  const { data, error } = await query;
  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ data: data ?? [] }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handlePost(
  supabase: ReturnType<typeof import("https://esm.sh/@supabase/supabase-js@2").createClient>,
  req: Request,
  userId: string,
  role: string
) {
  const body = await req.json();
  const { project_id, section_id, question_key, body: commentBody, parent_id } = body;

  if (!project_id || !section_id || !commentBody) {
    return new Response(
      JSON.stringify({ error: "project_id, section_id, and body are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!isLjiAdmin(role)) {
    await checkProjectMembership(supabase, project_id, userId);
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({
      project_id,
      section_id,
      question_key: question_key ?? null,
      body: commentBody,
      author_id: userId,
      parent_id: parent_id ?? null,
    })
    .select(`
      *,
      author:author_id ( id, email, full_name, avatar_url )
    `)
    .single();

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Log activity
  await supabase.from("activity_log").insert({
    project_id,
    user_id: userId,
    action: "comment_added",
    metadata: { section_id, comment_id: data.id },
  });

  return new Response(
    JSON.stringify({ data }),
    { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
