-- Allow admins and super_admins to update any profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Allow admins and super_admins to delete profiles
CREATE POLICY "Admins can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'super_admin'::app_role)
);