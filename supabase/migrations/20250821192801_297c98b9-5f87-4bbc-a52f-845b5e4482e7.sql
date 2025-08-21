-- Add missing DELETE policy for super admins on calendar_events
CREATE POLICY "Super admins can delete all events"
ON public.calendar_events
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));