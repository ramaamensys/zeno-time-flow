-- Tighten organizations visibility: organization managers (operations_manager) must only see their assigned org
-- Remove overly-broad / duplicate policies first
DROP POLICY IF EXISTS "organizations_select" ON public.organizations;
DROP POLICY IF EXISTS "Operations managers can view organizations they manage" ON public.organizations;
DROP POLICY IF EXISTS "Operations managers can manage assigned organizations" ON public.organizations;
DROP POLICY IF EXISTS "Operations managers can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Operations managers can delete organizations they manage" ON public.organizations;
DROP POLICY IF EXISTS "Organization managers can view their assigned organization" ON public.organizations;
DROP POLICY IF EXISTS "Organization managers can update limited organization fields" ON public.organizations;
DROP POLICY IF EXISTS "Organization managers can delete their assigned organization" ON public.organizations;
DROP POLICY IF EXISTS "organizations_insert" ON public.organizations;
DROP POLICY IF EXISTS "organizations_update" ON public.organizations;
DROP POLICY IF EXISTS "organizations_delete" ON public.organizations;
DROP POLICY IF EXISTS "Super admins can manage all organizations" ON public.organizations;

-- Recreate minimal, correct policies
CREATE POLICY "Super admins manage organizations"
ON public.organizations
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Organization Manager (operations_manager) can only view/update the org where they are assigned
CREATE POLICY "Org managers can view their organization"
ON public.organizations
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'operations_manager'::app_role)
  AND organization_manager_id = auth.uid()
);

CREATE POLICY "Org managers can update their organization"
ON public.organizations
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'operations_manager'::app_role)
  AND organization_manager_id = auth.uid()
)
WITH CHECK (
  has_role(auth.uid(), 'operations_manager'::app_role)
  AND organization_manager_id = auth.uid()
);

-- Super admins (and only super admins) can create organizations
CREATE POLICY "Super admins can create organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));