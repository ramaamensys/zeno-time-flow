-- Create schedule_teams table to organize employees into teams (Employees, Maintenance, Cleaning, etc.)
CREATE TABLE public.schedule_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(company_id, name)
);

-- Add team_id to employees table to assign employees to teams
ALTER TABLE public.employees 
ADD COLUMN team_id UUID REFERENCES public.schedule_teams(id) ON DELETE SET NULL;

-- Add team_id to shifts table to organize shifts by team
ALTER TABLE public.shifts 
ADD COLUMN team_id UUID REFERENCES public.schedule_teams(id) ON DELETE SET NULL;

-- Add team_id to schedule_templates to save templates per team
ALTER TABLE public.schedule_templates 
ADD COLUMN team_id UUID REFERENCES public.schedule_teams(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.schedule_teams ENABLE ROW LEVEL SECURITY;

-- RLS Policies for schedule_teams

-- Super admins can do everything
CREATE POLICY "Super admins full access to schedule_teams"
ON public.schedule_teams
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Organization managers can manage teams in their companies
CREATE POLICY "Org managers can manage teams in their companies"
ON public.schedule_teams
FOR ALL
USING (public.is_organization_manager_for_company(auth.uid(), company_id));

-- Company managers can manage teams in their company
CREATE POLICY "Company managers can manage teams"
ON public.schedule_teams
FOR ALL
USING (EXISTS (
  SELECT 1 FROM companies 
  WHERE companies.id = schedule_teams.company_id 
  AND companies.company_manager_id = auth.uid()
));

-- Employees can view teams in their company
CREATE POLICY "Employees can view their company teams"
ON public.schedule_teams
FOR SELECT
USING (public.is_employee_at_company(auth.uid(), company_id));

-- Create trigger for updated_at
CREATE TRIGGER update_schedule_teams_updated_at
BEFORE UPDATE ON public.schedule_teams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_schedule_teams_company_id ON public.schedule_teams(company_id);
CREATE INDEX idx_employees_team_id ON public.employees(team_id);
CREATE INDEX idx_shifts_team_id ON public.shifts(team_id);