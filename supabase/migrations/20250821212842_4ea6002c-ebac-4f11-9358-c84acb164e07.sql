-- Drop existing policies
DROP POLICY IF EXISTS "Admins can create and manage task chats" ON public.task_chats;
DROP POLICY IF EXISTS "Users can view their task chats" ON public.task_chats;

-- Create new policies that allow proper chat creation
-- Policy for SELECT: Users can view chats they're part of
CREATE POLICY "Users can view their task chats" ON public.task_chats
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  auth.uid() = admin_id OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Policy for INSERT: Allow admins to create chats and auto-assign admin_id
CREATE POLICY "Admins can create task chats" ON public.task_chats
FOR INSERT 
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
);

-- Policy for UPDATE: Only admins can update
CREATE POLICY "Admins can update task chats" ON public.task_chats
FOR UPDATE 
USING (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)) AND
  auth.uid() = admin_id
)
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)) AND
  auth.uid() = admin_id
);

-- Policy for DELETE: Only admins can delete
CREATE POLICY "Admins can delete task chats" ON public.task_chats
FOR DELETE 
USING (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)) AND
  auth.uid() = admin_id
);