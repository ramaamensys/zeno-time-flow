-- Allow employees to view all shifts in their company (not just their own)
DROP POLICY IF EXISTS "Employees can view their own shifts" ON public.shifts;

CREATE POLICY "Employees can view company shifts"
ON public.shifts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.user_id = auth.uid()
    AND e.company_id = shifts.company_id
  )
);