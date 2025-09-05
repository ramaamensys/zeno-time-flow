import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, full_name, role, password, isReinvite } = await req.json();
    
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Import Resend
    const { Resend } = await import("npm:resend@2.0.0");
    const resend = new Resend(apiKey);

    // Send email
    const { data, error } = await resend.emails.send({
      from: "ZenoTimeFlow <onboarding@resend.dev>",
      to: [email],
      subject: isReinvite ? "You're Reinvited to ZenoTimeFlow!" : "Welcome to ZenoTimeFlow!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #667eea; text-align: center;">
            ${isReinvite ? 'Welcome Back to' : 'Welcome to'} ZenoTimeFlow!
          </h1>
          <p>Hello ${full_name}!</p>
          <p>Your login credentials:</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px;">
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Password:</strong> ${password}</p>
            <p><strong>Role:</strong> ${role.toUpperCase()}</p>
          </div>
          <p>Please change your password after first login.</p>
          <p style="text-align: center;">
            <a href="https://zenotimeflow.com/auth" style="background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Login Now
            </a>
          </p>
        </div>
      `,
    });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});