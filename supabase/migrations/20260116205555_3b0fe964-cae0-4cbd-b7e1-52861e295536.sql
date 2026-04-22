-- Create commercial_goals table to sync goals between Commercial and CEO
CREATE TABLE public.commercial_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month VARCHAR(7) NOT NULL, -- format: YYYY-MM
  goal_value NUMERIC NOT NULL DEFAULT 100000,
  created_by_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(month)
);

-- Enable RLS
ALTER TABLE public.commercial_goals ENABLE ROW LEVEL SECURITY;

-- Policies: Anyone authenticated can read, only admin/coordinator can write
CREATE POLICY "Authenticated users can view goals"
  ON public.commercial_goals
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can manage goals"
  ON public.commercial_goals
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create SDR goals table
CREATE TABLE public.sdr_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agendador VARCHAR(50) NOT NULL, -- MIGUEL, FELIPE
  month VARCHAR(7) NOT NULL, -- format: YYYY-MM
  goal_count INTEGER NOT NULL DEFAULT 10,
  created_by_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agendador, month)
);

-- Enable RLS
ALTER TABLE public.sdr_goals ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view SDR goals"
  ON public.sdr_goals
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can manage SDR goals"
  ON public.sdr_goals
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.commercial_goals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sdr_goals;