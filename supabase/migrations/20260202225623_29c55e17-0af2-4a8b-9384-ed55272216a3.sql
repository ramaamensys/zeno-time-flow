-- Create a SECURITY DEFINER RPC that safely returns coworker names for a company
-- This avoids relying on RLS behavior through views and keeps exposure limited to non-sensitive fields.

CREATE OR REPLACE FUNCTION public.get_company_employee_names(_company_id uuid)
RETURNS TABLE(id uuid, first_name text, last_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  WITH permitted AS (
    SELECT (
      public.has_role(auth.uid(), 'super_admin'::public.app_role)
      OR public.can_access_company(auth.uid(), _company_id)
      OR public.is_employee_at_company(auth.uid(), _company_id)
    ) AS ok
  )
  SELECT e.id, e.first_name, e.last_name
  FROM public.employees e
  CROSS JOIN permitted p
  WHERE p.ok
    AND e.company_id = _company_id;
$$;