-- Create task notes table for user-specific notes
CREATE TABLE public.task_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL,
  user_id UUID NOT NULL, -- The user this note is for/from
  author_id UUID NOT NULL, -- Who wrote the note (admin or user)
  note_text TEXT NOT NULL,
  files JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_notes
-- Users can view notes written for them or by them
CREATE POLICY "Users can view their task notes" ON public.task_notes
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  auth.uid() = author_id
);

-- Users can create notes for themselves
CREATE POLICY "Users can create their own task notes" ON public.task_notes
FOR INSERT 
WITH CHECK (
  auth.uid() = author_id AND 
  auth.uid() = user_id
);

-- Admins can create notes for assigned users
CREATE POLICY "Admins can create task notes for users" ON public.task_notes
FOR INSERT 
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)) AND
  auth.uid() = author_id
);

-- Admins can view all notes for tasks they manage
CREATE POLICY "Admins can view task notes" ON public.task_notes
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Users and admins can update their own notes
CREATE POLICY "Users can update their own task notes" ON public.task_notes
FOR UPDATE 
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

-- Add trigger for updated_at
CREATE TRIGGER update_task_notes_updated_at
BEFORE UPDATE ON public.task_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();