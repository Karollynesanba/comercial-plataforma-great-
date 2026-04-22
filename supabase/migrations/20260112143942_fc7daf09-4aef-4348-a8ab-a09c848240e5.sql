-- Fix overly permissive INSERT policies for operational_clients
DROP POLICY IF EXISTS "Operational clients insertable by authenticated users" ON public.operational_clients;
CREATE POLICY "Operational clients insertable by authenticated users"
ON public.operational_clients FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix overly permissive UPDATE policies for operational_clients
DROP POLICY IF EXISTS "Operational clients updatable by authenticated users" ON public.operational_clients;
CREATE POLICY "Operational clients updatable by authenticated users"
ON public.operational_clients FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Fix overly permissive UPDATE policies for work_items
DROP POLICY IF EXISTS "Work items updatable by authenticated users" ON public.work_items;
CREATE POLICY "Work items updatable by assignee or reporter or admin"
ON public.work_items FOR UPDATE
TO authenticated
USING (
  assignee_user_id = auth.uid() 
  OR reporter_user_id = auth.uid() 
  OR public.has_role(auth.uid(), 'admin')
);