-- Update the RLS policy to prevent users from creating chats with themselves
DROP POLICY IF EXISTS "Users and admins can create task chats" ON public.task_chats;

-- Create new policy that prevents self-chats
CREATE POLICY "Users and admins can create task chats" ON public.task_chats
FOR INSERT 
WITH CHECK (
  -- Admins can create chats where they are the admin (not user)
  (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = admin_id AND auth.uid() != user_id) OR
  -- Super admins can create any chat (but not self-chats)
  (has_role(auth.uid(), 'super_admin'::app_role) AND auth.uid() != user_id) OR
  -- Users cannot create chats themselves - only admins can create chats
  FALSE
);

-- Clean up any existing self-chats (where user_id = admin_id)
DELETE FROM public.task_chats WHERE user_id = admin_id;