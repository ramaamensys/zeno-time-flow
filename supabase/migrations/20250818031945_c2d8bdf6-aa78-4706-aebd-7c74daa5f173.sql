-- Create app_type enum
CREATE TYPE public.app_type AS ENUM ('calendar', 'scheduler');

-- Add app_type column to user_roles table
ALTER TABLE public.user_roles 
ADD COLUMN app_type public.app_type DEFAULT 'calendar';

-- Create function to get user's app type
CREATE OR REPLACE FUNCTION public.get_user_app_type(_user_id uuid)
RETURNS public.app_type
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT app_type FROM public.user_roles WHERE user_id = _user_id LIMIT 1),
    'calendar'::public.app_type
  )
$$;

-- Create function to check if user has access to specific app
CREATE OR REPLACE FUNCTION public.has_app_access(_user_id uuid, _app_type public.app_type)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND app_type = _app_type
  )
$$;