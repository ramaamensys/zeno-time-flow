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
  app_type?: 'calendar' | 'scheduler';
  manager_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Request URL:', req.url);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, full_name, role, password, app_type = 'calendar', manager_id }: CreateUserRequest = await req.json();

    console.log(`Creating user with email: ${email}, role: ${role}, app_type: ${app_type}`);

    // Create Supabase admin client
    const supabaseUrl = "https://usjvqsqotpedesvldkln.supabase.co";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!serviceRoleKey) {
      throw new Error("Missing Supabase service role key");
    }
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Create user with admin API
    let data;
    let error;
    
    const createResult = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // This confirms the email immediately
      user_metadata: {
        full_name: full_name,
      }
    });

    data = createResult.data;
    error = createResult.error;

    if (error) {
      console.error('Error creating user:', error);
      
      // Check if user already exists
      if (error.message?.includes('already been registered') || error.code === 'email_exists') {
        // Try to get existing user and update their profile/role instead
        console.log('User already exists, attempting to update profile and role...');
        
        const { data: existingUser, error: getUserError } = await supabase.auth.admin.getUserByEmail(email);
        
        if (existingUser?.user && !getUserError) {
          console.log('Successfully found existing user, will update profile and role');
          
          // Use existing user data for response
          data = { user: existingUser.user };
          error = null; // Clear the error since we handled it
        } else {
          throw new Error(`User with email ${email} already exists but cannot be accessed. Please use a different email or contact admin.`);
        }
      } else {
        throw error;
      }
    }

    console.log('User processed successfully:', data.user?.id);

    // Ensure user has proper profile and role (for both new and existing users)
    if (data.user) {
      // Create/update profile
      await supabase
        .from('profiles')
        .upsert({
          user_id: data.user.id,
          full_name: full_name,
          email: email,
          status: 'active',
          manager_id: manager_id || null
        });
        
      // Create/update user role and app_type
      await supabase
        .from('user_roles')
        .upsert({
          user_id: data.user.id,
          role: role,
          app_type: app_type
        });
        
      console.log('User profile and role set successfully');
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
          password: password,
          app_type: app_type
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