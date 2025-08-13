-- Make start_time and end_time nullable to allow creating tasks without dates
ALTER TABLE public.calendar_events 
ALTER COLUMN start_time DROP NOT NULL,
ALTER COLUMN end_time DROP NOT NULL;

-- Add completed_at column for tracking completion timestamps
ALTER TABLE public.calendar_events 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;