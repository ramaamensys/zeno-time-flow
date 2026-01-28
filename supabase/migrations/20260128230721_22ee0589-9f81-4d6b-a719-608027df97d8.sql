-- Add INSERT policy for employees to clock in
CREATE POLICY "Employees can create their own time clock entries"
ON public.time_clock
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = employee_id
    AND e.user_id = auth.uid()
  )
);

-- Add UPDATE policy for employees to clock out and manage breaks
CREATE POLICY "Employees can update their own time clock entries"
ON public.time_clock
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = time_clock.employee_id
    AND e.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = employee_id
    AND e.user_id = auth.uid()
  )
);