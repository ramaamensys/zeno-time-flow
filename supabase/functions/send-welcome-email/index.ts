import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("Function called with method:", req.method);

  if (req.method === "OPTIONS") {
    console.log("Handling CORS preflight");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing request...");
    const body = await req.json();
    console.log("Request body keys:", Object.keys(body));

    const { email, full_name, role, password, isReinvite } = body;
    console.log("Email recipient:", email);

    // Check for API key
    const apiKey = Deno.env.get("RESEND_API_KEY");
    console.log("API key present:", !!apiKey);

    if (!apiKey) {
      console.error("No RESEND_API_KEY found");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Dynamic import of Resend to avoid startup issues
    console.log("Importing Resend...");
    const { Resend } = await import("npm:resend@2.0.0");
    console.log("Resend imported successfully");

    const resend = new Resend(apiKey);
    console.log("Resend client created");

    const result = await resend.emails.send({
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

    console.log("Email send result:", result.error ? "ERROR" : "SUCCESS");

    if (result.error) {
      console.error("Resend error:", result.error);
      return new Response(
        JSON.stringify({ error: `Email failed: ${result.error.message}` }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Email sent successfully, ID:", result.data?.id);

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
});