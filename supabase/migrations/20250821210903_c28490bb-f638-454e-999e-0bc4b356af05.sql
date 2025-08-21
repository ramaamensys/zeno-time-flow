-- Create chat rooms table for task-specific conversations
CREATE TABLE public.task_chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- The assigned user
  admin_id UUID NOT NULL, -- The admin/super_admin managing this chat
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id, user_id, admin_id)
);

-- Create chat messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES public.task_chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL, -- Who sent the message
  message TEXT,
  files JSONB DEFAULT '[]'::jsonb, -- Array of file URLs
  message_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'file', 'image'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.task_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_chats
CREATE POLICY "Users can view their own task chats" 
ON public.task_chats 
FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() = admin_id);

CREATE POLICY "Admins can create task chats" 
ON public.task_chats 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Chat participants can update their chats" 
ON public.task_chats 
FOR UPDATE 
USING (auth.uid() = user_id OR auth.uid() = admin_id);

-- RLS policies for chat_messages
CREATE POLICY "Chat participants can view messages" 
ON public.chat_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.task_chats tc 
    WHERE tc.id = chat_messages.chat_id 
    AND (tc.user_id = auth.uid() OR tc.admin_id = auth.uid())
  )
);

CREATE POLICY "Chat participants can send messages" 
ON public.chat_messages 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.task_chats tc 
    WHERE tc.id = chat_messages.chat_id 
    AND (tc.user_id = auth.uid() OR tc.admin_id = auth.uid())
  )
);

-- Add indexes for better performance
CREATE INDEX idx_task_chats_task_id ON public.task_chats(task_id);
CREATE INDEX idx_task_chats_user_id ON public.task_chats(user_id);
CREATE INDEX idx_chat_messages_chat_id ON public.chat_messages(chat_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at);

-- Add trigger for updating updated_at
CREATE TRIGGER update_task_chats_updated_at
BEFORE UPDATE ON public.task_chats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_chats;