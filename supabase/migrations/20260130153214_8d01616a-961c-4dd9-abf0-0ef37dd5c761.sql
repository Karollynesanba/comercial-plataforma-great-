-- STRATEGIC TASKS MODULE --

-- Create strategic goal enum type
CREATE TYPE public.strategic_goal AS ENUM (
  'CRESCIMENTO',
  'RECEITA', 
  'PRODUTO',
  'OPERACAO',
  'SUPORTE',
  'NENHUM'
);

-- Create task status enum
CREATE TYPE public.strategic_task_status AS ENUM (
  'BACKLOG',
  'TODO',
  'EM_ANDAMENTO',
  'EM_REVISAO',
  'CONCLUIDO',
  'BLOQUEADO',
  'CANCELADO'
);

-- Create strategic tasks table
CREATE TABLE public.strategic_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic info
  title TEXT NOT NULL,
  description TEXT,
  code TEXT UNIQUE, -- AUTO: TASK-000001
  
  -- Strategic classification
  strategic_goal strategic_goal NOT NULL DEFAULT 'NENHUM',
  status strategic_task_status NOT NULL DEFAULT 'BACKLOG',
  
  -- Impact scoring (0-10 each)
  impact_revenue INTEGER DEFAULT 0 CHECK (impact_revenue >= 0 AND impact_revenue <= 10),
  impact_operational INTEGER DEFAULT 0 CHECK (impact_operational >= 0 AND impact_operational <= 10),
  urgency INTEGER DEFAULT 0 CHECK (urgency >= 0 AND urgency <= 10),
  effort_estimate INTEGER DEFAULT 5 CHECK (effort_estimate >= 1 AND effort_estimate <= 10),
  
  -- Computed impact score (calculated via trigger)
  impact_score NUMERIC(4,1) DEFAULT 0,
  
  -- Delay cost
  delay_cost_financial NUMERIC DEFAULT 0,
  delay_cost_project_impact TEXT,
  delay_cost_deadline_impact TEXT,
  
  -- Relationships
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Dates
  due_date DATE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Ghost task detection
  status_changes_count INTEGER DEFAULT 0,
  last_status_change TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  tags JSONB DEFAULT '[]'::jsonb,
  order_index INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create sequence for task codes
CREATE SEQUENCE IF NOT EXISTS strategic_task_code_seq START 1;

-- Create function to generate task code
CREATE OR REPLACE FUNCTION public.generate_strategic_task_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.code IS NULL THEN
    NEW.code := 'TASK-' || LPAD(nextval('strategic_task_code_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for task code generation
CREATE TRIGGER generate_strategic_task_code_trigger
  BEFORE INSERT ON public.strategic_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_strategic_task_code();

-- Create function to calculate impact score
-- Formula: ((impact_revenue * 2) + (impact_operational * 1.5) + (urgency * 1.5)) / (effort_estimate * 0.5)
CREATE OR REPLACE FUNCTION public.calculate_impact_score()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  score NUMERIC;
BEGIN
  -- Avoid division by zero
  IF NEW.effort_estimate = 0 OR NEW.effort_estimate IS NULL THEN
    NEW.effort_estimate := 5;
  END IF;
  
  score := (
    (COALESCE(NEW.impact_revenue, 0) * 2.0) + 
    (COALESCE(NEW.impact_operational, 0) * 1.5) + 
    (COALESCE(NEW.urgency, 0) * 1.5)
  ) / (NEW.effort_estimate * 0.5);
  
  -- Cap at 10
  NEW.impact_score := LEAST(score, 10.0);
  
  RETURN NEW;
END;
$$;

-- Create trigger for impact score calculation
CREATE TRIGGER calculate_impact_score_trigger
  BEFORE INSERT OR UPDATE OF impact_revenue, impact_operational, urgency, effort_estimate
  ON public.strategic_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_impact_score();

-- Create function to track status changes (ghost task detection)
CREATE OR REPLACE FUNCTION public.track_task_status_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.status_changes_count := COALESCE(OLD.status_changes_count, 0) + 1;
    NEW.last_status_change := now();
    
    -- Track started_at
    IF NEW.status = 'EM_ANDAMENTO' AND OLD.status IN ('BACKLOG', 'TODO') THEN
      NEW.started_at := now();
    END IF;
    
    -- Track completed_at
    IF NEW.status = 'CONCLUIDO' THEN
      NEW.completed_at := now();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for status change tracking
CREATE TRIGGER track_task_status_changes_trigger
  BEFORE UPDATE ON public.strategic_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.track_task_status_changes();

-- Create updated_at trigger
CREATE TRIGGER update_strategic_tasks_updated_at
  BEFORE UPDATE ON public.strategic_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.strategic_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ADMIN and EQUIPE_TECH access
CREATE POLICY "Strategic tasks viewable by admin or tech team"
  ON public.strategic_tasks
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND operational_role = 'EQUIPE_TECH'
    )
  );

CREATE POLICY "Strategic tasks insertable by admin or tech team"
  ON public.strategic_tasks
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND operational_role = 'EQUIPE_TECH'
    )
  );

CREATE POLICY "Strategic tasks updatable by admin or tech team"
  ON public.strategic_tasks
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND operational_role = 'EQUIPE_TECH'
    )
  );

CREATE POLICY "Strategic tasks deletable by admin or tech team"
  ON public.strategic_tasks
  FOR DELETE
  USING (
    has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND operational_role = 'EQUIPE_TECH'
    )
  );

-- Enable realtime for strategic_tasks
ALTER PUBLICATION supabase_realtime ADD TABLE public.strategic_tasks;

-- DECISIONS HISTORY TABLE --
CREATE TABLE public.strategic_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  title TEXT NOT NULL,
  decision TEXT NOT NULL,
  reason TEXT,
  expected_impact TEXT,
  
  -- Related entities
  affected_project_ids UUID[] DEFAULT '{}',
  affected_task_ids UUID[] DEFAULT '{}',
  
  -- Metadata
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.strategic_decisions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for decisions
CREATE POLICY "Strategic decisions viewable by admin or tech team"
  ON public.strategic_decisions
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND operational_role = 'EQUIPE_TECH'
    )
  );

CREATE POLICY "Strategic decisions insertable by admin or tech team"
  ON public.strategic_decisions
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND operational_role = 'EQUIPE_TECH'
    )
  );

CREATE POLICY "Strategic decisions updatable by admin or tech team"
  ON public.strategic_decisions
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND operational_role = 'EQUIPE_TECH'
    )
  );

CREATE POLICY "Strategic decisions deletable by admin or tech team"
  ON public.strategic_decisions
  FOR DELETE
  USING (
    has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND operational_role = 'EQUIPE_TECH'
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.strategic_decisions;