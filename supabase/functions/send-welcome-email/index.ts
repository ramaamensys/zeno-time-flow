import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://zenotimeflow.com, http://localhost:3000",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  full_name: string;
  role: string;
  password: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Request URL:', req.url);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authorization - only authenticated users with proper roles can send emails
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided for send-welcome-email');
      return new Response(JSON.stringify({ error: 'Unauthorized - missing authorization header' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create Supabase client to verify the caller
    const supabaseUrl = "https://usjvqsqotpedesvldkln.supabase.co";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    // Verify the caller is authenticated and has admin or super_admin role
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Failed to get user for email sending:', userError);
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if user has admin or super_admin role
    const { data: roles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (roleError || !roles?.some(r => ['admin', 'super_admin'].includes(r.role))) {
      console.error('User is not authorized to send emails:', { userId: user.id, roles });
      return new Response(JSON.stringify({ error: 'Insufficient permissions - admin role required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { email, full_name, role, password }: WelcomeEmailRequest = await req.json();

    console.log(`Sending welcome email to: ${email}`);
    console.log('Resend API Key configured:', !!Deno.env.get("RESEND_API_KEY"));

    if (!Deno.env.get("RESEND_API_KEY")) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    // Direct login link to ZenoTimeFlow project
    const loginLink = 'https://zenotimeflow.com/auth';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Welcome to ZenoTimeFlow!</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Hello ${full_name || 'there'}!</h2>
          
          <p style="color: #555; line-height: 1.6; font-size: 16px;">
            Your account has been created for ZenoTimeFlow! 🌟 Below are your login credentials to get started immediately.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <p style="margin: 0; color: #333;"><strong>Username:</strong> ${full_name}</p>
            <p style="margin: 10px 0; color: #333;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 10px 0; color: #333;"><strong>Temporary Password:</strong> ${password}</p>
            <p style="margin: 10px 0 0 0; color: #333;"><strong>Role:</strong> ${role.replace('_', ' ').toUpperCase()}</p>
          </div>
          
          <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196f3;">
            <p style="margin: 0; color: #0277bd; font-size: 14px;">
              <strong>Important:</strong> Please change your temporary password after your first login for security purposes.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginLink}" 
               style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Accept & Login to ZenoTimeFlow
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
            Click the button above to access your ZenoTimeFlow account and start managing your time effectively.
          </p>
          
          <hr style="border: none; height: 1px; background: #ddd; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
            This email was sent automatically from ZenoTimeFlow. Please do not reply to this email.
          </p>
        </div>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "ZenoTimeFlow <noreply@zenotimeflow.com>",
      to: [email],
      subject: "Welcome to ZenoTimeFlow - Your Account Details!",
      html: htmlContent,
    });

    if (emailResponse.error) {
      console.error("Resend error:", emailResponse.error);
      throw new Error(`Email sending failed: ${emailResponse.error.message}`);
    }

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
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