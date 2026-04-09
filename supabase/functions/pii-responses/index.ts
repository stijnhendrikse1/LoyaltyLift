import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import {
  createSupabaseClient,
  createServiceClient,
  getUser,
  getUserProfile,
  checkProjectMembership,
  isLjiAdmin,
} from "../_shared/supabase.ts";

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

    const body = await req.json();
    const { project_id, section_id, question_key, value } = body;

    if (!project_id || !section_id || !question_key || value === undefined) {
      return new Response(
        JSON.stringify({ error: "project_id, section_id, question_key, and value are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check membership
    if (!isLjiAdmin(profile.role)) {
      await checkProjectMembership(supabase, project_id, user.id);
    }

    const encryptionKey = Deno.env.get("PII_ENCRYPTION_KEY");
    if (!encryptionKey) {
      return new Response(
        JSON.stringify({ error: "PII encryption is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service client to call the SECURITY DEFINER function that
    // encrypts the value with pgcrypto and upserts into responses_pii
    const serviceClient = createServiceClient();
    const valueStr = typeof value === "string" ? value : JSON.stringify(value);

    const { data: piiData, error: piiErr } = await serviceClient.rpc("pii_upsert", {
      p_project_id: project_id,
      p_section_id: section_id,
      p_question_key: question_key,
      p_value: valueStr,
      p_user_id: user.id,
      p_key: encryptionKey,
    });

    if (piiErr) {
      return new Response(
        JSON.stringify({ error: piiErr.message }),
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
      JSON.stringify({ data: piiData }),
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
