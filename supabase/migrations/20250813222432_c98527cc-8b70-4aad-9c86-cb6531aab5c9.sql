-- Update the calendar_events INSERT policy to allow admins to create events for any user
DROP POLICY IF EXISTS "Users can create their own events" ON public.calendar_events;

CREATE POLICY "Users can create their own events or admins can create for anyone" 
ON public.calendar_events 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);