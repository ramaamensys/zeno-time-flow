-- Create a settings table to store application configuration
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_name TEXT DEFAULT 'zenotimeflow',
  timezone TEXT DEFAULT 'America/New_York',
  week_start_day TEXT DEFAULT 'monday',
  clock_in_grace_period INTEGER DEFAULT 5,
  overtime_threshold INTEGER DEFAULT 40,
  break_duration INTEGER DEFAULT 30,
  admin_email TEXT,
  data_retention_period INTEGER DEFAULT 365,
  shift_reminders BOOLEAN DEFAULT true,
  overtime_alerts BOOLEAN DEFAULT true,
  clock_in_reminders BOOLEAN DEFAULT false,
  schedule_changes BOOLEAN DEFAULT true,
  auto_approve_time_off BOOLEAN DEFAULT false,
  require_clock_in_location BOOLEAN DEFAULT false,
  allow_mobile_clock_in BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for settings access
CREATE POLICY "Users can view their own settings" 
ON public.app_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own settings" 
ON public.app_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" 
ON public.app_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();