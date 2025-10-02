
-- Create profiles for auth users that don't have profiles
INSERT INTO public.profiles (user_id, full_name, email, status)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', SPLIT_PART(au.email, '@', 1)),
  au.email,
  'active'
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.user_id = au.id
);

-- Ensure all profiles have corresponding user_roles (default to 'user')
INSERT INTO public.user_roles (user_id, role, app_type)
SELECT 
  p.user_id,
  'user'::public.app_role,
  'calendar'::public.app_type
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id
)
AND p.status = 'active';
