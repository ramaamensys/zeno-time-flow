-- Add created_by field to calendar_events to track who created the task
ALTER TABLE public.calendar_events 
ADD COLUMN created_by uuid REFERENCES auth.users(id);

-- Update existing records to set created_by to the user_id for now (assuming existing tasks are self-created)
UPDATE public.calendar_events 
SET created_by = user_id 
WHERE created_by IS NULL;