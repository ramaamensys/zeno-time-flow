-- Add parent_task_id column to support task hierarchy
ALTER TABLE public.calendar_events 
ADD COLUMN parent_task_id UUID REFERENCES public.calendar_events(id) ON DELETE CASCADE;

-- Add index for better performance when querying parent-child relationships
CREATE INDEX idx_calendar_events_parent_task_id ON public.calendar_events(parent_task_id);

-- Add a check constraint to prevent tasks from being their own parent (preventing infinite loops)
ALTER TABLE public.calendar_events 
ADD CONSTRAINT chk_not_self_parent CHECK (id != parent_task_id);