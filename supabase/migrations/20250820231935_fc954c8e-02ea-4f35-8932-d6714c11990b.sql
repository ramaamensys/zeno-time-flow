-- Remove duplicate user roles using row_number to keep only the first occurrence
DELETE FROM public.user_roles
WHERE id IN (
  SELECT id FROM (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY user_id, role, app_type ORDER BY created_at) as rn
    FROM public.user_roles
  ) t 
  WHERE t.rn > 1
);

-- Add a unique constraint to prevent future duplicates
ALTER TABLE public.user_roles 
ADD CONSTRAINT unique_user_role_app UNIQUE (user_id, role, app_type);