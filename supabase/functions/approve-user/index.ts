import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ApproveUserRequest {
  requestId: string;
  email: string;
  fullName: string;
  department: string;
  requestedRole: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        db: {
          schema: 'public',
        },
        global: {
          headers: {
            'apikey': Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          },
        },
      }
    );

    const { requestId, email, fullName, department, requestedRole }: ApproveUserRequest = await req.json();

    // Generate a temporary password
    const tempPassword = crypto.randomUUID();

    // Create user in Supabase Auth
    const { data: userData, error: createError } = await supabaseClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (createError) {
      throw new Error(`Failed to create user: ${createError.message}`);
    }

    const userId = userData.user.id;

    // Insert profile
    console.log('Attempting to insert profile for user:', userId);
    const { error: profileError } = await supabaseClient
      .from("profiles")
      .insert({
        id: userId,
        email,
        full_name: fullName,
        department,
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      throw new Error(`Failed to create profile: ${profileError.message}`);
    }
    console.log('Profile created successfully');

    // Assign role
    const { error: roleError } = await supabaseClient
      .from("user_roles")
      .insert({
        user_id: userId,
        role: requestedRole,
        department,
      });

    if (roleError) {
      throw new Error(`Failed to assign role: ${roleError.message}`);
    }

    // Update registration request
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const { data: { user: adminUser } } = await supabaseClient.auth.getUser(token || "");

    const { error: updateError } = await supabaseClient
      .from("registration_requests")
      .update({
        status: "approved",
        reviewed_by: adminUser?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (updateError) {
      throw new Error(`Failed to update request: ${updateError.message}`);
    }

    // Send confirmation email
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ 
          success: true, 
          userId,
          message: "User approved but email could not be sent (RESEND_API_KEY not configured)" 
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    const resend = new Resend(resendApiKey);
    const projectId = Deno.env.get("SUPABASE_URL")?.split("//")[1]?.split(".")[0] || "lhlxygosvltrqigfathv";
    const appUrl = `https://id-preview--${projectId}.lovable.app`;

    await resend.emails.send({
      from: "StockNexus <onboarding@resend.dev>",
      to: [email],
      subject: "Your StockNexus Account Has Been Approved",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Welcome to StockNexus!</h1>
          <p>Hello ${fullName},</p>
          <p>Your account has been approved! You can now log in to the system.</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 5px 0;"><strong>Temporary Password:</strong> ${tempPassword}</p>
            <p style="margin: 5px 0;"><strong>Department:</strong> ${department}</p>
            <p style="margin: 5px 0;"><strong>Role:</strong> ${requestedRole}</p>
          </div>
          <p style="color: #dc2626;"><strong>Important:</strong> Please change your password after your first login.</p>
          <a href="${appUrl}/auth" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            Log In Now
          </a>
          <p style="color: #6b7280; font-size: 14px;">If you have any questions, please contact your administrator.</p>
        </div>
      `,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId,
        message: "User approved and confirmation email sent" 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in approve-user function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
