-- Allow admins/coordinators to view other users' Meu Dia items
-- Existing policies already allow users to view their own items.

CREATE POLICY "Admins/coordinators can view all my_day_items"
ON public.my_day_items
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.operational_role = 'COORDENADOR_RED'::public.operational_role
  )
);

-- Allow admins/coordinators to insert items for other users (assignment use-case)
-- Existing policy already allows inserting own items.
CREATE POLICY "Admins/coordinators can insert my_day_items for others"
ON public.my_day_items
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.operational_role = 'COORDENADOR_RED'::public.operational_role
  )
);