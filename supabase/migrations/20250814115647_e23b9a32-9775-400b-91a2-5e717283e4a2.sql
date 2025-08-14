-- Grant admin role to kuladeepparchuri@gmail.com when they sign up
CREATE OR REPLACE FUNCTION public.handle_admin_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the new user has the admin email
  IF NEW.email = 'kuladeepparchuri@gmail.com' THEN
    -- Insert admin role for this user
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Create trigger to automatically assign admin role
CREATE OR REPLACE TRIGGER on_admin_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  WHEN (NEW.email = 'kuladeepparchuri@gmail.com')
  EXECUTE FUNCTION public.handle_admin_user();