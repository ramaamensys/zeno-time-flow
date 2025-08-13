-- Delete all data from user_roles table
DELETE FROM public.user_roles;

-- Delete all data from profiles table  
DELETE FROM public.profiles;

-- Delete all users from auth.users table (this will cascade to other tables)
DELETE FROM auth.users;