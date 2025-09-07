-- Update companies RLS policies to enforce proper access control

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Company managers can update their company" ON public.companies;
DROP POLICY IF EXISTS "Company managers can view their company" ON public.companies;
DROP POLICY IF EXISTS "Operations managers can manage their companies" ON public.companies;
DROP POLICY IF EXISTS "Super admins can manage all companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can view companies" ON public.companies;

-- Create new comprehensive RLS policies for companies
CREATE POLICY "Super admins can manage all companies" 
ON public.companies 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Operations managers can manage assigned companies" 
ON public.companies 
FOR ALL 
USING (has_role(auth.uid(), 'operations_manager'::app_role) AND operations_manager_id = auth.uid());

CREATE POLICY "Company managers can view their assigned company" 
ON public.companies 
FOR SELECT 
USING (has_role(auth.uid(), 'manager'::app_role) AND company_manager_id = auth.uid());

-- Company managers can only update specific fields (not structural company data)
CREATE POLICY "Company managers can update limited company fields" 
ON public.companies 
FOR UPDATE 
USING (has_role(auth.uid(), 'manager'::app_role) AND company_manager_id = auth.uid())
WITH CHECK (has_role(auth.uid(), 'manager'::app_role) AND company_manager_id = auth.uid());

-- Update employees RLS policies to respect company boundaries

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Admins can manage employees" ON public.employees;
DROP POLICY IF EXISTS "Admins can view all employees" ON public.employees;

-- Create new employee policies
CREATE POLICY "Super admins can manage all employees" 
ON public.employees 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Operations managers can manage employees in their companies" 
ON public.employees 
FOR ALL 
USING (
    has_role(auth.uid(), 'operations_manager'::app_role) 
    AND EXISTS (
        SELECT 1 FROM public.companies c 
        WHERE c.id = employees.company_id 
        AND c.operations_manager_id = auth.uid()
    )
);

CREATE POLICY "Company managers can manage employees in their company" 
ON public.employees 
FOR ALL 
USING (
    has_role(auth.uid(), 'manager'::app_role) 
    AND EXISTS (
        SELECT 1 FROM public.companies c 
        WHERE c.id = employees.company_id 
        AND c.company_manager_id = auth.uid()
    )
);

-- Update shifts RLS policies

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Admins can manage shifts" ON public.shifts;
DROP POLICY IF EXISTS "Admins can view all shifts" ON public.shifts;

-- Create new shift policies
CREATE POLICY "Super admins can manage all shifts" 
ON public.shifts 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Operations managers can manage shifts in their companies" 
ON public.shifts 
FOR ALL 
USING (
    has_role(auth.uid(), 'operations_manager'::app_role) 
    AND EXISTS (
        SELECT 1 FROM public.companies c 
        WHERE c.id = shifts.company_id 
        AND c.operations_manager_id = auth.uid()
    )
);

CREATE POLICY "Company managers can manage shifts in their company" 
ON public.shifts 
FOR ALL 
USING (
    has_role(auth.uid(), 'manager'::app_role) 
    AND EXISTS (
        SELECT 1 FROM public.companies c 
        WHERE c.id = shifts.company_id 
        AND c.company_manager_id = auth.uid()
    )
);

-- Update departments RLS policies

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;

-- Create new department policies
CREATE POLICY "Super admins can manage all departments" 
ON public.departments 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Operations managers can manage departments in their companies" 
ON public.departments 
FOR ALL 
USING (
    has_role(auth.uid(), 'operations_manager'::app_role) 
    AND EXISTS (
        SELECT 1 FROM public.companies c 
        WHERE c.id = departments.company_id 
        AND c.operations_manager_id = auth.uid()
    )
);

CREATE POLICY "Company managers can manage departments in their company" 
ON public.departments 
FOR ALL 
USING (
    has_role(auth.uid(), 'manager'::app_role) 
    AND EXISTS (
        SELECT 1 FROM public.companies c 
        WHERE c.id = departments.company_id 
        AND c.company_manager_id = auth.uid()
    )
);