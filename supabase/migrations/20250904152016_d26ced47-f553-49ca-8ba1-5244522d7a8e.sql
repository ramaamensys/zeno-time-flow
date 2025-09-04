-- Fix overly permissive RLS policies

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Users can view employees" ON public.employees;
DROP POLICY IF EXISTS "Users can view shifts" ON public.shifts;
DROP POLICY IF EXISTS "Users can view time clock entries" ON public.time_clock;
DROP POLICY IF EXISTS "Users can view companies" ON public.companies;
DROP POLICY IF EXISTS "Users can view departments" ON public.departments;
DROP POLICY IF EXISTS "Users can view employee skills" ON public.employee_skills;
DROP POLICY IF EXISTS "Users can view schedule templates" ON public.schedule_templates;

-- Create secure SELECT policies for employees
CREATE POLICY "Admins can view all employees" ON public.employees
FOR SELECT USING (
  public.has_role(auth.uid(), 'admin'::public.app_role) OR 
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
);

CREATE POLICY "Users can view their own employee record" ON public.employees
FOR SELECT USING (user_id = auth.uid());

-- Create secure SELECT policies for shifts
CREATE POLICY "Admins can view all shifts" ON public.shifts
FOR SELECT USING (
  public.has_role(auth.uid(), 'admin'::public.app_role) OR 
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
);

CREATE POLICY "Employees can view their own shifts" ON public.shifts
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.employees e 
    WHERE e.id = shifts.employee_id 
    AND e.user_id = auth.uid()
  )
);

-- Create secure SELECT policies for time_clock
CREATE POLICY "Admins can view all time clock entries" ON public.time_clock
FOR SELECT USING (
  public.has_role(auth.uid(), 'admin'::public.app_role) OR 
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
);

CREATE POLICY "Employees can view their own time clock entries" ON public.time_clock
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.employees e 
    WHERE e.id = time_clock.employee_id 
    AND e.user_id = auth.uid()
  )
);

-- Restrict other tables to authenticated users only
CREATE POLICY "Authenticated users can view companies" ON public.companies
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view departments" ON public.departments
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view employee skills" ON public.employee_skills
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view schedule templates" ON public.schedule_templates
FOR SELECT TO authenticated USING (true);