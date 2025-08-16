-- Create learning templates system
CREATE TABLE public.learning_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  technology TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create template assignments (which users are assigned to which templates)
CREATE TABLE public.template_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.learning_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  assigned_by UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(template_id, user_id)
);

-- Create template tasks (specific tasks within a template for specific users)
CREATE TABLE public.template_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.learning_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  due_date TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.learning_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for learning_templates
CREATE POLICY "Admins can view all templates" 
ON public.learning_templates 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can create templates" 
ON public.learning_templates 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can update templates" 
ON public.learning_templates 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can delete templates" 
ON public.learning_templates 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- RLS Policies for template_assignments
CREATE POLICY "Admins can view all assignments" 
ON public.template_assignments 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can view their own assignments" 
ON public.template_assignments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can create assignments" 
ON public.template_assignments 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can update assignments" 
ON public.template_assignments 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can delete assignments" 
ON public.template_assignments 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- RLS Policies for template_tasks
CREATE POLICY "Admins can view all template tasks" 
ON public.template_tasks 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can view their own template tasks" 
ON public.template_tasks 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can create template tasks" 
ON public.template_tasks 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can update their own template tasks" 
ON public.template_tasks 
FOR UPDATE 
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can delete template tasks" 
ON public.template_tasks 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Add triggers for updated_at columns
CREATE TRIGGER update_learning_templates_updated_at
BEFORE UPDATE ON public.learning_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_template_tasks_updated_at
BEFORE UPDATE ON public.template_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();