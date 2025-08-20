-- Add unique constraint to user_id in app_settings table
ALTER TABLE public.app_settings 
ADD CONSTRAINT unique_user_settings UNIQUE (user_id);