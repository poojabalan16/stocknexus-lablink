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

    // First, check if user already exists (signed up through the combined form)
    const { data: existingUsers, error: listError } = await supabaseClient.auth.admin.listUsers();
    
    let userId: string;
    let isNewUser = false;
    
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (existingUser) {
      // User already exists - they signed up through the combined form
      userId = existingUser.id;
      console.log('Found existing user:', userId);
      
      // Update user's email confirmation if not confirmed
      if (!existingUser.email_confirmed_at) {
        await supabaseClient.auth.admin.updateUserById(userId, {
          email_confirm: true,
        });
      }
    } else {
      // User doesn't exist - create new user with temporary password (legacy flow)
      isNewUser = true;
      const tempPassword = crypto.randomUUID();
      
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
      
      userId = userData.user.id;
      console.log('Created new user:', userId);
    }

    // Check if profile exists
    const { data: existingProfile } = await supabaseClient
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (existingProfile) {
      // Update existing profile
      const { error: profileUpdateError } = await supabaseClient
        .from("profiles")
        .update({
          department,
          approved: true,
        })
        .eq("id", userId);

      if (profileUpdateError) {
        console.error('Profile update error:', profileUpdateError);
        throw new Error(`Failed to update profile: ${profileUpdateError.message}`);
      }
      console.log('Profile updated successfully');
    } else {
      // Insert new profile
      const { error: profileError } = await supabaseClient
        .from("profiles")
        .insert({
          id: userId,
          email,
          full_name: fullName,
          department,
          approved: true,
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        throw new Error(`Failed to create profile: ${profileError.message}`);
      }
      console.log('Profile created successfully');
    }

    // Check if role already exists
    const { data: existingRole } = await supabaseClient
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (existingRole) {
      // Update existing role
      const { error: roleUpdateError } = await supabaseClient
        .from("user_roles")
        .update({
          role: requestedRole,
          department,
        })
        .eq("user_id", userId);

      if (roleUpdateError) {
        throw new Error(`Failed to update role: ${roleUpdateError.message}`);
      }
    } else {
      // Assign new role
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

    // Different email content based on whether user is new or existing
    const emailContent = isNewUser 
      ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Welcome to StockNexus!</h1>
          <p>Hello ${fullName},</p>
          <p>Your account has been approved! A temporary password has been created for you.</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 5px 0;"><strong>Department:</strong> ${department}</p>
            <p style="margin: 5px 0;"><strong>Role:</strong> ${requestedRole}</p>
          </div>
          <p style="color: #dc2626;"><strong>Important:</strong> Please use the "Forgot Password" option to set your password.</p>
          <a href="${appUrl}/auth" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            Log In Now
          </a>
          <p style="color: #6b7280; font-size: 14px;">If you have any questions, please contact your administrator.</p>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Welcome to StockNexus!</h1>
          <p>Hello ${fullName},</p>
          <p>Great news! Your access request has been approved. You can now log in with the credentials you created during sign up.</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 5px 0;"><strong>Department:</strong> ${department}</p>
            <p style="margin: 5px 0;"><strong>Role:</strong> ${requestedRole}</p>
          </div>
          <a href="${appUrl}/auth" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            Log In Now
          </a>
          <p style="color: #6b7280; font-size: 14px;">If you forgot your password, use the "Forgot Password" option on the login page.</p>
        </div>
      `;

    await resend.emails.send({
      from: "StockNexus <onboarding@resend.dev>",
      to: [email],
      subject: "Your StockNexus Account Has Been Approved",
      html: emailContent,
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
