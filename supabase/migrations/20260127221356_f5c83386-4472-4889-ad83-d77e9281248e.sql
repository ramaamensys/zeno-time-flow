-- Allow app_role = 'admin' to manage employees (currently missing, causing silent 0-row deletes)

DROP POLICY IF EXISTS "Admins can manage all employees" ON public.employees;

CREATE POLICY "Admins can manage all employees"
ON public.employees
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
