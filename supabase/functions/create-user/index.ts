import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VALID_ROLES = ['user', 'admin', 'super_admin', 'employee', 'house_keeping', 'maintenance', 'candidate', 'manager', 'operations_manager'];
const VALID_APP_TYPES = ['calendar', 'scheduler'];

const ROLE_HIERARCHY: Record<string, string[]> = {
  'super_admin': ['super_admin', 'operations_manager', 'manager', 'admin', 'user', 'employee', 'house_keeping', 'maintenance', 'candidate'],
  'operations_manager': ['manager', 'admin', 'user', 'employee', 'house_keeping', 'maintenance', 'candidate'],
  'manager': ['user', 'employee', 'house_keeping', 'maintenance', 'candidate']
};

function canCreateRole(callerRoles: string[], targetRole: string): boolean {
  for (const callerRole of callerRoles) {
    const allowedRoles = ROLE_HIERARCHY[callerRole];
    if (allowedRoles && allowedRoles.includes(targetRole)) {
      return true;
    }
  }
  return false;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255;
}

function isValidName(name: string): boolean {
  return name.length >= 1 && name.length <= 100 && /^[a-zA-Z0-9\s\-'\.]+$/.test(name);
}

function isValidPassword(password: string): boolean {
  return password.length >= 8 && password.length <= 72;
}

function isValidUUID(uuid: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'You must be logged in to create users', code: 'UNAUTHORIZED' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = "https://usjvqsqotpedesvldkln.supabase.co";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    if (!serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error', code: 'SERVER_CONFIG_ERROR' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const userSupabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Session expired. Please log in again.', code: 'SESSION_EXPIRED' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: roles } = await userSupabase.from('user_roles').select('role').eq('user_id', user.id);
    const callerRoles = roles?.map(r => r.role) || [];
    const hasPermission = callerRoles.some(r => ['super_admin', 'operations_manager', 'manager'].includes(r));

    if (!hasPermission) {
      return new Response(JSON.stringify({ error: 'You do not have permission to create users.', code: 'INSUFFICIENT_PERMISSIONS' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ error: 'Invalid request format', code: 'INVALID_REQUEST' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : '';
    const full_name = typeof body.full_name === 'string' ? body.full_name.trim() : '';
    const role = typeof body.role === 'string' ? body.role : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const app_type = VALID_APP_TYPES.includes(body.app_type as string) ? body.app_type as string : 'calendar';
    const manager_id = typeof body.manager_id === 'string' && isValidUUID(body.manager_id) ? body.manager_id : null;
    const employee_pin = typeof body.employee_pin === 'string' && /^\d{4}$/.test(body.employee_pin) ? body.employee_pin : null;

    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({ error: 'Please enter a valid email address', code: 'VALIDATION_ERROR' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    if (!isValidName(full_name)) {
      return new Response(JSON.stringify({ error: 'Please enter a valid name', code: 'VALIDATION_ERROR' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    if (!VALID_ROLES.includes(role)) {
      return new Response(JSON.stringify({ error: 'Please select a valid role', code: 'VALIDATION_ERROR' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    if (!isValidPassword(password)) {
      return new Response(JSON.stringify({ error: 'Password must be at least 8 characters', code: 'VALIDATION_ERROR' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    if (!canCreateRole(callerRoles, role)) {
      const displayName = role === 'operations_manager' ? 'Organization Manager' : 
                         role === 'manager' ? 'Company Manager' :
                         role === 'house_keeping' ? 'House Keeping' :
                         role === 'maintenance' ? 'Maintenance' :
                         role.charAt(0).toUpperCase() + role.slice(1);
      return new Response(JSON.stringify({ error: `You don't have permission to create a ${displayName}.`, code: 'ROLE_PERMISSION_DENIED' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Creating user: ${email}, role: ${role}`);
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name }
    });

    let userData = data;
    if (error) {
      if (error.message?.includes('already been registered') || error.code === 'email_exists') {
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === email);
        if (existingUser) {
          userData = { user: existingUser };
        } else {
          throw new Error('User exists but cannot be accessed');
        }
      } else {
        throw error;
      }
    }

    if (userData?.user) {
      let finalManagerId = manager_id;
      if (role === 'admin') {
        const { data: superAdmin } = await supabase.from('user_roles').select('user_id').eq('role', 'super_admin').limit(1).single();
        if (superAdmin) finalManagerId = superAdmin.user_id;
      }

      await supabase.from('profiles').upsert({
        user_id: userData.user.id, full_name, email, status: 'active', manager_id: finalManagerId
      });

      await supabase.from('user_roles').upsert({
        user_id: userData.user.id, role, app_type
      });

      try {
        await supabase.functions.invoke('send-welcome-email', {
          body: { email, full_name, role, password, app_type, employee_pin }
        });
      } catch (e) {
        console.error('Email failed:', e);
      }
    }

    return new Response(JSON.stringify({ success: true, user: userData?.user, message: "User created successfully" }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (error: unknown) {
    console.error("Error:", error);
    const msg = error instanceof Error ? error.message.toLowerCase() : '';
    let userMsg = "Something went wrong. Please try again.";
    if (msg.includes('already') || msg.includes('exists')) userMsg = "User with this email already exists.";
    else if (msg.includes('password')) userMsg = "Password must be at least 8 characters.";
    else if (msg.includes('email')) userMsg = "Please enter a valid email.";
    
    return new Response(JSON.stringify({ error: userMsg, code: 'CREATE_USER_ERROR' }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
});
