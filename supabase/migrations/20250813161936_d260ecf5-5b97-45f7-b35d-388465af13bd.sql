-- Insert the profile and user role for rama.k@amensys.com
INSERT INTO public.profiles (user_id, email, full_name)
VALUES ('23018c62-b81e-4551-8365-5413efdd4f2b', 'rama.k@amensys.com', 'Rama K')
ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name;

INSERT INTO public.user_roles (user_id, role)
VALUES ('23018c62-b81e-4551-8365-5413efdd4f2b', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;