-- Fix RLS policies to respect hierarchical access control
-- Admins should only see events of users they manage, not super admin events

-- Drop the existing overly permissive admin policy
DROP POLICY IF EXISTS "Admins can view all events" ON calendar_events;

-- Create new hierarchical policies
-- Super admins can view all events
CREATE POLICY "Super admins can view all events" 
ON calendar_events 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Admins can only view events of users they manage (not super admin events)
CREATE POLICY "Admins can view assigned users events" 
ON calendar_events 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND EXISTS (
    SELECT 1 
    FROM profiles p1, profiles p2 
    WHERE p1.user_id = auth.uid() 
    AND p2.user_id = calendar_events.user_id 
    AND p2.manager_id = auth.uid()
    AND NOT has_role(calendar_events.user_id, 'super_admin'::app_role)
  )
);

-- Users can still view their own events (existing policy remains)
-- Policy "Users can view their own events" already exists

-- Also update the insert policy for admins to only create events for their assigned users
DROP POLICY IF EXISTS "Users can create their own events or admins can create for anyo" ON calendar_events;

CREATE POLICY "Users can create their own events" 
ON calendar_events 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can create events for assigned users" 
ON calendar_events 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  AND EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE user_id = calendar_events.user_id 
    AND manager_id = auth.uid()
    AND NOT has_role(calendar_events.user_id, 'super_admin'::app_role)
  )
);

CREATE POLICY "Super admins can create events for anyone" 
ON calendar_events 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));