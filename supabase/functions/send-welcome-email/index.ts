import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  email: string;
  full_name: string;
  role: string;
  password: string;
  isReinvite?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, full_name, role, password, isReinvite }: EmailRequest = await req.json();

    const emailResponse = await resend.emails.send({
      from: "ZenoTimeFlow <onboarding@resend.dev>",
      to: [email],
      subject: isReinvite ? "You're Reinvited to ZenoTimeFlow!" : "Welcome to ZenoTimeFlow!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 ${isReinvite ? 'Welcome Back to' : 'Welcome to'} ZenoTimeFlow!</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Hello ${full_name}!</h2>
            
            <p style="color: #555; line-height: 1.6; font-size: 16px;">
              ${isReinvite ? 'You have been reinvited to' : 'We\'re thrilled to welcome you to'} ZenoTimeFlow! ⭐ Your account has been set up and you're all ready to get started. Below are your login credentials to access the platform:
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <p style="margin: 0; color: #333;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 10px 0; color: #333;"><strong>Temporary Password:</strong> ${password}</p>
              <p style="margin: 10px 0 0 0; color: #333;"><strong>Role:</strong> ${role.toUpperCase()}</p>
            </div>
            
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #856404;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                <strong>Important:</strong> Please change your password after your first login for security purposes.
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://zenotimeflow.com/auth" 
                 style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Login to ZenoTimeFlow
              </a>
            </div>
          </div>
        </div>
      `,
    });

    console.log("Email send result:", emailResponse.error ? "ERROR" : "SUCCESS");

    if (emailResponse.error) {
      console.error("Resend error:", emailResponse.error);
      return new Response(
        JSON.stringify({ error: `Email failed: ${emailResponse.error.message}` }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Email sent successfully, ID:", emailResponse.data?.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email sent successfully" 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: `Error: ${error.message}` }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);