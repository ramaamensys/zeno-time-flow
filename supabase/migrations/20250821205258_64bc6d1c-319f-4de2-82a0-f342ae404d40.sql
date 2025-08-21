-- Add files column to calendar_events for file attachments
ALTER TABLE public.calendar_events 
ADD COLUMN IF NOT EXISTS files JSONB DEFAULT '[]'::jsonb;

-- Add comment to document the files column structure
COMMENT ON COLUMN public.calendar_events.files IS 'Array of file URLs/paths uploaded by users as attachments to tasks';