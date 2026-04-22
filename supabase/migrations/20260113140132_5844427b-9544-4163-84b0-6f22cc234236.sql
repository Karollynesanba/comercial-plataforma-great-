-- ==============================================
-- EXECUÇÕES MODULE: Kanban Boards by Sector
-- ==============================================

-- 1) ExecBoard: Quadros por setor
CREATE TABLE public.exec_boards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sector TEXT NOT NULL CHECK (sector IN ('TRAFEGO', 'ATENDIMENTO', 'MARKETING_DIGITAL', 'GERAL')),
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  team_scope TEXT NOT NULL DEFAULT 'EQUIPE' CHECK (team_scope IN ('GLOBAL', 'EQUIPE')),
  team_id UUID REFERENCES public.teams(id),
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) ExecColumn: Colunas dentro dos quadros
CREATE TABLE public.exec_columns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES public.exec_boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  wip_limit INTEGER,
  color_tag TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) ExecCard: Cards/Tarefas
CREATE TABLE public.exec_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES public.exec_boards(id) ON DELETE CASCADE,
  column_id UUID NOT NULL REFERENCES public.exec_columns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  client_id UUID REFERENCES public.operational_clients(id),
  assigned_to_user_id UUID,
  watchers JSONB DEFAULT '[]'::jsonb,
  priority TEXT NOT NULL DEFAULT 'MEDIA' CHECK (priority IN ('BAIXA', 'MEDIA', 'ALTA', 'URGENTE')),
  due_date DATE,
  tags JSONB DEFAULT '[]'::jsonb,
  checklist JSONB DEFAULT '[]'::jsonb,
  attachments JSONB DEFAULT '[]'::jsonb,
  cover_image TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- 4) ExecComment: Comentários nos cards
CREATE TABLE public.exec_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES public.exec_cards(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5) ExecView: Views salvas (filtros/ordenação por usuário)
CREATE TABLE public.exec_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES public.exec_boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort JSONB,
  group_by TEXT NOT NULL DEFAULT 'column',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exec_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exec_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exec_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exec_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exec_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for exec_boards
CREATE POLICY "Exec boards viewable by authenticated users"
  ON public.exec_boards FOR SELECT
  USING (true);

CREATE POLICY "Exec boards insertable by authenticated users"
  ON public.exec_boards FOR INSERT
  WITH CHECK (created_by_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR is_coordinator(auth.uid()));

CREATE POLICY "Exec boards updatable by creator or coordinator or admin"
  ON public.exec_boards FOR UPDATE
  USING (created_by_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR is_coordinator(auth.uid()));

CREATE POLICY "Exec boards deletable by creator or coordinator or admin"
  ON public.exec_boards FOR DELETE
  USING (created_by_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR is_coordinator(auth.uid()));

-- RLS Policies for exec_columns
CREATE POLICY "Exec columns viewable by authenticated users"
  ON public.exec_columns FOR SELECT
  USING (true);

CREATE POLICY "Exec columns insertable by authenticated users"
  ON public.exec_columns FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Exec columns updatable by authenticated users"
  ON public.exec_columns FOR UPDATE
  USING (true);

CREATE POLICY "Exec columns deletable by coordinator or admin"
  ON public.exec_columns FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_coordinator(auth.uid()));

-- RLS Policies for exec_cards
CREATE POLICY "Exec cards viewable by authenticated users"
  ON public.exec_cards FOR SELECT
  USING (true);

CREATE POLICY "Exec cards insertable by authenticated users"
  ON public.exec_cards FOR INSERT
  WITH CHECK (created_by_user_id = auth.uid());

CREATE POLICY "Exec cards updatable by assignee or creator or coordinator or admin"
  ON public.exec_cards FOR UPDATE
  USING (assigned_to_user_id = auth.uid() OR created_by_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR is_coordinator(auth.uid()));

CREATE POLICY "Exec cards deletable by creator or coordinator or admin"
  ON public.exec_cards FOR DELETE
  USING (created_by_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR is_coordinator(auth.uid()));

-- RLS Policies for exec_comments
CREATE POLICY "Exec comments viewable by authenticated users"
  ON public.exec_comments FOR SELECT
  USING (true);

CREATE POLICY "Exec comments insertable by authenticated users"
  ON public.exec_comments FOR INSERT
  WITH CHECK (author_user_id = auth.uid());

CREATE POLICY "Exec comments updatable by author"
  ON public.exec_comments FOR UPDATE
  USING (author_user_id = auth.uid());

CREATE POLICY "Exec comments deletable by author or admin"
  ON public.exec_comments FOR DELETE
  USING (author_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for exec_views
CREATE POLICY "Exec views viewable by owner"
  ON public.exec_views FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Exec views insertable by owner"
  ON public.exec_views FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Exec views updatable by owner"
  ON public.exec_views FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Exec views deletable by owner"
  ON public.exec_views FOR DELETE
  USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX idx_exec_boards_sector ON public.exec_boards(sector);
CREATE INDEX idx_exec_columns_board ON public.exec_columns(board_id);
CREATE INDEX idx_exec_cards_board ON public.exec_cards(board_id);
CREATE INDEX idx_exec_cards_column ON public.exec_cards(column_id);
CREATE INDEX idx_exec_cards_assigned ON public.exec_cards(assigned_to_user_id);
CREATE INDEX idx_exec_comments_card ON public.exec_comments(card_id);
CREATE INDEX idx_exec_views_board ON public.exec_views(board_id);

-- Triggers for updated_at
CREATE TRIGGER update_exec_boards_updated_at
  BEFORE UPDATE ON public.exec_boards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exec_cards_updated_at
  BEFORE UPDATE ON public.exec_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();