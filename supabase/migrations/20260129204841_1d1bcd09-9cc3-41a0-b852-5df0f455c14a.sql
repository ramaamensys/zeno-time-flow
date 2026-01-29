-- Fix RLS for schedule_templates so managers / operations managers can save/update/delete schedules only for companies they can access

-- Ensure RLS is enabled
ALTER TABLE public.schedule_templates ENABLE ROW LEVEL SECURITY;

-- Remove overly-permissive / insufficient policies
DROP POLICY IF EXISTS "Authenticated users can view schedule templates" ON public.schedule_templates;
DROP POLICY IF EXISTS "Admins can manage schedule templates" ON public.schedule_templates;

-- SELECT: only templates for companies the user can access
CREATE POLICY "Users can view accessible schedule templates"
ON public.schedule_templates
FOR SELECT
TO authenticated
USING (public.can_access_company(auth.uid(), company_id));

-- INSERT: allow creating templates for accessible companies; enforce created_by = auth.uid()
CREATE POLICY "Users can create schedule templates"
ON public.schedule_templates
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_access_company(auth.uid(), company_id)
  AND created_by = auth.uid()
);

-- UPDATE: allow updating templates for accessible companies
CREATE POLICY "Users can update schedule templates"
ON public.schedule_templates
FOR UPDATE
TO authenticated
USING (public.can_access_company(auth.uid(), company_id))
WITH CHECK (public.can_access_company(auth.uid(), company_id));

-- DELETE: allow deleting templates for accessible companies
CREATE POLICY "Users can delete schedule templates"
ON public.schedule_templates
FOR DELETE
TO authenticated
USING (public.can_access_company(auth.uid(), company_id));
