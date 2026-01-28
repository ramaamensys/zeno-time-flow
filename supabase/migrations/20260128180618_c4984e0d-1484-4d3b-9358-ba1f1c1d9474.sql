-- Add delete policy for organization managers to delete their assigned organizations
CREATE POLICY "Organization managers can delete their assigned organization" 
ON public.organizations 
FOR DELETE 
USING (
  has_role(auth.uid(), 'manager'::app_role) 
  AND organization_manager_id = auth.uid()
);

-- Also add delete policy for operations managers on organizations they manage
CREATE POLICY "Operations managers can delete organizations they manage"
ON public.organizations
FOR DELETE
USING (
  has_role(auth.uid(), 'operations_manager'::app_role) 
  AND (operations_manager_id = auth.uid() OR organization_manager_id = auth.uid())
);