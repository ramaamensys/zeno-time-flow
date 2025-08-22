-- Add delete policy for admins on calendar_events (check if it exists first)
CREATE POLICY "Admins can delete assigned users events" 
ON public.calendar_events 
FOR DELETE 
USING (
  has_role(auth.uid(), 'admin'::app_role) AND 
  EXISTS (
    SELECT 1 
    FROM profiles p1, profiles p2 
    WHERE p1.user_id = auth.uid() 
      AND p2.user_id = calendar_events.user_id 
      AND p2.manager_id = auth.uid() 
      AND NOT has_role(calendar_events.user_id, 'super_admin'::app_role)
  )
);