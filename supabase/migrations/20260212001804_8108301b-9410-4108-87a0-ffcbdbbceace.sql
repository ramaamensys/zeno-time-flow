
-- Add employee_pin column to employees table
ALTER TABLE public.employees ADD COLUMN employee_pin text NULL;

-- Add a check constraint for 4-digit pin
ALTER TABLE public.employees ADD CONSTRAINT employee_pin_format CHECK (employee_pin IS NULL OR (employee_pin ~ '^\d{4}$'));
