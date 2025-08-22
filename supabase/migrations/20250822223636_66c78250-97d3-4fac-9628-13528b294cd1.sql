-- Add start_date and start_time columns to habits table
ALTER TABLE public.habits 
ADD COLUMN start_date DATE,
ADD COLUMN start_time TIME;

-- Update the notes column if it doesn't exist (it should exist from previous migration)
-- This is just to ensure consistency