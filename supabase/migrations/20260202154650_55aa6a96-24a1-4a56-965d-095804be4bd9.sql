-- Create a public view for employee directory that excludes sensitive fields
-- This view will be used for coworker lookups instead of the full employees table

CREATE VIEW public.employees_public
WITH (security_invoker=on) AS
SELECT 
  id,
  user_id,
  company_id,
  department_id,
  first_name,
  last_name,
  position,
  status,
  created_at,
  updated_at
  -- Excluded sensitive fields: hourly_rate, email, phone, emergency_contact_name, emergency_contact_phone, hire_date, notes
FROM public.employees;

-- Add comment explaining the view purpose
COMMENT ON VIEW public.employees_public IS 'Public employee directory view excluding sensitive fields like salary, contact info, and emergency contacts. Use this view for coworker lookups.';

-- Drop the overly permissive coworker policy that exposes all employee data
DROP POLICY IF EXISTS "Employees can view coworkers at their company" ON public.employees;

-- Create a new restrictive policy - employees can only view their OWN full record
-- For coworker info, they must use the employees_public view
CREATE POLICY "Employees can only view their own full record"
ON public.employees
FOR SELECT
USING (user_id = auth.uid());

-- Grant SELECT on the public view to authenticated users
-- The view inherits RLS from the base table via security_invoker=on
GRANT SELECT ON public.employees_public TO authenticated;