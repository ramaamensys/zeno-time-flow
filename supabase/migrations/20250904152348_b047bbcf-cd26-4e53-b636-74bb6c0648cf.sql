-- Fix remaining public access security issues by restricting to authenticated users

-- Companies table: Remove public access, require authentication
DROP POLICY IF EXISTS "Authenticated users can view companies" ON public.companies;
DROP POLICY IF EXISTS "Users can view companies they have access to" ON public.companies;

CREATE POLICY "Authenticated users can view companies" 
ON public.companies 
FOR SELECT 
TO authenticated
USING (true);

-- Departments table: Remove public access, require authentication  
DROP POLICY IF EXISTS "Authenticated users can view departments" ON public.departments;

CREATE POLICY "Authenticated users can view departments" 
ON public.departments 
FOR SELECT 
TO authenticated  
USING (true);

-- Skills table: Remove public access, require authentication
DROP POLICY IF EXISTS "Users can view skills" ON public.skills;

CREATE POLICY "Authenticated users can view skills" 
ON public.skills 
FOR SELECT 
TO authenticated
USING (true);

-- Employee Skills table: Remove public access, require authentication
DROP POLICY IF EXISTS "Authenticated users can view employee skills" ON public.employee_skills;

CREATE POLICY "Authenticated users can view employee skills" 
ON public.employee_skills 
FOR SELECT 
TO authenticated
USING (true);

-- Schedule Templates table: Remove public access, require authentication  
DROP POLICY IF EXISTS "Authenticated users can view schedule templates" ON public.schedule_templates;

CREATE POLICY "Authenticated users can view schedule templates" 
ON public.schedule_templates 
FOR SELECT 
TO authenticated
USING (true);