import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
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
    const { email, full_name, role, password }: CreateUserRequest = await req.json();

    console.log(`Creating user with email: ${email}, role: ${role}`);

    // Create Supabase admin client
    const supabaseUrl = "https://usjvqsqotpedesvldkln.supabase.co";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!serviceRoleKey) {
      throw new Error("Missing Supabase service role key");
    }
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Create user with admin API
    const { data, error } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // This confirms the email immediately
      user_metadata: {
        full_name: full_name,
      }
    });

    if (error) {
      console.error('Error creating user:', error);
      throw error;
    }

    console.log('User created successfully:', data.user?.id);

    // Update user role if not default
    if (data.user && role !== 'user') {
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: role })
        .eq('user_id', data.user.id);

      if (roleError) {
        console.error('Error updating role:', roleError);
        // Don't throw here, user is already created
      } else {
        console.log('User role updated successfully');
      }
    }

    // Send welcome email
    try {
      console.log('Attempting to send welcome email...');
      console.log('Email details:', { email, full_name, role, password: '***' });
      
      const emailResponse = await supabase.functions.invoke('send-welcome-email', {
        body: {
          email: email,
          full_name: full_name,
          role: role,
          password: password
        }
      });

      console.log('Email response:', emailResponse);

      if (emailResponse.error) {
        console.error('Email function error:', emailResponse.error);
        // Don't throw, just log the error
      } else {
        console.log('Welcome email sent successfully');
      }
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      console.error('Email error details:', JSON.stringify(emailError));
      // Don't fail user creation if email fails
    }

    return new Response(JSON.stringify({ 
      success: true, 
      user: data.user,
      message: "User created successfully" 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in create-user function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to create user",
        details: error 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);