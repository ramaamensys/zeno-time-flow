-- Remove duplicate user roles for the same user and role combination
DELETE FROM public.user_roles
WHERE id NOT IN (
  SELECT MIN(id)
  FROM public.user_roles
  GROUP BY user_id, role, app_type
);

-- Add a unique constraint to prevent future duplicates
ALTER TABLE public.user_roles 
ADD CONSTRAINT unique_user_role_app UNIQUE (user_id, role, app_type);