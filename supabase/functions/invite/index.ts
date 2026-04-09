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

    const body = await req.json();
    const { email, project_id, role } = body;

    if (!email || !project_id) {
      return new Response(
        JSON.stringify({ error: "email and project_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate role
    const validRoles = ["lji_admin", "lji_member", "client_admin", "client_member"];
    const memberRole = role || "client_member";
    if (!validRoles.includes(memberRole)) {
      return new Response(
        JSON.stringify({ error: `Invalid role. Must be one of: ${validRoles.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only LJI admins or client_admins on the project can invite
    if (!isLjiAdmin(profile.role)) {
      const membership = await checkProjectMembership(supabase, project_id, user.id);
      if (membership.role !== "client_admin") {
        return new Response(
          JSON.stringify({ error: "Only LJI admins or client admins can invite users" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Client admins can only invite client roles
      if (memberRole === "lji_admin" || memberRole === "lji_member") {
        return new Response(
          JSON.stringify({ error: "Client admins cannot assign LJI roles" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Use service client to invite user via magic link
    const serviceClient = createServiceClient();

    // Invite user (creates account if not exists, sends magic link)
    const { data: inviteData, error: inviteErr } =
      await serviceClient.auth.admin.inviteUserByEmail(email, {
        data: { role: memberRole },
        redirectTo: `${Deno.env.get("SITE_URL") ?? "https://app.loyaltylift.com"}/auth/callback`,
      });

    if (inviteErr) {
      // If user already exists, look them up instead
      if (inviteErr.message.includes("already been registered")) {
        const { data: existingUsers, error: listErr } =
          await serviceClient.auth.admin.listUsers();

        if (listErr) {
          return new Response(
            JSON.stringify({ error: listErr.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const existingUser = existingUsers.users.find(
          (u: { email?: string }) => u.email === email
        );

        if (!existingUser) {
          return new Response(
            JSON.stringify({ error: "User not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Add as project member
        const { error: memberErr } = await serviceClient
          .from("project_members")
          .upsert(
            {
              project_id,
              user_id: existingUser.id,
              role: memberRole,
            },
            { onConflict: "project_id,user_id" }
          );

        if (memberErr) {
          return new Response(
            JSON.stringify({ error: memberErr.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Send magic link for existing user
        const { error: magicErr } = await serviceClient.auth.admin.generateLink({
          type: "magiclink",
          email,
          options: {
            redirectTo: `${Deno.env.get("SITE_URL") ?? "https://app.loyaltylift.com"}/auth/callback`,
          },
        });

        if (magicErr) {
          // Non-fatal: user was still added to project
          console.error("Failed to send magic link:", magicErr.message);
        }

        // Log activity
        await serviceClient.from("activity_log").insert({
          project_id,
          user_id: user.id,
          action: "member_invited",
          metadata: { email, role: memberRole, existing_user: true },
        });

        return new Response(
          JSON.stringify({
            data: {
              user_id: existingUser.id,
              email,
              role: memberRole,
              existing_user: true,
            },
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: inviteErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // New user invited -- add as project member
    if (inviteData.user) {
      // Ensure profile exists
      await serviceClient.from("profiles").upsert(
        {
          id: inviteData.user.id,
          email,
          role: memberRole,
        },
        { onConflict: "id" }
      );

      const { error: memberErr } = await serviceClient
        .from("project_members")
        .insert({
          project_id,
          user_id: inviteData.user.id,
          role: memberRole,
        });

      if (memberErr) {
        return new Response(
          JSON.stringify({ error: memberErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Log activity
    await serviceClient.from("activity_log").insert({
      project_id,
      user_id: user.id,
      action: "member_invited",
      metadata: { email, role: memberRole, existing_user: false },
    });

    return new Response(
      JSON.stringify({
        data: {
          user_id: inviteData.user?.id,
          email,
          role: memberRole,
          existing_user: false,
        },
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
