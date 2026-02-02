-- Create shift_replacement_requests table to track replacement requests
CREATE TABLE public.shift_replacement_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  original_employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  replacement_employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid,
  reviewer_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add missed shift tracking columns to shifts table
ALTER TABLE public.shifts 
ADD COLUMN is_missed boolean DEFAULT false,
ADD COLUMN missed_at timestamp with time zone,
ADD COLUMN replacement_employee_id uuid REFERENCES public.employees(id),
ADD COLUMN replacement_approved_at timestamp with time zone,
ADD COLUMN replacement_started_at timestamp with time zone;

-- Enable RLS
ALTER TABLE public.shift_replacement_requests ENABLE ROW LEVEL SECURITY;

-- Create trigger for updated_at
CREATE TRIGGER update_shift_replacement_requests_updated_at
  BEFORE UPDATE ON public.shift_replacement_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for shift_replacement_requests

-- Super admins can manage all replacement requests
CREATE POLICY "Super admins can manage all replacement requests"
  ON public.shift_replacement_requests
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Organization managers can manage requests in their organization
CREATE POLICY "Org managers can manage replacement requests in their org"
  ON public.shift_replacement_requests
  FOR ALL
  USING (
    has_role(auth.uid(), 'operations_manager'::app_role) 
    AND is_organization_manager_for_company(auth.uid(), company_id)
  )
  WITH CHECK (
    has_role(auth.uid(), 'operations_manager'::app_role) 
    AND is_organization_manager_for_company(auth.uid(), company_id)
  );

-- Company managers can manage requests in their company
CREATE POLICY "Company managers can manage replacement requests"
  ON public.shift_replacement_requests
  FOR ALL
  USING (
    has_role(auth.uid(), 'manager'::app_role) 
    AND EXISTS (
      SELECT 1 FROM companies c 
      WHERE c.id = company_id AND c.company_manager_id = auth.uid()
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'manager'::app_role) 
    AND EXISTS (
      SELECT 1 FROM companies c 
      WHERE c.id = company_id AND c.company_manager_id = auth.uid()
    )
  );

-- Employees can view missed shifts in their company
CREATE POLICY "Employees can view missed shifts in their company"
  ON public.shift_replacement_requests
  FOR SELECT
  USING (
    is_employee_at_company(auth.uid(), company_id)
  );

-- Employees can create replacement requests for missed shifts in their company
CREATE POLICY "Employees can request to replace missed shifts"
  ON public.shift_replacement_requests
  FOR INSERT
  WITH CHECK (
    is_employee_at_company(auth.uid(), company_id)
    AND replacement_employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

-- Employees can view their own requests
CREATE POLICY "Employees can view their own requests"
  ON public.shift_replacement_requests
  FOR SELECT
  USING (
    replacement_employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );