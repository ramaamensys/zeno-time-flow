-- Update the handle_new_user function to assign super_admin role to both emails
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name')
  );
  
  -- Assign super_admin role to both authorized emails
  IF NEW.email = 'rama.k@amensys.com' OR NEW.email = 'kuladeepparchuri@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
  END IF;
  
  RETURN NEW;
END;
$function$;

-- If kuladeepparchuri@gmail.com already exists, update their role to super_admin
DO $$
BEGIN
  -- Check if user exists and update role
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'kuladeepparchuri@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    SELECT id, 'super_admin'
    FROM auth.users 
    WHERE email = 'kuladeepparchuri@gmail.com'
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Update existing role if user has a different role
    UPDATE public.user_roles 
    SET role = 'super_admin'
    WHERE user_id = (SELECT id FROM auth.users WHERE email = 'kuladeepparchuri@gmail.com')
    AND role != 'super_admin';
  END IF;
END $$;