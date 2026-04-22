-- Table for default team cost configuration
CREATE TABLE public.team_cost_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  default_team_cost NUMERIC NOT NULL DEFAULT 13000,
  currency TEXT NOT NULL DEFAULT 'BRL',
  updated_by_user_id UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for team-specific cost overrides
CREATE TABLE public.team_cost_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  monthly_cost NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_user_id UUID REFERENCES public.profiles(id)
);

-- Table for finance simulations
CREATE TABLE public.finance_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  base_period TEXT NOT NULL,
  new_teams_count INTEGER NOT NULL DEFAULT 1,
  cost_per_team NUMERIC NOT NULL DEFAULT 13000,
  estimated_extra_cost NUMERIC GENERATED ALWAYS AS (new_teams_count * cost_per_team) STORED,
  estimated_revenue NUMERIC,
  estimated_margin NUMERIC,
  notes TEXT,
  created_by_user_id UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_cost_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_cost_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_simulations ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admin only access
CREATE POLICY "Admins can manage team_cost_config"
ON public.team_cost_config
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage team_cost_overrides"
ON public.team_cost_overrides
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage finance_simulations"
ON public.finance_simulations
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default config
INSERT INTO public.team_cost_config (default_team_cost, currency) VALUES (13000, 'BRL');

-- Trigger for updated_at
CREATE TRIGGER update_team_cost_config_updated_at
BEFORE UPDATE ON public.team_cost_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_finance_simulations_updated_at
BEFORE UPDATE ON public.finance_simulations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();