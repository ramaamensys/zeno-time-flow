-- Add notes column to calendar_events table for user progress tracking
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS notes TEXT;