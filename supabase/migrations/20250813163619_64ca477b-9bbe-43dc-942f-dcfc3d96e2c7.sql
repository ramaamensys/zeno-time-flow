-- Give super_admin role to rama.k@amensys.com
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::app_role 
FROM auth.users 
WHERE email = 'rama.k@amensys.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Also give admin role just in case
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role 
FROM auth.users 
WHERE email = 'rama.k@amensys.com'
ON CONFLICT (user_id, role) DO NOTHING;