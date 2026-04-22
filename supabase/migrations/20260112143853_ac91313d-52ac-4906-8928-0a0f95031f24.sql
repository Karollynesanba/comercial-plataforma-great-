-- Create operational roles enum
CREATE TYPE public.operational_role AS ENUM ('COORDENADOR_RED', 'GESTOR', 'ATENDENTE', 'DESIGN', 'EDITOR_VIDEO');

-- Add operational_role to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS operational_role public.operational_role NULL;

-- Create teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teams are viewable by authenticated users"
ON public.teams FOR SELECT
TO authenticated
USING (true);

-- Create operational_clients table
CREATE TABLE public.operational_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commercial_id TEXT NULL,
  client_name TEXT NOT NULL,
  clinic_name TEXT NULL,
  plan TEXT CHECK (plan IN ('MENSAL', 'TRIMESTRAL', 'SEMESTRAL')) NULL,
  deal_value NUMERIC(12,2) DEFAULT 0,
  creative_source TEXT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  assigned_gestor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_atendente_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_design_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_editor_video_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status_operacional TEXT NOT NULL DEFAULT 'NOVO_CLIENTE' CHECK (status_operacional IN ('NOVO_CLIENTE', 'ONBOARDING', 'ATIVO', 'PAUSADO', 'ENCERRADO')),
  stage_trafego TEXT DEFAULT 'NAO_INICIADO' CHECK (stage_trafego IN ('NAO_INICIADO', 'EM_ANDAMENTO', 'OK', 'BLOQUEADO')),
  stage_atendimento TEXT DEFAULT 'NAO_INICIADO' CHECK (stage_atendimento IN ('NAO_INICIADO', 'EM_ANDAMENTO', 'OK', 'BLOQUEADO')),
  stage_marketing TEXT DEFAULT 'NAO_INICIADO' CHECK (stage_marketing IN ('NAO_INICIADO', 'EM_ANDAMENTO', 'OK', 'BLOQUEADO')),
  onboarding_start_at TIMESTAMPTZ NULL,
  onboarding_done_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.operational_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operational clients viewable by authenticated users"
ON public.operational_clients FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Operational clients insertable by authenticated users"
ON public.operational_clients FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Operational clients updatable by authenticated users"
ON public.operational_clients FOR UPDATE
TO authenticated
USING (true);

-- Create work_items table (tasks, epics, projects)
CREATE TABLE public.work_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'TASK' CHECK (type IN ('TASK', 'EPIC', 'PROJECT')),
  title TEXT NOT NULL,
  description TEXT NULL,
  status TEXT NOT NULL DEFAULT 'BACKLOG' CHECK (status IN ('BACKLOG', 'DOING', 'REVIEW', 'BLOCKED', 'DONE')),
  priority TEXT NOT NULL DEFAULT 'MEDIA' CHECK (priority IN ('BAIXA', 'MEDIA', 'ALTA', 'URGENTE')),
  due_date DATE NULL,
  assignee_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reporter_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  related_client_id UUID REFERENCES public.operational_clients(id) ON DELETE SET NULL,
  tags JSONB NULL,
  estimate_points INTEGER NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.work_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Work items viewable by authenticated users"
ON public.work_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Work items insertable by authenticated users"
ON public.work_items FOR INSERT
TO authenticated
WITH CHECK (reporter_user_id = auth.uid());

CREATE POLICY "Work items updatable by authenticated users"
ON public.work_items FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Work items deletable by owner or admin"
ON public.work_items FOR DELETE
TO authenticated
USING (reporter_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Create my_day_items table
CREATE TABLE public.my_day_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT NOT NULL DEFAULT 'MANUAL' CHECK (source IN ('WORKITEM', 'MEETING', 'MANUAL')),
  source_id UUID NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO')),
  priority TEXT NOT NULL DEFAULT 'MEDIA' CHECK (priority IN ('BAIXA', 'MEDIA', 'ALTA')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.my_day_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own my_day_items"
ON public.my_day_items FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own my_day_items"
ON public.my_day_items FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own my_day_items"
ON public.my_day_items FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own my_day_items"
ON public.my_day_items FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Create meetings table
CREATE TABLE public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL DEFAULT 'GERAL' CHECK (scope IN ('GERAL', 'EQUIPE')),
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  agenda TEXT NULL,
  datetime_start TIMESTAMPTZ NOT NULL,
  datetime_end TIMESTAMPTZ NOT NULL,
  created_by_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  participants JSONB NULL,
  notes TEXT NULL,
  recording_link TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Meetings viewable by authenticated users"
ON public.meetings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Meetings insertable by authenticated users"
ON public.meetings FOR INSERT
TO authenticated
WITH CHECK (created_by_user_id = auth.uid());

CREATE POLICY "Meetings updatable by creator"
ON public.meetings FOR UPDATE
TO authenticated
USING (created_by_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Create workspaces table (for ClickUp-style organization)
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'SPACE' CHECK (type IN ('SPACE', 'FOLDER', 'LIST')),
  created_by_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspaces viewable by authenticated users"
ON public.workspaces FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Workspaces insertable by authenticated users"
ON public.workspaces FOR INSERT
TO authenticated
WITH CHECK (created_by_user_id = auth.uid());

CREATE POLICY "Workspaces updatable by creator or admin"
ON public.workspaces FOR UPDATE
TO authenticated
USING (created_by_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Add workspace_id to work_items
ALTER TABLE public.work_items ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- Create updated_at triggers
CREATE TRIGGER update_teams_updated_at
BEFORE UPDATE ON public.teams
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_operational_clients_updated_at
BEFORE UPDATE ON public.operational_clients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_work_items_updated_at
BEFORE UPDATE ON public.work_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_my_day_items_updated_at
BEFORE UPDATE ON public.my_day_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meetings_updated_at
BEFORE UPDATE ON public.meetings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workspaces_updated_at
BEFORE UPDATE ON public.workspaces
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default teams
INSERT INTO public.teams (name) VALUES ('Tropa de Elite'), ('Equipe 7');