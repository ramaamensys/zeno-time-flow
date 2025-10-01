-- Create task work sessions table for tracking employee work on tasks
CREATE TABLE public.task_work_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL,
  user_id UUID NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_time TIMESTAMP WITH TIME ZONE,
  start_location JSONB,
  end_location JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.task_work_sessions ENABLE ROW LEVEL SECURITY;

-- Users can create their own work sessions
CREATE POLICY "Users can create their own work sessions"
ON public.task_work_sessions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view their own work sessions
CREATE POLICY "Users can view their own work sessions"
ON public.task_work_sessions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can update their own work sessions
CREATE POLICY "Users can update their own work sessions"
ON public.task_work_sessions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Managers and super admins can view all work sessions
CREATE POLICY "Managers can view all work sessions"
ON public.task_work_sessions
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_task_work_sessions_updated_at
BEFORE UPDATE ON public.task_work_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better query performance
CREATE INDEX idx_task_work_sessions_task_id ON public.task_work_sessions(task_id);
CREATE INDEX idx_task_work_sessions_user_id ON public.task_work_sessions(user_id);