-- Create organizations table
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  address TEXT,
  phone TEXT,
  email TEXT,
  operations_manager_id UUID,
  organization_manager_id UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add organization_id to companies table
ALTER TABLE public.companies ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Enable RLS on organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for organizations
CREATE POLICY "Super admins can manage all organizations"
  ON public.organizations FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Operations managers can manage assigned organizations"
  ON public.organizations FOR ALL
  USING (has_role(auth.uid(), 'operations_manager'::app_role) AND operations_manager_id = auth.uid());

CREATE POLICY "Organization managers can view their assigned organization"
  ON public.organizations FOR SELECT
  USING (has_role(auth.uid(), 'manager'::app_role) AND organization_manager_id = auth.uid());

CREATE POLICY "Organization managers can update limited organization fields"
  ON public.organizations FOR UPDATE
  USING (has_role(auth.uid(), 'manager'::app_role) AND organization_manager_id = auth.uid())
  WITH CHECK (has_role(auth.uid(), 'manager'::app_role) AND organization_manager_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create default organization and migrate existing companies
INSERT INTO public.organizations (id, name, color, created_by)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization', '#6366f1', NULL);

-- Update existing companies to belong to default organization
UPDATE public.companies SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;