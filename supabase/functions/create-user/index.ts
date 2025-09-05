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
    // Verify authorization - only super_admin can create users
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(JSON.stringify({ error: 'Unauthorized - missing authorization header' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = "https://usjvqsqotpedesvldkln.supabase.co";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!serviceRoleKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not configured');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create client with user JWT for authorization check
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userSupabase = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    // Verify the caller has super_admin role
    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    if (userError || !user) {
      console.error('Failed to get user:', userError);
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if user has super_admin role
    const { data: roles, error: roleError } = await userSupabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (roleError || !roles?.some(r => r.role === 'super_admin')) {
      console.error('User is not authorized:', { userId: user.id, roles });
      return new Response(JSON.stringify({ error: 'Insufficient permissions - super admin required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { email, full_name, role, password, app_type = 'calendar', manager_id }: CreateUserRequest = await req.json();

    console.log(`Creating user with email: ${email}, role: ${role}, app_type: ${app_type}`);

    // Create Supabase admin client with service role key
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
        
        const { data: existingUsers, error: getUserError } = await supabase.auth.admin.listUsers();
        
        if (existingUsers?.users && !getUserError) {
          const existingUser = existingUsers.users.find(u => u.email === email);
          
          if (existingUser) {
            console.log('Successfully found existing user, will update profile and role');
            
            // Use existing user data for response
            data = { user: existingUser };
            error = null; // Clear the error since we handled it
          } else {
            throw new Error(`User with email ${email} already exists but cannot be accessed. Please use a different email or contact admin.`);
          }
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
      let finalManagerId = manager_id || null;
      
      // If creating an admin, set super admin as their manager
      if (role === 'admin') {
        const { data: superAdminData, error: superAdminError } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'super_admin')
          .limit(1)
          .single();
          
        if (superAdminData && !superAdminError) {
          finalManagerId = superAdminData.user_id;
          console.log('Setting super admin as manager for admin user');
        }
      }
      
      // Create/update profile
      await supabase
        .from('profiles')
        .upsert({
          user_id: data.user.id,
          full_name: full_name,
          email: email,
          status: 'active',
          manager_id: finalManagerId
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