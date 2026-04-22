-- Drop existing restrictive INSERT policy
DROP POLICY IF EXISTS "Operational clients insertable by authenticated users" ON public.operational_clients;

-- Create a permissive INSERT policy for authenticated users
CREATE POLICY "Operational clients insertable by authenticated users" 
ON public.operational_clients 
FOR INSERT 
TO authenticated
WITH CHECK (true);