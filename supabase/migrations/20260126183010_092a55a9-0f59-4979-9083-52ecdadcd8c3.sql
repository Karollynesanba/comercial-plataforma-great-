-- Allow commercial coordinators to update SDR goals
CREATE POLICY "Coordinators can update sdr_goals"
ON public.sdr_goals
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.commercial_role = 'COORDENADOR_COMERCIAL'::public.commercial_role
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.commercial_role = 'COORDENADOR_COMERCIAL'::public.commercial_role
  )
);

-- Allow commercial coordinators to insert SDR goals
CREATE POLICY "Coordinators can insert sdr_goals"
ON public.sdr_goals
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.commercial_role = 'COORDENADOR_COMERCIAL'::public.commercial_role
  )
);

-- Allow all authenticated users to view SDR goals (needed for dashboard)
CREATE POLICY "Authenticated users can view sdr_goals"
ON public.sdr_goals
FOR SELECT
TO authenticated
USING (true);