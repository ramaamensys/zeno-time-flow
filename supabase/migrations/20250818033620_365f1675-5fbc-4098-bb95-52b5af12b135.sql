-- First, drop the existing unique constraint on (user_id, role) 
-- and create a new one that includes app_type
ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;

-- Create a new unique constraint on (user_id, role, app_type) 
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_user_id_role_app_type_key 
UNIQUE (user_id, role, app_type);

-- Now add the calendar access for rama.k@amensys.com
INSERT INTO public.user_roles (user_id, role, app_type) 
VALUES ('bc6bfc62-1a74-4cbd-9a2f-06d9e91a158a', 'super_admin', 'calendar')
ON CONFLICT (user_id, role, app_type) DO NOTHING;