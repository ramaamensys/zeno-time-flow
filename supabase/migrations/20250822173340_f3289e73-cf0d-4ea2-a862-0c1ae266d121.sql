-- Add delete policy for admins on calendar_events (super admin policy already exists)
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

-- Also allow admins to delete template_tasks
CREATE POLICY "Admins can delete template tasks" 
ON public.template_tasks 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));