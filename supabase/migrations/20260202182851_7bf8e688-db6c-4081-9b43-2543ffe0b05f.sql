-- Fix the organization manager policy for companies to check through the organization table
-- Drop the incorrect policy first
DROP POLICY IF EXISTS "Operations managers can manage assigned companies" ON public.companies;

-- Create a correct policy that checks via the organization table
CREATE POLICY "Org managers can manage companies in their org"
ON public.companies
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'operations_manager'::app_role) 
  AND is_organization_manager(auth.uid(), organization_id)
)
WITH CHECK (
  has_role(auth.uid(), 'operations_manager'::app_role) 
  AND is_organization_manager(auth.uid(), organization_id)
);

-- Similarly for employees - ensure org managers can manage via organization link
DROP POLICY IF EXISTS "Operations managers can manage employees in their companies" ON public.employees;

CREATE POLICY "Org managers can manage employees in their organization"
ON public.employees
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'operations_manager'::app_role) 
  AND is_organization_manager_for_employee(auth.uid(), id)
)
WITH CHECK (
  has_role(auth.uid(), 'operations_manager'::app_role) 
  AND is_organization_manager_for_company(auth.uid(), company_id)
);

-- Fix shifts policy for org managers
DROP POLICY IF EXISTS "Operations managers can manage shifts in their companies" ON public.shifts;

CREATE POLICY "Org managers can manage shifts in their organization"
ON public.shifts
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'operations_manager'::app_role) 
  AND is_organization_manager_for_company(auth.uid(), company_id)
)
WITH CHECK (
  has_role(auth.uid(), 'operations_manager'::app_role) 
  AND is_organization_manager_for_company(auth.uid(), company_id)
);