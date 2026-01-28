-- Add SELECT policy for operations managers to view organizations they manage
CREATE POLICY "Operations managers can view organizations they manage"
ON public.organizations
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'operations_manager'::app_role) 
  AND organization_manager_id = auth.uid()
);