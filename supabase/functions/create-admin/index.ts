import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateAdminRequest {
  email: string;
  password?: string;
  fullName: string;
  department?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    const { email, password, fullName, department }: CreateAdminRequest = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let userId: string | null = null;

    // Try to create the user if a password is provided
    if (password) {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (!createErr && created?.user?.id) {
        userId = created.user.id;
        console.log("Created new user for", email, userId);
      } else if (createErr) {
        console.warn("Create user error (may already exist):", createErr.message);
      }
    }

    // If userId not set, try to find an existing user by email via admin list
    if (!userId) {
      const { data: listData, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (listErr) throw listErr;
      const existing = listData.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
      if (existing) {
        userId = existing.id;
      }
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "User not found or could not be created" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Upsert profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: userId,
          email,
          full_name: fullName || "Admin User",
          department: (department as any) ?? null,
        },
        { onConflict: "id" }
      );
    if (profileError) throw profileError;

    // Upsert admin role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        {
          user_id: userId,
          role: "admin" as any,
          department: (department as any) ?? null,
        },
        { onConflict: "user_id,role" }
      );
    if (roleError) throw roleError;

    // Mark registration request approved
    const { error: requestError } = await supabaseAdmin
      .from("registration_requests")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("email", email);
    if (requestError) console.warn("Failed updating registration request:", requestError.message);

    return new Response(
      JSON.stringify({ success: true, userId, email }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in create-admin:", error);
    return new Response(JSON.stringify({ error: error.message || "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
