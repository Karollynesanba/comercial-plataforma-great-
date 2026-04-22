-- Create team_members table for detailed cost tracking per role
CREATE TABLE public.team_member_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  role_type TEXT NOT NULL CHECK (role_type IN ('COORDENADOR', 'GESTOR_TRAFEGO', 'DESIGN', 'EDITOR_VIDEO', 'ROTEIRISTA')),
  member_name TEXT,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  monthly_salary NUMERIC NOT NULL DEFAULT 0,
  benefits_cost NUMERIC NOT NULL DEFAULT 0,
  other_costs NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC GENERATED ALWAYS AS (monthly_salary + benefits_cost + other_costs) STORED,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by_user_id UUID REFERENCES public.profiles(id)
);

-- Create role cost defaults table
CREATE TABLE public.role_cost_defaults (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_type TEXT NOT NULL UNIQUE CHECK (role_type IN ('COORDENADOR', 'GESTOR_TRAFEGO', 'DESIGN', 'EDITOR_VIDEO', 'ROTEIRISTA')),
  default_salary NUMERIC NOT NULL DEFAULT 0,
  default_benefits NUMERIC NOT NULL DEFAULT 0,
  default_other NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by_user_id UUID REFERENCES public.profiles(id)
);

-- Insert default role costs
INSERT INTO public.role_cost_defaults (role_type, default_salary, default_benefits, default_other) VALUES
  ('COORDENADOR', 5000, 500, 200),
  ('GESTOR_TRAFEGO', 3500, 350, 150),
  ('DESIGN', 2800, 280, 100),
  ('EDITOR_VIDEO', 2500, 250, 100),
  ('ROTEIRISTA', 2200, 220, 80);

-- Enable RLS
ALTER TABLE public.team_member_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_cost_defaults ENABLE ROW LEVEL SECURITY;

-- RLS policies for team_member_costs (admin only)
CREATE POLICY "Admin can view team member costs"
  ON public.team_member_costs
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can insert team member costs"
  ON public.team_member_costs
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update team member costs"
  ON public.team_member_costs
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete team member costs"
  ON public.team_member_costs
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for role_cost_defaults (admin only)
CREATE POLICY "Admin can view role cost defaults"
  ON public.role_cost_defaults
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update role cost defaults"
  ON public.role_cost_defaults
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
CREATE TRIGGER update_team_member_costs_updated_at
  BEFORE UPDATE ON public.team_member_costs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_role_cost_defaults_updated_at
  BEFORE UPDATE ON public.role_cost_defaults
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();