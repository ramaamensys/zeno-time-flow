-- Add status column to profiles table to track user status
ALTER TABLE public.profiles 
ADD COLUMN status text DEFAULT 'active' CHECK (status IN ('active', 'deleted'));

-- Update existing profiles to have active status
UPDATE public.profiles SET status = 'active' WHERE status IS NULL;