-- Add new roles to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'house_keeping';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'maintenance';