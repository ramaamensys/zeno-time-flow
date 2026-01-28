-- Add INSERT policy for operations managers to create organizations
CREATE POLICY "Operations managers can create organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'operations_manager'::app_role));