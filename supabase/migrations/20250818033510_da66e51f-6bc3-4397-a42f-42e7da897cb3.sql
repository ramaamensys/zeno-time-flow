-- Update rama.k@amensys.com to have access to both apps
-- First, insert scheduler app access for the existing user
INSERT INTO public.user_roles (user_id, role, app_type) 
VALUES ('bc6bfc62-1a74-4cbd-9a2f-06d9e91a158a', 'super_admin', 'scheduler')
ON CONFLICT (user_id, role) DO UPDATE SET app_type = 'scheduler';