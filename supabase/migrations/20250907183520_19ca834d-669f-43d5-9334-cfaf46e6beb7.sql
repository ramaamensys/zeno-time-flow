-- Add new roles to the app_role enum if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'operations_manager') THEN
        ALTER TYPE public.app_role ADD VALUE 'operations_manager';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'manager') THEN
        ALTER TYPE public.app_role ADD VALUE 'manager';
    END IF;
END $$;