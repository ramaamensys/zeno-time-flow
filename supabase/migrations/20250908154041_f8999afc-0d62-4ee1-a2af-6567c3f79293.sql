-- Add task_id column to focus_sessions table to link focus sessions with tasks
ALTER TABLE public.focus_sessions 
ADD COLUMN task_id UUID REFERENCES public.calendar_events(id) ON DELETE SET NULL;