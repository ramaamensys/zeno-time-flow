-- Fix coworker-name RPC: allow employees to be recognized by email match
-- (some employee rows may not have user_id populated).

CREATE OR REPLACE FUNCTION public.get_company_employee_names(_company_id uuid)
RETURNS TABLE(id uuid, first_name text, last_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  WITH me AS (
    SELECT p.email
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
    LIMIT 1
  ),
  permitted AS (
    SELECT (
      public.has_role(auth.uid(), 'super_admin'::public.app_role)
      OR public.can_access_company(auth.uid(), _company_id)
      OR EXISTS (
        SELECT 1
        FROM public.employees e
        CROSS JOIN me
        WHERE e.company_id = _company_id
          AND (
            e.user_id = auth.uid()
            OR (me.email IS NOT NULL AND e.email = me.email)
          )
      )
    ) AS ok
  )
  SELECT e.id, e.first_name, e.last_name
  FROM public.employees e
  CROSS JOIN permitted p
  WHERE p.ok
    AND e.company_id = _company_id;
$$;