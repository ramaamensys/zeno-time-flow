-- Fix RLS policies for time_clock to allow managers to unlink shifts before deletion
-- Drop existing restrictive policies and create comprehensive ones

-- First, allow managers and operations_managers to manage time_clock entries for their companies
CREATE POLICY "Managers can manage time clock entries in their company"
ON public.time_clock
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees e
    JOIN companies c ON c.id = e.company_id
    WHERE e.id = time_clock.employee_id 
    AND (
      c.company_manager_id = auth.uid() 
      OR c.operations_manager_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM organizations o 
        WHERE o.id = c.organization_id 
        AND o.organization_manager_id = auth.uid()
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    JOIN companies c ON c.id = e.company_id
    WHERE e.id = time_clock.employee_id 
    AND (
      c.company_manager_id = auth.uid() 
      OR c.operations_manager_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM organizations o 
        WHERE o.id = c.organization_id 
        AND o.organization_manager_id = auth.uid()
      )
    )
  )
);