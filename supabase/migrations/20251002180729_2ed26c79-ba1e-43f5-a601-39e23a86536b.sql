-- Create helper function to check if user is a company manager for a given employee
CREATE OR REPLACE FUNCTION public.is_company_manager_for_employee(_manager_id uuid, _employee_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM employees e
    INNER JOIN companies c ON c.id = e.company_id
    WHERE e.user_id = _employee_user_id
      AND c.company_manager_id = _manager_id
  )
$$;

-- Update calendar_events RLS policies to include company managers
-- Drop existing admin view policy
DROP POLICY IF EXISTS "Admins can view assigned users events" ON public.calendar_events;

-- Create new comprehensive admin view policy
CREATE POLICY "Admins and company managers can view employee events"
ON public.calendar_events
FOR SELECT
USING (
  -- Super admins can view all
  has_role(auth.uid(), 'super_admin'::app_role) OR
  -- Regular admins can view their assigned users
  (has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM profiles WHERE profiles.user_id = calendar_events.user_id AND profiles.manager_id = auth.uid()
  )) OR
  -- Company managers can view their employees' tasks
  (has_role(auth.uid(), 'manager'::app_role) AND is_company_manager_for_employee(auth.uid(), calendar_events.user_id))
);

-- Update task_chats policies to include company managers
-- Drop existing policy
DROP POLICY IF EXISTS "Users can view their task chats" ON public.task_chats;

-- Create new comprehensive view policy for task chats
CREATE POLICY "Users and company managers can view task chats"
ON public.task_chats
FOR SELECT
USING (
  -- User is part of the chat
  auth.uid() = user_id OR 
  auth.uid() = admin_id OR
  -- Super admins can view all
  has_role(auth.uid(), 'super_admin'::app_role) OR
  -- Company managers can view chats with their employees
  (has_role(auth.uid(), 'manager'::app_role) AND is_company_manager_for_employee(auth.uid(), user_id))
);

-- Update task_chats insert policy to allow company managers
DROP POLICY IF EXISTS "Users and admins can create task chats" ON public.task_chats;

CREATE POLICY "Users, admins and company managers can create task chats"
ON public.task_chats
FOR INSERT
WITH CHECK (
  -- Admins creating chats with users
  (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = admin_id AND auth.uid() != user_id) OR
  -- Super admins creating chats
  (has_role(auth.uid(), 'super_admin'::app_role) AND auth.uid() != user_id) OR
  -- Company managers creating chats with their employees
  (has_role(auth.uid(), 'manager'::app_role) AND auth.uid() = admin_id AND is_company_manager_for_employee(auth.uid(), user_id))
);

-- Update calendar_events create policy for company managers
DROP POLICY IF EXISTS "Admins can create events for assigned users" ON public.calendar_events;

CREATE POLICY "Admins and company managers can create events for users"
ON public.calendar_events
FOR INSERT
WITH CHECK (
  -- Super admins can create for anyone
  has_role(auth.uid(), 'super_admin'::app_role) OR
  -- Regular admins can create for assigned users
  (has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM profiles WHERE profiles.user_id = calendar_events.user_id AND profiles.manager_id = auth.uid() AND NOT has_role(calendar_events.user_id, 'super_admin'::app_role)
  )) OR
  -- Company managers can create for their employees
  (has_role(auth.uid(), 'manager'::app_role) AND is_company_manager_for_employee(auth.uid(), calendar_events.user_id))
);

-- Update calendar_events update policy
DROP POLICY IF EXISTS "Admins can update assigned users events" ON public.calendar_events;

CREATE POLICY "Admins and company managers can update events"
ON public.calendar_events
FOR UPDATE
USING (
  -- Super admins can update all
  has_role(auth.uid(), 'super_admin'::app_role) OR
  -- Regular admins can update for assigned users
  (has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM profiles WHERE profiles.user_id = calendar_events.user_id AND profiles.manager_id = auth.uid() AND NOT has_role(calendar_events.user_id, 'super_admin'::app_role)
  )) OR
  -- Company managers can update their employees' events
  (has_role(auth.uid(), 'manager'::app_role) AND is_company_manager_for_employee(auth.uid(), calendar_events.user_id))
);

-- Update calendar_events delete policy
DROP POLICY IF EXISTS "Admins can delete assigned users events" ON public.calendar_events;

CREATE POLICY "Admins and company managers can delete events"
ON public.calendar_events
FOR DELETE
USING (
  -- Super admins can delete all
  has_role(auth.uid(), 'super_admin'::app_role) OR
  -- Regular admins can delete for assigned users
  (has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM profiles WHERE profiles.user_id = calendar_events.user_id AND profiles.manager_id = auth.uid() AND NOT has_role(calendar_events.user_id, 'super_admin'::app_role)
  )) OR
  -- Company managers can delete their employees' events
  (has_role(auth.uid(), 'manager'::app_role) AND is_company_manager_for_employee(auth.uid(), calendar_events.user_id))
);