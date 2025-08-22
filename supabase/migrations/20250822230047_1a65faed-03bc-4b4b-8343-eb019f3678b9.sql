-- Add end_date column to habits table
ALTER TABLE public.habits 
ADD COLUMN end_date date;

-- Add a comment to clarify the purpose
COMMENT ON COLUMN public.habits.end_date IS 'Optional end date for the habit. If specified, habit will only appear between start_date and end_date (inclusive).';