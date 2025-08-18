-- Ensure rama.k@amensys.com has both calendar and scheduler access
INSERT INTO public.user_roles (user_id, role, app_type) 
VALUES ('bc6bfc62-1a74-4cbd-9a2f-06d9e91a158a', 'super_admin', 'calendar')
ON CONFLICT DO NOTHING;