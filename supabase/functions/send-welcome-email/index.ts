import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  full_name: string;
  role: string;
  password: string;
  isReinvite?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests first
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting send-welcome-email function');
    
    // Parse request body
    const body = await req.json();
    const { email, full_name, role, password, isReinvite } = body as WelcomeEmailRequest;
    
    console.log(`Processing ${isReinvite ? 'reinvite' : 'welcome'} for: ${email}`);

    // Check if API key exists
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      console.error("RESEND_API_KEY not found in environment");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log('API key found, creating Resend client');

    // Create a simple test first
    try {
      const resend = new Resend(apiKey);
      
      const result = await resend.emails.send({
        from: "ZenoTimeFlow <onboarding@resend.dev>",
        to: [email],
        subject: isReinvite ? "You're Reinvited to ZenoTimeFlow!" : "Welcome to ZenoTimeFlow!",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h1>${isReinvite ? 'Welcome Back!' : 'Welcome!'}</h1>
            <p>Hello ${full_name},</p>
            <p>Your login details:</p>
            <ul>
              <li>Email: ${email}</li>
              <li>Password: ${password}</li>
              <li>Role: ${role}</li>
            </ul>
            <p>Please login at: <a href="https://zenotimeflow.com/auth">ZenoTimeFlow</a></p>
          </div>
        `,
      });

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

      console.log("Email sent successfully:", result.data?.id);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Email sent successfully",
          emailId: result.data?.id 
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );

    } catch (emailError: any) {
      console.error("Email sending error:", emailError);
      return new Response(
        JSON.stringify({ error: `Email error: ${emailError.message}` }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

  } catch (error: any) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: `Function error: ${error.message}` }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);