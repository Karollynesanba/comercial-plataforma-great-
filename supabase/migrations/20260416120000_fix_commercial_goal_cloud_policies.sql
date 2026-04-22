-- Allow the commercial operation to persist shared goals from the app.
-- The old policy allowed reads for everyone, but writes only for admin,
-- which made coordinator/commercial saves appear locally and disappear after refresh.

DROP POLICY IF EXISTS "Admin can manage goals" ON public.commercial_goals;
DROP POLICY IF EXISTS "Authenticated users can manage commercial goals" ON public.commercial_goals;
CREATE POLICY "Authenticated users can manage commercial goals"
ON public.commercial_goals
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Admin can manage SDR goals" ON public.sdr_goals;
DROP POLICY IF EXISTS "Authenticated users can manage SDR goals" ON public.sdr_goals;
CREATE POLICY "Authenticated users can manage SDR goals"
ON public.sdr_goals
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
