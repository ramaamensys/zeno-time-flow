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
  console.log('=== SEND WELCOME EMAIL FUNCTION START ===');
  console.log('Request URL:', req.url);
  console.log('Request method:', req.method);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Reading request body...');
    const requestBody = await req.json();
    console.log('Request body received:', Object.keys(requestBody));
    
    const { email, full_name, role, password, isReinvite }: WelcomeEmailRequest = requestBody;

    console.log(`Processing ${isReinvite ? 'reinvite' : 'welcome'} email for: ${email}`);
    
    // Check API key first
    const apiKey = Deno.env.get("RESEND_API_KEY");
    console.log('API Key status:', apiKey ? 'Present' : 'Missing');
    console.log('API Key length:', apiKey ? apiKey.length : 0);
    console.log('API Key starts with:', apiKey ? apiKey.substring(0, 7) + '...' : 'N/A');

    if (!apiKey) {
      console.error("CRITICAL: RESEND_API_KEY environment variable is missing");
      throw new Error("RESEND_API_KEY is not configured");
    }

    console.log('Initializing Resend client...');
    const resend = new Resend(apiKey);
    console.log('Resend client initialized successfully');

    // Prepare email content
    const loginLink = 'https://zenotimeflow.com/auth';
    const emailSubject = isReinvite ? "You're Reinvited to ZenoTimeFlow!" : "Welcome to ZenoTimeFlow - Your Account Details!";
    
    console.log('Email subject:', emailSubject);
    console.log('Login link:', loginLink);

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🎉 ${isReinvite ? 'Welcome Back to' : 'Welcome to'} ZenoTimeFlow!</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Hello ${full_name || 'there'}!</h2>
          
          <p style="color: #555; line-height: 1.6; font-size: 16px;">
            ${isReinvite ? 'You have been reinvited to' : 'Your account has been created for'} ZenoTimeFlow! 🌟 Below are your login credentials to get started immediately.
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

    console.log('Sending email via Resend API...');
    const emailResponse = await resend.emails.send({
      from: "ZenoTimeFlow <onboarding@resend.dev>",
      to: [email],
      subject: emailSubject,
      html: htmlContent,
    });

    console.log('Resend API response status:', emailResponse.error ? 'ERROR' : 'SUCCESS');
    
    if (emailResponse.error) {
      console.error("Resend API Error Details:", {
        name: emailResponse.error.name,
        message: emailResponse.error.message,
        full_error: JSON.stringify(emailResponse.error, null, 2)
      });
      throw new Error(`Email sending failed: ${emailResponse.error.message || 'Unknown Resend error'}`);
    }

    console.log("Email sent successfully:", {
      id: emailResponse.data?.id,
      from: emailResponse.data?.from,
      to: emailResponse.data?.to
    });

    console.log('=== FUNCTION SUCCESS ===');
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: `${isReinvite ? 'Reinvite' : 'Welcome'} email sent successfully`,
      emailId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
    
  } catch (error: any) {
    console.error("=== FUNCTION ERROR ===");
    console.error("Error type:", error.constructor.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred',
        details: error.name || 'UnknownError'
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);