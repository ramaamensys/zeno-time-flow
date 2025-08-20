-- Add template_id field to calendar_events table to link tasks created from templates
ALTER TABLE public.calendar_events 
ADD COLUMN template_id uuid REFERENCES public.learning_templates(id) ON DELETE SET NULL;