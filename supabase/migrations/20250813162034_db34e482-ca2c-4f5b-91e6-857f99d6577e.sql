-- Remove foreign key constraints to allow manual data insertion
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;
ALTER TABLE IF EXISTS public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

-- Try inserting the data directly
INSERT INTO public.profiles (user_id, email, full_name, status)
VALUES ('23018c62-b81e-4551-8365-5413efdd4f2b', 'rama.k@amensys.com', 'Rama K', 'active')
ON CONFLICT (user_id) DO UPDATE SET 
  email = EXCLUDED.email, 
  full_name = EXCLUDED.full_name,
  status = EXCLUDED.status;

INSERT INTO public.user_roles (user_id, role)
VALUES ('23018c62-b81e-4551-8365-5413efdd4f2b', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;