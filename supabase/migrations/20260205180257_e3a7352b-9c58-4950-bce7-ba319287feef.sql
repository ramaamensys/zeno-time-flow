-- Create a SECURITY DEFINER function to get all employees in a company (for schedule viewing)
-- This allows employees to see the full company schedule with all coworkers
CREATE OR REPLACE FUNCTION public.get_company_employees_for_schedule(_company_id uuid)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  company_id uuid,
  department_id uuid,
  employee_position text,
  employee_status text,
  user_id uuid,
  team_id uuid
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT 
    e.id,
    e.first_name,
    e.last_name,
    e.company_id,
    e.department_id,
    e.position,
    e.status,
    e.user_id,
    e.team_id
  FROM employees e
  WHERE e.company_id = _company_id
    AND e.status = 'active'
  ORDER BY e.first_name, e.last_name;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_company_employees_for_schedule(uuid) TO authenticated;