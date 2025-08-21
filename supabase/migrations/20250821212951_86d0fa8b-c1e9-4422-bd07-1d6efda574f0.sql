-- Drop the restrictive insert policy
DROP POLICY IF EXISTS "Admins can create task chats" ON public.task_chats;

-- Create new policy that allows both users and admins to create chats appropriately
CREATE POLICY "Users and admins can create task chats" ON public.task_chats
FOR INSERT 
WITH CHECK (
  -- Admins can create chats where they are the admin
  (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = admin_id) OR
  -- Super admins can create any chat
  has_role(auth.uid(), 'super_admin'::app_role) OR
  -- Users can create chats where they are assigned (when admin_id equals user_id)
  (NOT has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = user_id AND auth.uid() = admin_id)
);