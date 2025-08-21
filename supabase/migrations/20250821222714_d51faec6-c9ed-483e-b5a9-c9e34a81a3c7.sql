-- Create a function to get available admins for a user's chats
CREATE OR REPLACE FUNCTION public.get_available_admins_for_user(_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  role text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  -- Get admins from existing chats
  WITH chat_admins AS (
    SELECT DISTINCT tc.admin_id as user_id
    FROM public.task_chats tc
    WHERE tc.user_id = _user_id
  ),
  -- Get super admins
  super_admins AS (
    SELECT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role = 'super_admin'::public.app_role
  ),
  -- Get user's manager
  user_manager AS (
    SELECT p.manager_id as user_id
    FROM public.profiles p
    WHERE p.user_id = _user_id
      AND p.manager_id IS NOT NULL
  ),
  -- Combine all admin IDs
  all_admin_ids AS (
    SELECT user_id FROM chat_admins WHERE user_id IS NOT NULL
    UNION
    SELECT user_id FROM super_admins
    UNION  
    SELECT user_id FROM user_manager
  )
  -- Get profiles for all admin IDs
  SELECT 
    p.user_id,
    p.full_name,
    p.email,
    CASE 
      WHEN EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role = 'super_admin'::public.app_role) 
      THEN 'super_admin'
      ELSE 'admin'
    END as role
  FROM public.profiles p
  INNER JOIN all_admin_ids a ON p.user_id = a.user_id
  ORDER BY 
    CASE 
      WHEN EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role = 'super_admin'::public.app_role)
      THEN 1 
      ELSE 2 
    END,
    p.full_name;
$$;