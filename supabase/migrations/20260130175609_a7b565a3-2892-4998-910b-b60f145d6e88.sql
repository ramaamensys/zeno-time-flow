-- Allow employees to view other employees in the same company
-- This is needed for schedule visibility where employees can see who else is working

CREATE POLICY "Employees can view coworkers at their company"
ON public.employees
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.user_id = auth.uid()
    AND e.company_id = employees.company_id
  )
);