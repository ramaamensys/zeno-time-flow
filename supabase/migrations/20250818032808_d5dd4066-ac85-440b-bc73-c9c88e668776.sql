-- Delete all user_roles except for rama.k@amensys.com
DELETE FROM public.user_roles 
WHERE user_id != 'bc6bfc62-1a74-4cbd-9a2f-06d9e91a158a';

-- Delete all profiles except for rama.k@amensys.com  
DELETE FROM public.profiles 
WHERE user_id != 'bc6bfc62-1a74-4cbd-9a2f-06d9e91a158a';

-- Mark other users as deleted in case we need to clean up auth.users manually
-- (Note: auth.users table requires admin API to delete, cannot be done via SQL)