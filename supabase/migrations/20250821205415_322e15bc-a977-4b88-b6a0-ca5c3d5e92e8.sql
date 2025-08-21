-- Create storage bucket for task attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('task-attachments', 'task-attachments', false);

-- Create RLS policies for task attachments
CREATE POLICY "Users can upload their own task attachments" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'task-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own task attachments" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'task-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all task attachments" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'task-attachments' AND (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
));

CREATE POLICY "Admins can upload task attachments for any user" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'task-attachments' AND (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
));

CREATE POLICY "Users can update their own task attachments" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'task-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own task attachments" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'task-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);