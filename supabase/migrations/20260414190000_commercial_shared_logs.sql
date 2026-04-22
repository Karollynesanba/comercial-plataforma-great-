-- Persist editable commercial spreadsheets in Supabase so every user sees the same numbers.

CREATE TABLE IF NOT EXISTS public.pre_sales_daily_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  sdr text NOT NULL,
  contacts integer NOT NULL DEFAULT 0,
  qualified integer NOT NULL DEFAULT 0,
  scheduled integer NOT NULL DEFAULT 0,
  no_show_calls integer NOT NULL DEFAULT 0,
  updated_by_user_id uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT pre_sales_daily_logs_unique_day_sdr UNIQUE (date, sdr)
);

ALTER TABLE public.pre_sales_daily_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view pre sales logs" ON public.pre_sales_daily_logs;
CREATE POLICY "Authenticated users can view pre sales logs"
ON public.pre_sales_daily_logs FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert pre sales logs" ON public.pre_sales_daily_logs;
CREATE POLICY "Authenticated users can insert pre sales logs"
ON public.pre_sales_daily_logs FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update pre sales logs" ON public.pre_sales_daily_logs;
CREATE POLICY "Authenticated users can update pre sales logs"
ON public.pre_sales_daily_logs FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete pre sales logs" ON public.pre_sales_daily_logs;
CREATE POLICY "Authenticated users can delete pre sales logs"
ON public.pre_sales_daily_logs FOR DELETE
TO authenticated
USING (true);

DROP TRIGGER IF EXISTS update_pre_sales_daily_logs_updated_at ON public.pre_sales_daily_logs;
CREATE TRIGGER update_pre_sales_daily_logs_updated_at
BEFORE UPDATE ON public.pre_sales_daily_logs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.closer_daily_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  closer text NOT NULL,
  agendada integer NOT NULL DEFAULT 0,
  realizada integer NOT NULL DEFAULT 0,
  pitch integer NOT NULL DEFAULT 0,
  vendas integer NOT NULL DEFAULT 0,
  valor numeric NOT NULL DEFAULT 0,
  primeira_parcela numeric NOT NULL DEFAULT 0,
  updated_by_user_id uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT closer_daily_logs_unique_day_closer UNIQUE (date, closer)
);

ALTER TABLE public.closer_daily_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view closer logs" ON public.closer_daily_logs;
CREATE POLICY "Authenticated users can view closer logs"
ON public.closer_daily_logs FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert closer logs" ON public.closer_daily_logs;
CREATE POLICY "Authenticated users can insert closer logs"
ON public.closer_daily_logs FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update closer logs" ON public.closer_daily_logs;
CREATE POLICY "Authenticated users can update closer logs"
ON public.closer_daily_logs FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete closer logs" ON public.closer_daily_logs;
CREATE POLICY "Authenticated users can delete closer logs"
ON public.closer_daily_logs FOR DELETE
TO authenticated
USING (true);

DROP TRIGGER IF EXISTS update_closer_daily_logs_updated_at ON public.closer_daily_logs;
CREATE TRIGGER update_closer_daily_logs_updated_at
BEFORE UPDATE ON public.closer_daily_logs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.pre_sales_daily_logs;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.closer_daily_logs;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
