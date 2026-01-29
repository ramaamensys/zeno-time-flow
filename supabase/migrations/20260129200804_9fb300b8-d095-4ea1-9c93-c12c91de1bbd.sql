-- Fix RLS for profiles table to allow organization managers to view profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

-- Allow authenticated users to view profiles (needed for manager assignment dropdowns)
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Fix RLS for user_roles table to allow organization managers to view roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete" ON public.user_roles;

-- Select policy for user_roles - allow authenticated users to read roles (for dropdown population)
CREATE POLICY "Authenticated can view user_roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);

-- Insert policy for user_roles - super_admin and operations_manager can insert
CREATE POLICY "Admins can insert user_roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'operations_manager'::app_role)
);

-- Update policy for user_roles - super_admin and operations_manager can update
CREATE POLICY "Admins can update user_roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'operations_manager'::app_role)
);

-- Delete policy for user_roles - super_admin only
CREATE POLICY "Super admins can delete user_roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Fix companies UPDATE policy for organization managers to assign company managers
DROP POLICY IF EXISTS "companies_update_policy" ON public.companies;
DROP POLICY IF EXISTS "Update companies" ON public.companies;

CREATE POLICY "Update companies"
ON public.companies
FOR UPDATE
TO authenticated
USING (can_access_company(auth.uid(), id))
WITH CHECK (can_access_company(auth.uid(), id));