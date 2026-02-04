-- Create employee availability table for tracking when employees are available to work
CREATE TABLE public.employee_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  -- 'available', 'prefers_to_work', 'unavailable'
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'prefers_to_work', 'unavailable')),
  -- Optional: specific time ranges (null means whole day)
  start_time TIME,
  end_time TIME,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Unique constraint per employee per date (for whole day availability)
  UNIQUE(employee_id, date)
);

-- Enable RLS
ALTER TABLE public.employee_availability ENABLE ROW LEVEL SECURITY;

-- Create trigger for updated_at
CREATE TRIGGER update_employee_availability_updated_at
  BEFORE UPDATE ON public.employee_availability
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies

-- Super admins can do everything
CREATE POLICY "Super admins can manage all availability"
  ON public.employee_availability
  FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Organization managers can manage availability in their organization's companies
CREATE POLICY "Org managers can manage availability in their companies"
  ON public.employee_availability
  FOR ALL
  USING (public.is_organization_manager_for_company(auth.uid(), company_id));

-- Company managers can manage availability in their company
CREATE POLICY "Company managers can manage availability in their company"
  ON public.employee_availability
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.companies 
      WHERE id = company_id AND company_manager_id = auth.uid()
    )
  );

-- Employees can view and manage their own availability
CREATE POLICY "Employees can manage their own availability"
  ON public.employee_availability
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.employees 
      WHERE id = employee_id AND user_id = auth.uid()
    )
  );

-- Employees can view coworkers' availability (for schedule visibility)
CREATE POLICY "Employees can view coworker availability"
  ON public.employee_availability
  FOR SELECT
  USING (
    public.is_employee_at_company(auth.uid(), company_id)
  );

-- Create index for efficient queries
CREATE INDEX idx_employee_availability_employee_date 
  ON public.employee_availability(employee_id, date);

CREATE INDEX idx_employee_availability_company_date 
  ON public.employee_availability(company_id, date);