import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function sendSMTPEmail(to: string, subject: string, htmlContent: string) {
  const smtpHost = Deno.env.get("SMTP_HOST") || "smtp.hostinger.com";
  const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "465");
  const smtpUser = Deno.env.get("SMTP_USER") || "";
  const smtpPassword = Deno.env.get("SMTP_PASSWORD") || "";
  
  // Create the email content
  const boundary = "boundary_" + Math.random().toString(36).substring(2);
  const emailContent = [
    `From: ZenoTimeFlow <${smtpUser}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    htmlContent,
    ``,
    `--${boundary}--`
  ].join('\r\n');

  try {
    // Use Deno's built-in TCP connection for SMTP
    const conn = await Deno.connectTls({
      hostname: smtpHost,
      port: smtpPort,
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Helper function to send command and read response
    async function sendCommand(command: string): Promise<string> {
      await conn.write(encoder.encode(command + '\r\n'));
      const buffer = new Uint8Array(1024);
      const n = await conn.read(buffer);
      return decoder.decode(buffer.subarray(0, n || 0));
    }

    // SMTP conversation
    const greeting = await sendCommand('');
    console.log('SMTP Greeting:', greeting);
    
    await sendCommand('EHLO zenotimeflow.com');
    await sendCommand(`AUTH LOGIN`);
    await sendCommand(btoa(smtpUser));
    await sendCommand(btoa(smtpPassword));
    await sendCommand(`MAIL FROM:<${smtpUser}>`);
    await sendCommand(`RCPT TO:<${to}>`);
    await sendCommand('DATA');
    await sendCommand(emailContent + '\r\n.');
    await sendCommand('QUIT');

    conn.close();
    return { success: true };
  } catch (error) {
    console.error('SMTP Error:', error);
    return { success: false, error: error.message };
  }
}

interface WelcomeEmailRequest {
  email: string;
  full_name: string;
  role: string;
  password: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, full_name, role, password }: WelcomeEmailRequest = await req.json();

    console.log(`Sending welcome email to: ${email}`);

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Welcome to ZenoTimeFlow!</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Hello ${full_name || 'there'}!</h2>
          
          <p style="color: #555; line-height: 1.6; font-size: 16px;">
            We're thrilled to welcome you to ZenoTimeFlow! 🌟 Your account has been set up and you're all ready to get started. 
            Below are your login credentials to access the platform:
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <p style="margin: 0; color: #333;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 10px 0 0 0; color: #333;"><strong>Temporary Password:</strong> ${password}</p>
            <p style="margin: 10px 0 0 0; color: #333;"><strong>Role:</strong> ${role.replace('_', ' ').toUpperCase()}</p>
          </div>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              <strong>Important:</strong> Please change your password after your first login for security purposes.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || 'https://your-app.lovable.app'}/auth" 
               style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Login to ZenoTimeFlow
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
            If you have any questions, please don't hesitate to contact our support team.
          </p>
          
          <hr style="border: none; height: 1px; background: #ddd; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
            This email was sent automatically from ZenoTimeFlow. Please do not reply to this email.
          </p>
        </div>
      </div>
    `;

    const emailResponse = await sendSMTPEmail(email, "Welcome to ZenoTimeFlow - Your Account is Ready!", htmlContent);

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