-- Drop the problematic policies first
DROP POLICY IF EXISTS "View organizations" ON public.organizations;
DROP POLICY IF EXISTS "Insert organizations" ON public.organizations;
DROP POLICY IF EXISTS "Update organizations" ON public.organizations;
DROP POLICY IF EXISTS "Delete organizations" ON public.organizations;

DROP POLICY IF EXISTS "View companies" ON public.companies;
DROP POLICY IF EXISTS "Insert companies" ON public.companies;
DROP POLICY IF EXISTS "Update companies" ON public.companies;
DROP POLICY IF EXISTS "Delete companies" ON public.companies;

DROP POLICY IF EXISTS "View employees" ON public.employees;
DROP POLICY IF EXISTS "Insert employees" ON public.employees;
DROP POLICY IF EXISTS "Update employees" ON public.employees;
DROP POLICY IF EXISTS "Delete employees" ON public.employees;

DROP POLICY IF EXISTS "View shifts" ON public.shifts;
DROP POLICY IF EXISTS "Insert shifts" ON public.shifts;
DROP POLICY IF EXISTS "Update shifts" ON public.shifts;
DROP POLICY IF EXISTS "Delete shifts" ON public.shifts;

DROP POLICY IF EXISTS "View calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Insert calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Update calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Delete calendar events" ON public.calendar_events;

-- Create simple, non-recursive helper functions that use direct table access

-- Check if user can access an organization (is super_admin, or is the org manager)
CREATE OR REPLACE FUNCTION public.can_access_organization(_user_id uuid, _organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    has_role(_user_id, 'super_admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM organizations 
      WHERE id = _organization_id AND organization_manager_id = _user_id
    )
$$;

-- Check if user can access a company (super_admin, org manager for org, or company manager)
CREATE OR REPLACE FUNCTION public.can_access_company(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    has_role(_user_id, 'super_admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM companies c
      JOIN organizations o ON o.id = c.organization_id
      WHERE c.id = _company_id AND o.organization_manager_id = _user_id
    )
    OR EXISTS (
      SELECT 1 FROM companies 
      WHERE id = _company_id AND company_manager_id = _user_id
    )
$$;

-- Check if user is employee at company
CREATE OR REPLACE FUNCTION public.is_employee_at_company(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM employees 
    WHERE company_id = _company_id AND user_id = _user_id
  )
$$;

-- Get organization ID for a company
CREATE OR REPLACE FUNCTION public.get_company_organization_id(_company_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM companies WHERE id = _company_id LIMIT 1
$$;

-- Check if user is org manager who created the org
CREATE OR REPLACE FUNCTION public.is_org_creator(_user_id uuid, _organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organizations 
    WHERE id = _organization_id 
    AND (created_by = _user_id OR organization_manager_id = _user_id)
  )
$$;

-- ORGANIZATIONS: Simple non-recursive policies
CREATE POLICY "organizations_select"
ON public.organizations FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR organization_manager_id = auth.uid()
  OR has_role(auth.uid(), 'operations_manager'::app_role)
);

CREATE POLICY "organizations_insert"
ON public.organizations FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'operations_manager'::app_role)
);

CREATE POLICY "organizations_update"
ON public.organizations FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR organization_manager_id = auth.uid()
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR organization_manager_id = auth.uid()
);

CREATE POLICY "organizations_delete"
ON public.organizations FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- COMPANIES: Use security definer functions
CREATE POLICY "companies_select"
ON public.companies FOR SELECT
TO authenticated
USING (
  can_access_company(auth.uid(), id)
  OR is_employee_at_company(auth.uid(), id)
);

CREATE POLICY "companies_insert"
ON public.companies FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'operations_manager'::app_role) AND is_organization_manager(auth.uid(), organization_id))
);

CREATE POLICY "companies_update"
ON public.companies FOR UPDATE
TO authenticated
USING (can_access_company(auth.uid(), id))
WITH CHECK (can_access_company(auth.uid(), id));

CREATE POLICY "companies_delete"
ON public.companies FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR is_organization_manager(auth.uid(), organization_id)
);

-- EMPLOYEES: Use security definer functions
CREATE POLICY "employees_select"
ON public.employees FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR can_access_company(auth.uid(), company_id)
  OR user_id = auth.uid()
);

CREATE POLICY "employees_insert"
ON public.employees FOR INSERT
TO authenticated
WITH CHECK (
  can_access_company(auth.uid(), company_id)
);

CREATE POLICY "employees_update"
ON public.employees FOR UPDATE
TO authenticated
USING (can_access_company(auth.uid(), company_id));

CREATE POLICY "employees_delete"
ON public.employees FOR DELETE
TO authenticated
USING (can_access_company(auth.uid(), company_id));

-- SHIFTS: Use security definer functions
CREATE POLICY "shifts_select"
ON public.shifts FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR can_access_company(auth.uid(), company_id)
  OR is_employee_at_company(auth.uid(), company_id)
);

CREATE POLICY "shifts_insert"
ON public.shifts FOR INSERT
TO authenticated
WITH CHECK (can_access_company(auth.uid(), company_id));

CREATE POLICY "shifts_update"
ON public.shifts FOR UPDATE
TO authenticated
USING (can_access_company(auth.uid(), company_id));

CREATE POLICY "shifts_delete"
ON public.shifts FOR DELETE
TO authenticated
USING (can_access_company(auth.uid(), company_id));

-- CALENDAR EVENTS: Include all manager levels
CREATE POLICY "calendar_events_select"
ON public.calendar_events FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR is_organization_manager_for_user(auth.uid(), user_id)
  OR is_company_manager_for_employee(auth.uid(), user_id)
  OR (has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM profiles WHERE profiles.user_id = calendar_events.user_id AND profiles.manager_id = auth.uid()
  ))
);

CREATE POLICY "calendar_events_insert"
ON public.calendar_events FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR is_organization_manager_for_user(auth.uid(), user_id)
  OR is_company_manager_for_employee(auth.uid(), user_id)
  OR (has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM profiles WHERE profiles.user_id = user_id AND profiles.manager_id = auth.uid()
  ))
);

CREATE POLICY "calendar_events_update"
ON public.calendar_events FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR is_organization_manager_for_user(auth.uid(), user_id)
  OR is_company_manager_for_employee(auth.uid(), user_id)
);

CREATE POLICY "calendar_events_delete"
ON public.calendar_events FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR is_organization_manager_for_user(auth.uid(), user_id)
  OR is_company_manager_for_employee(auth.uid(), user_id)
);