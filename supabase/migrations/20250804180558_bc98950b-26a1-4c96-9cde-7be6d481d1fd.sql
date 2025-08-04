-- Add completed field to calendar_events table
ALTER TABLE public.calendar_events 
ADD COLUMN completed BOOLEAN NOT NULL DEFAULT false;

-- Add index for better performance when filtering completed events
CREATE INDEX idx_calendar_events_completed ON public.calendar_events(completed);