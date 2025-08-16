-- Allow users to view learning templates they are assigned to
CREATE POLICY "Users can view assigned templates" 
ON public.learning_templates 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.template_assignments 
    WHERE template_assignments.template_id = learning_templates.id 
    AND template_assignments.user_id = auth.uid()
  )
);