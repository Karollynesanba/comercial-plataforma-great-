-- Drop existing INSERT policy and create a more permissive one for authenticated users
DROP POLICY IF EXISTS "Operational clients insertable by authenticated users" ON public.operational_clients;

CREATE POLICY "Operational clients insertable by authenticated users" 
ON public.operational_clients 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Also ensure the work_items policy allows related_client_id to be any UUID
DROP POLICY IF EXISTS "Work items insertable by authenticated users" ON public.work_items;

CREATE POLICY "Work items insertable by authenticated users" 
ON public.work_items 
FOR INSERT 
TO authenticated
WITH CHECK (reporter_user_id = auth.uid());