-- Add RLS policy to allow super admins to update all calendar events
CREATE POLICY "Super admins can update all events" 
ON public.calendar_events 
FOR UPDATE 
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add RLS policy to allow regular admins to update events for assigned users
CREATE POLICY "Admins can update assigned users events" 
ON public.calendar_events 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) AND (EXISTS ( SELECT 1
   FROM profiles p1,
    profiles p2
  WHERE ((p1.user_id = auth.uid()) AND (p2.user_id = calendar_events.user_id) AND (p2.manager_id = auth.uid()) AND (NOT has_role(calendar_events.user_id, 'super_admin'::app_role))))));