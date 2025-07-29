-- Add priority column to calendar_events
ALTER TABLE public.calendar_events 
ADD COLUMN priority text DEFAULT 'medium' 
CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- Update RLS policies to allow managers to see all events
DROP POLICY IF EXISTS "Super admins can view all events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can manage their own events" ON public.calendar_events;

-- Create new policies for calendar events
CREATE POLICY "Users can manage their own events" 
ON public.calendar_events 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Super admins and managers can view all events" 
ON public.calendar_events 
FOR SELECT 
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Super admins can manage all events" 
ON public.calendar_events 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can update all events" 
ON public.calendar_events 
FOR UPDATE 
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can delete all events" 
ON public.calendar_events 
FOR DELETE 
USING (has_role(auth.uid(), 'super_admin'::app_role));