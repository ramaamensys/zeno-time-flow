-- Add field type and manager hierarchy support to companies table
ALTER TABLE public.companies 
ADD COLUMN field_type text CHECK (field_type IN ('IT', 'Non-IT')) DEFAULT 'IT',
ADD COLUMN operations_manager_id uuid REFERENCES auth.users(id),
ADD COLUMN company_manager_id uuid REFERENCES auth.users(id),
ADD COLUMN created_by uuid REFERENCES auth.users(id);

-- Create a new role for operations manager
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'operations_manager';

-- Update companies RLS policies to support the new hierarchy
DROP POLICY IF EXISTS "Admins can manage companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can view companies" ON public.companies;

-- Super admins can manage all companies
CREATE POLICY "Super admins can manage all companies" 
ON public.companies 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Operations managers can manage companies in their field and companies they created
CREATE POLICY "Operations managers can manage their companies" 
ON public.companies 
FOR ALL 
USING (
  has_role(auth.uid(), 'operations_manager'::app_role) AND 
  (operations_manager_id = auth.uid() OR created_by = auth.uid())
);

-- Company managers can view and update their assigned company
CREATE POLICY "Company managers can view their company" 
ON public.companies 
FOR SELECT 
USING (
  company_manager_id = auth.uid() OR 
  has_role(auth.uid(), 'operations_manager'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Company managers can update their company" 
ON public.companies 
FOR UPDATE 
USING (
  company_manager_id = auth.uid() OR 
  has_role(auth.uid(), 'operations_manager'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Regular admins and users can view companies (for employee assignment)
CREATE POLICY "Authenticated users can view companies" 
ON public.companies 
FOR SELECT 
USING (true);