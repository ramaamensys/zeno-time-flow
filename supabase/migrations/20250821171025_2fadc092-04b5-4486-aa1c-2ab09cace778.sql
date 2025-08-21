-- Add manager_id to profiles table to track user assignments
ALTER TABLE public.profiles 
ADD COLUMN manager_id uuid REFERENCES public.profiles(user_id);

-- Create index for better performance
CREATE INDEX idx_profiles_manager_id ON public.profiles(manager_id);

-- Update RLS policies for profiles table to implement hierarchical access

-- Drop existing policies that conflict
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create new hierarchical RLS policies
CREATE POLICY "Super admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can view assigned users and own profile" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  (has_role(auth.uid(), 'admin'::app_role) AND manager_id = auth.uid())
);

CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Update policies for user roles table  
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

CREATE POLICY "Super admins can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can view roles for assigned users" 
ON public.user_roles 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  (has_role(auth.uid(), 'admin'::app_role) AND 
   EXISTS (
     SELECT 1 FROM public.profiles 
     WHERE profiles.user_id = user_roles.user_id 
     AND profiles.manager_id = auth.uid()
   ))
);

-- Set rama.k@amensys.com as the only super admin
UPDATE public.user_roles 
SET role = 'admin'::app_role 
WHERE role = 'super_admin'::app_role 
AND user_id != (
  SELECT user_id FROM public.profiles 
  WHERE email = 'rama.k@amensys.com' 
  LIMIT 1
);

-- Ensure rama.k@amensys.com has super_admin role
DO $$
DECLARE
    rama_user_id uuid;
BEGIN
    SELECT user_id INTO rama_user_id 
    FROM public.profiles 
    WHERE email = 'rama.k@amensys.com' 
    LIMIT 1;
    
    IF rama_user_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role, app_type) 
        VALUES (rama_user_id, 'super_admin'::app_role, 'calendar'::app_type)
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
END $$;