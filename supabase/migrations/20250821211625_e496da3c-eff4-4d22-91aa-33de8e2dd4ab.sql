-- Fix RLS policies for task_chats table to allow proper creation

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can create task chats" ON task_chats;
DROP POLICY IF EXISTS "Chat participants can update their chats" ON task_chats;
DROP POLICY IF EXISTS "Users can view their own task chats" ON task_chats;

-- Create updated policies that properly handle chat creation
CREATE POLICY "Admins can create and manage task chats" 
ON task_chats 
FOR ALL
USING (
  -- Admin can access if they are the admin in the chat
  auth.uid() = admin_id OR
  -- User can access if they are the user in the chat
  auth.uid() = user_id OR
  -- Super admins can access all chats
  has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  -- Admin can create if they have admin role
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)) AND
  auth.uid() = admin_id
);

-- Create policy for users to view their own chats
CREATE POLICY "Users can view their task chats" 
ON task_chats 
FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = admin_id);

-- Update chat_messages policies to be more permissive
DROP POLICY IF EXISTS "Chat participants can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Chat participants can view messages" ON chat_messages;

-- Create updated chat message policies
CREATE POLICY "Chat participants can manage messages" 
ON chat_messages 
FOR ALL
USING (
  EXISTS (
    SELECT 1 
    FROM task_chats tc 
    WHERE tc.id = chat_messages.chat_id 
    AND (tc.user_id = auth.uid() OR tc.admin_id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM task_chats tc 
    WHERE tc.id = chat_messages.chat_id 
    AND (tc.user_id = auth.uid() OR tc.admin_id = auth.uid())
  ) AND
  auth.uid() = sender_id
);