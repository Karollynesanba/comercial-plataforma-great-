CREATE POLICY "Admins/coordinators can update my_day_items for others"
ON public.my_day_items
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() AND p.operational_role = 'COORDENADOR_RED'::operational_role
  )
);