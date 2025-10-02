-- Create location_logs table for tracking user locations
CREATE TABLE IF NOT EXISTS public.location_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  location_address TEXT NOT NULL,
  coordinates JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.location_logs ENABLE ROW LEVEL SECURITY;

-- Users can create their own location logs
CREATE POLICY "Users can create their own location logs"
  ON public.location_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own location logs
CREATE POLICY "Users can view their own location logs"
  ON public.location_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all location logs
CREATE POLICY "Admins can view all location logs"
  ON public.location_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('super_admin', 'admin', 'manager')
    )
  );

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_location_logs_user_id ON public.location_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_location_logs_created_at ON public.location_logs(created_at DESC);