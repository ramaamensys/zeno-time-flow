-- Add RLS policy to allow operations managers to view all profiles for manager assignment
CREATE POLICY "Operations managers can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'operations_manager'::app_role));