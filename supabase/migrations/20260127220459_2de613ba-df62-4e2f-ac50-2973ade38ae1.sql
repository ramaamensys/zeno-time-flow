-- Add 'candidate' and 'employee' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'candidate';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'employee';