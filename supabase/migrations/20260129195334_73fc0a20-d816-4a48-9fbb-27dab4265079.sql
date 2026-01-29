-- First, create helper functions for organization manager access checks

-- Function to check if user is an organization manager for a given organization
CREATE OR REPLACE FUNCTION public.is_organization_manager(_user_id uuid, _organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organizations
    WHERE id = _organization_id
      AND organization_manager_id = _user_id
  )
$$;

-- Function to check if user is an organization manager for a company's organization
CREATE OR REPLACE FUNCTION public.is_organization_manager_for_company(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.companies c
    JOIN public.organizations o ON o.id = c.organization_id
    WHERE c.id = _company_id
      AND o.organization_manager_id = _user_id
  )
$$;

-- Function to check if user is org manager for an employee's company's organization
CREATE OR REPLACE FUNCTION public.is_organization_manager_for_employee(_user_id uuid, _employee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees e
    JOIN public.companies c ON c.id = e.company_id
    JOIN public.organizations o ON o.id = c.organization_id
    WHERE e.id = _employee_id
      AND o.organization_manager_id = _user_id
  )
$$;

-- Function to check if user is org manager for a shift's company's organization
CREATE OR REPLACE FUNCTION public.is_organization_manager_for_shift(_user_id uuid, _shift_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.shifts s
    JOIN public.companies c ON c.id = s.company_id
    JOIN public.organizations o ON o.id = c.organization_id
    WHERE s.id = _shift_id
      AND o.organization_manager_id = _user_id
  )
$$;

-- Drop existing restrictive policies on companies table
DROP POLICY IF EXISTS "Companies can be created by super admins" ON public.companies;
DROP POLICY IF EXISTS "Companies can be deleted by super admins" ON public.companies;
DROP POLICY IF EXISTS "Companies can be updated by super admins" ON public.companies;
DROP POLICY IF EXISTS "Companies are viewable by authenticated users" ON public.companies;
DROP POLICY IF EXISTS "Super admins can create companies" ON public.companies;
DROP POLICY IF EXISTS "Super admins can update companies" ON public.companies;
DROP POLICY IF EXISTS "Super admins can delete companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can view companies" ON public.companies;

-- Create new comprehensive policies for companies
CREATE POLICY "View companies"
ON public.companies FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR is_organization_manager(auth.uid(), organization_id)
  OR (has_role(auth.uid(), 'manager'::app_role) AND company_manager_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM employees 
    WHERE employees.company_id = companies.id 
    AND employees.user_id = auth.uid()
  )
);

CREATE POLICY "Insert companies"
ON public.companies FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'operations_manager'::app_role) AND is_organization_manager(auth.uid(), organization_id))
);

CREATE POLICY "Update companies"
ON public.companies FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR is_organization_manager(auth.uid(), organization_id)
  OR (has_role(auth.uid(), 'manager'::app_role) AND company_manager_id = auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR is_organization_manager(auth.uid(), organization_id)
  OR (has_role(auth.uid(), 'manager'::app_role) AND company_manager_id = auth.uid())
);

CREATE POLICY "Delete companies"
ON public.companies FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR is_organization_manager(auth.uid(), organization_id)
);

-- Drop existing policies on organizations table
DROP POLICY IF EXISTS "Organizations are viewable by authenticated users" ON public.organizations;
DROP POLICY IF EXISTS "Super admins can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Super admins can update organizations" ON public.organizations;
DROP POLICY IF EXISTS "Super admins can delete organizations" ON public.organizations;

-- Create new comprehensive policies for organizations
CREATE POLICY "View organizations"
ON public.organizations FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR organization_manager_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM companies c
    WHERE c.organization_id = organizations.id
    AND (
      c.company_manager_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM employees e
        WHERE e.company_id = c.id AND e.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Insert organizations"
ON public.organizations FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Update organizations"
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

CREATE POLICY "Delete organizations"
ON public.organizations FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Drop existing employee policies
DROP POLICY IF EXISTS "Employees are viewable by authenticated users" ON public.employees;
DROP POLICY IF EXISTS "Super admins can create employees" ON public.employees;
DROP POLICY IF EXISTS "Super admins can update employees" ON public.employees;
DROP POLICY IF EXISTS "Super admins can delete employees" ON public.employees;
DROP POLICY IF EXISTS "Company managers can create employees" ON public.employees;
DROP POLICY IF EXISTS "Company managers can update employees" ON public.employees;
DROP POLICY IF EXISTS "Company managers can delete employees" ON public.employees;

-- Create new comprehensive policies for employees
CREATE POLICY "View employees"
ON public.employees FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR is_organization_manager_for_company(auth.uid(), company_id)
  OR EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = employees.company_id AND c.company_manager_id = auth.uid()
  )
  OR user_id = auth.uid()
);

CREATE POLICY "Insert employees"
ON public.employees FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR is_organization_manager_for_company(auth.uid(), company_id)
  OR EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = company_id AND c.company_manager_id = auth.uid()
  )
);

CREATE POLICY "Update employees"
ON public.employees FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR is_organization_manager_for_company(auth.uid(), company_id)
  OR EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = employees.company_id AND c.company_manager_id = auth.uid()
  )
);

CREATE POLICY "Delete employees"
ON public.employees FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR is_organization_manager_for_company(auth.uid(), company_id)
  OR EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = employees.company_id AND c.company_manager_id = auth.uid()
  )
);

-- Drop existing shift policies
DROP POLICY IF EXISTS "Shifts are viewable by authenticated users" ON public.shifts;
DROP POLICY IF EXISTS "Super admins can create shifts" ON public.shifts;
DROP POLICY IF EXISTS "Super admins can update shifts" ON public.shifts;
DROP POLICY IF EXISTS "Super admins can delete shifts" ON public.shifts;
DROP POLICY IF EXISTS "Company managers can create shifts" ON public.shifts;
DROP POLICY IF EXISTS "Company managers can update shifts" ON public.shifts;
DROP POLICY IF EXISTS "Company managers can delete shifts" ON public.shifts;
DROP POLICY IF EXISTS "Admins and managers can manage shifts" ON public.shifts;
DROP POLICY IF EXISTS "Employees can view company shifts" ON public.shifts;

-- Create new comprehensive policies for shifts
CREATE POLICY "View shifts"
ON public.shifts FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR is_organization_manager_for_company(auth.uid(), company_id)
  OR EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = shifts.company_id AND c.company_manager_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM employees e
    WHERE e.company_id = shifts.company_id AND e.user_id = auth.uid()
  )
);

CREATE POLICY "Insert shifts"
ON public.shifts FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR is_organization_manager_for_company(auth.uid(), company_id)
  OR EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = company_id AND c.company_manager_id = auth.uid()
  )
);

CREATE POLICY "Update shifts"
ON public.shifts FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR is_organization_manager_for_company(auth.uid(), company_id)
  OR EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = shifts.company_id AND c.company_manager_id = auth.uid()
  )
);

CREATE POLICY "Delete shifts"
ON public.shifts FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR is_organization_manager_for_company(auth.uid(), company_id)
  OR EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = shifts.company_id AND c.company_manager_id = auth.uid()
  )
);

-- Update calendar_events policies to include organization managers
DROP POLICY IF EXISTS "Admins and company managers can create events for users" ON public.calendar_events;
DROP POLICY IF EXISTS "Admins and company managers can update events" ON public.calendar_events;
DROP POLICY IF EXISTS "Admins and company managers can delete events" ON public.calendar_events;
DROP POLICY IF EXISTS "Admins and company managers can view employee events" ON public.calendar_events;

-- Helper function to check if org manager for a calendar event user
CREATE OR REPLACE FUNCTION public.is_organization_manager_for_user(_manager_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees e
    JOIN public.companies c ON c.id = e.company_id
    JOIN public.organizations o ON o.id = c.organization_id
    WHERE e.user_id = _user_id
      AND o.organization_manager_id = _manager_id
  )
$$;

CREATE POLICY "View calendar events"
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

CREATE POLICY "Insert calendar events"
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

CREATE POLICY "Update calendar events"
ON public.calendar_events FOR UPDATE
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

CREATE POLICY "Delete calendar events"
ON public.calendar_events FOR DELETE
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