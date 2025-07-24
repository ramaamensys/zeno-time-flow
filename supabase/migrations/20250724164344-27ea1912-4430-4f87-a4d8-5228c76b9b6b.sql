-- Update kuladeepparchuri@gmail.com to super_admin role
UPDATE public.user_roles 
SET role = 'super_admin'
WHERE user_id = 'c727705c-e9da-45e4-9196-13b24a638c84';