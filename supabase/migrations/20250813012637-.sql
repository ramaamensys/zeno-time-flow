-- Disable automatic email confirmations from Supabase
-- Users will receive confirmation emails through our custom welcome email function instead

-- Update auth configuration to disable automatic confirmation emails
-- This prevents the duplicate emails issue
UPDATE auth.config 
SET 
  AUTOCONFIRM = false,
  MAILER_AUTOCONFIRM = false
WHERE true;

-- Alternative approach: Update the email templates to be empty/disabled
-- Since we can't directly disable emails, we'll customize the flow
INSERT INTO auth.config (parameter, value) 
VALUES ('MAILER_TEMPLATES_CONFIRMATION_CONTENT', '')
ON CONFLICT (parameter) 
DO UPDATE SET value = EXCLUDED.value;