
-- ===========================================
-- PROJECTS ERP MODULE - DATABASE SCHEMA
-- ===========================================

-- Sequence for project codes
CREATE SEQUENCE IF NOT EXISTS project_code_seq START 1;

-- Main Projects Table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  client_id UUID REFERENCES public.operational_clients(id) ON DELETE SET NULL,
  team TEXT CHECK (team IN ('TIME_7', 'TROPA_DE_ELITE')),
  owner_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'PLANEJADO' CHECK (status IN ('PLANEJADO', 'EM_ANDAMENTO', 'EM_RISCO', 'PAUSADO', 'CONCLUIDO', 'CANCELADO')),
  priority TEXT DEFAULT 'MEDIA' CHECK (priority IN ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA')),
  start_date DATE,
  due_date DATE,
  progress_pct INTEGER DEFAULT 0 CHECK (progress_pct >= 0 AND progress_pct <= 100),
  description TEXT,
  budget_planned NUMERIC(12,2),
  budget_used NUMERIC(12,2) DEFAULT 0,
  roi_expected NUMERIC(12,2),
  risks_count INTEGER DEFAULT 0,
  blockers_count INTEGER DEFAULT 0,
  created_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Project Phases Table
CREATE TABLE public.project_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "order" INTEGER DEFAULT 0,
  status TEXT DEFAULT 'NAO_INICIADA' CHECK (status IN ('NAO_INICIADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'BLOQUEADA')),
  start_date DATE,
  due_date DATE,
  progress_pct INTEGER DEFAULT 0 CHECK (progress_pct >= 0 AND progress_pct <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Project Milestones Table
CREATE TABLE public.project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES public.project_phases(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  target_date DATE,
  status TEXT DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'ATINGIDO', 'ATRASADO')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Project Deliverables Table
CREATE TABLE public.project_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES public.project_phases(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'OUTRO' CHECK (type IN ('DOC', 'DESIGN', 'VIDEO', 'ROTEIRO', 'CAMPANHA', 'RELATORIO', 'SISTEMA', 'OUTRO')),
  status TEXT DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'EM_PRODUCAO', 'EM_REVISAO', 'APROVADO', 'ENTREGUE')),
  assigned_to_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  client_approval_required BOOLEAN DEFAULT false,
  attachments JSONB,
  linked_exec_card_id UUID REFERENCES public.exec_cards(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Project Risks Table
CREATE TABLE public.project_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  severity TEXT DEFAULT 'MEDIA' CHECK (severity IN ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA')),
  probability TEXT DEFAULT 'MEDIA' CHECK (probability IN ('BAIXA', 'MEDIA', 'ALTA')),
  status TEXT DEFAULT 'ABERTO' CHECK (status IN ('ABERTO', 'MITIGANDO', 'RESOLVIDO')),
  owner_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  mitigation_plan TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Project Updates Table
CREATE TABLE public.project_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'NOTE' CHECK (type IN ('CHECKIN', 'STATUS_CHANGE', 'NOTE', 'DECISION')),
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ===========================================
-- TRIGGERS FOR AUTO-GENERATION & TIMESTAMPS
-- ===========================================

-- Function to generate project code
CREATE OR REPLACE FUNCTION generate_project_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL THEN
    NEW.code := 'PRJ-' || LPAD(nextval('project_code_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate project code
CREATE TRIGGER trigger_generate_project_code
  BEFORE INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION generate_project_code();

-- Trigger for updated_at on projects
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on project_phases
CREATE TRIGGER update_project_phases_updated_at
  BEFORE UPDATE ON public.project_phases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on project_milestones
CREATE TRIGGER update_project_milestones_updated_at
  BEFORE UPDATE ON public.project_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on project_deliverables
CREATE TRIGGER update_project_deliverables_updated_at
  BEFORE UPDATE ON public.project_deliverables
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on project_risks
CREATE TRIGGER update_project_risks_updated_at
  BEFORE UPDATE ON public.project_risks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_updates ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Authenticated users can view projects"
  ON public.projects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create projects"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update projects"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete projects"
  ON public.projects FOR DELETE
  TO authenticated
  USING (true);

-- Project phases policies
CREATE POLICY "Authenticated users can view project_phases"
  ON public.project_phases FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create project_phases"
  ON public.project_phases FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update project_phases"
  ON public.project_phases FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete project_phases"
  ON public.project_phases FOR DELETE
  TO authenticated
  USING (true);

-- Project milestones policies
CREATE POLICY "Authenticated users can view project_milestones"
  ON public.project_milestones FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create project_milestones"
  ON public.project_milestones FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update project_milestones"
  ON public.project_milestones FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete project_milestones"
  ON public.project_milestones FOR DELETE
  TO authenticated
  USING (true);

-- Project deliverables policies
CREATE POLICY "Authenticated users can view project_deliverables"
  ON public.project_deliverables FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create project_deliverables"
  ON public.project_deliverables FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update project_deliverables"
  ON public.project_deliverables FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete project_deliverables"
  ON public.project_deliverables FOR DELETE
  TO authenticated
  USING (true);

-- Project risks policies
CREATE POLICY "Authenticated users can view project_risks"
  ON public.project_risks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create project_risks"
  ON public.project_risks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update project_risks"
  ON public.project_risks FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete project_risks"
  ON public.project_risks FOR DELETE
  TO authenticated
  USING (true);

-- Project updates policies
CREATE POLICY "Authenticated users can view project_updates"
  ON public.project_updates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create project_updates"
  ON public.project_updates FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ===========================================
-- ENABLE REALTIME
-- ===========================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_phases;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_deliverables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_risks;

-- ===========================================
-- INDEXES FOR PERFORMANCE
-- ===========================================

CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_team ON public.projects(team);
CREATE INDEX idx_projects_owner ON public.projects(owner_user_id);
CREATE INDEX idx_projects_client ON public.projects(client_id);
CREATE INDEX idx_project_phases_project ON public.project_phases(project_id);
CREATE INDEX idx_project_deliverables_project ON public.project_deliverables(project_id);
CREATE INDEX idx_project_risks_project ON public.project_risks(project_id);
CREATE INDEX idx_project_updates_project ON public.project_updates(project_id);
