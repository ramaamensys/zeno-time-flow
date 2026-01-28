-- Add super_admin role for rama.k@amensys.com
INSERT INTO public.user_roles (user_id, role, app_type)
SELECT 'bc6bfc62-1a74-4cbd-9a2f-06d9e91a158a', 'super_admin', 'scheduler'
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = 'bc6bfc62-1a74-4cbd-9a2f-06d9e91a158a' 
  AND role = 'super_admin'
);