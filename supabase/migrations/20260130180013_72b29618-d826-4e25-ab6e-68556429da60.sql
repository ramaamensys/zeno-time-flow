-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Employees can view coworkers at their company" ON employees;

-- Create a new policy that avoids infinite recursion by using a security definer function
CREATE OR REPLACE FUNCTION public.get_employee_company_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT company_id FROM employees WHERE user_id = _user_id LIMIT 1;
$$;

-- Create the new policy using the function (avoids recursion since function is SECURITY DEFINER)
CREATE POLICY "Employees can view coworkers at their company" 
ON employees 
FOR SELECT 
USING (
  company_id = get_employee_company_id(auth.uid())
);