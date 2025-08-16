-- Add parent_task_id column to template_tasks table to support subtasks
ALTER TABLE public.template_tasks 
ADD COLUMN parent_task_id UUID REFERENCES public.template_tasks(id) ON DELETE CASCADE;