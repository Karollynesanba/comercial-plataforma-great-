-- Consolidated commercial database contract.
-- CRM/pipeline is the single source of truth; agenda and scheduling control are projections.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.pipeline_clients
  ADD COLUMN IF NOT EXISTS faturamento_personalizado TEXT,
  ADD COLUMN IF NOT EXISTS pode_investir TEXT,
  ADD COLUMN IF NOT EXISTS tem_secretaria TEXT,
  ADD COLUMN IF NOT EXISTS salao_ou_clinica TEXT,
  ADD COLUMN IF NOT EXISTS agendado_via TEXT,
  ADD COLUMN IF NOT EXISTS is_mrr BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mrr_entrada NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mrr_remaining NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS followup_done BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.agenda_events
  ADD COLUMN IF NOT EXISTS pipeline_client_id UUID,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS team_id TEXT;

ALTER TABLE public.agendamento_leads
  ADD COLUMN IF NOT EXISTS pipeline_client_id UUID,
  ADD COLUMN IF NOT EXISTS horario_especifico TEXT,
  ADD COLUMN IF NOT EXISTS tem_secretaria TEXT,
  ADD COLUMN IF NOT EXISTS salao_ou_clinica TEXT,
  ADD COLUMN IF NOT EXISTS pode_investir TEXT,
  ADD COLUMN IF NOT EXISTS agendado_via TEXT;

ALTER TABLE public.commercial_settings
  ALTER COLUMN updated_by_user_id DROP NOT NULL;

DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  FOR constraint_record IN
    SELECT conrelid::regclass AS table_name, conname
    FROM pg_constraint
    WHERE conrelid IN (
      'public.agenda_events'::regclass,
      'public.agendamento_leads'::regclass,
      'public.commercial_settings'::regclass
    )
    AND contype IN ('f', 'c')
    AND (
      conname ILIKE '%created_by_user_id%' OR
      conname ILIKE '%updated_by_user_id%' OR
      conname ILIKE '%faturamento%' OR
      conname ILIKE '%salao%' OR
      conname ILIKE '%horario%'
    )
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', constraint_record.table_name, constraint_record.conname);
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS agenda_events_pipeline_client_id_key
  ON public.agenda_events (pipeline_client_id)
  WHERE pipeline_client_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS agendamento_leads_pipeline_client_id_key
  ON public.agendamento_leads (pipeline_client_id)
  WHERE pipeline_client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS pipeline_clients_stage_idx ON public.pipeline_clients (stage);
CREATE INDEX IF NOT EXISTS pipeline_clients_meeting_idx ON public.pipeline_clients (meeting_date, meeting_time);
CREATE INDEX IF NOT EXISTS pipeline_clients_closer_idx ON public.pipeline_clients (vendedor);
CREATE INDEX IF NOT EXISTS pipeline_clients_agendador_idx ON public.pipeline_clients (agendado_por);
CREATE INDEX IF NOT EXISTS pipeline_clients_criativo_idx ON public.pipeline_clients (criativo);
CREATE INDEX IF NOT EXISTS pipeline_clients_area_idx ON public.pipeline_clients (salao_ou_clinica);

CREATE OR REPLACE FUNCTION public.commercial_stage_to_agendamento_status(stage_value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE COALESCE(stage_value, 'NOVO')
    WHEN 'NO_SHOW' THEN 'NO_SHOW'
    WHEN 'TAXA_INTERESSE' THEN 'TAXA_INTERESSE'
    WHEN 'NEGOCIACAO' THEN 'NEGOCIACAO'
    WHEN 'PERDIDO' THEN 'PERDIDO'
    WHEN 'FECHADO' THEN 'FECHADO'
    ELSE 'NOVO_LEAD'
  END;
$$;

CREATE OR REPLACE FUNCTION public.commercial_time_to_period(time_value TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  parsed_hour INTEGER;
BEGIN
  IF time_value IS NULL OR trim(time_value) = '' THEN
    RETURN 'MANHA';
  END IF;

  parsed_hour := split_part(time_value, ':', 1)::INTEGER;

  IF parsed_hour < 12 THEN
    RETURN 'MANHA';
  ELSIF parsed_hour < 18 THEN
    RETURN 'TARDE';
  END IF;

  RETURN 'NOITE';
EXCEPTION WHEN OTHERS THEN
  RETURN 'MANHA';
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_pipeline_client_to_agenda()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_date DATE;
  event_time TIME;
  normalized_phone TEXT;
  agenda_color TEXT;
BEGIN
  event_date := COALESCE(NULLIF(trim(NEW.meeting_date), ''), to_char(COALESCE(NEW.created_at, now()), 'YYYY-MM-DD'))::DATE;
  event_time := COALESCE(NULLIF(trim(NEW.meeting_time), ''), '09:00')::TIME;
  normalized_phone := regexp_replace(COALESCE(NEW.telefone, ''), '\D', '', 'g');
  agenda_color := CASE
    WHEN NEW.stage IN ('NO_SHOW', 'PERDIDO') THEN '#FF0000'
    WHEN NEW.stage IN ('TAXA_INTERESSE', 'NEGOCIACAO', 'FECHADO') THEN '#66FF00'
    ELSE '#3B82F6'
  END;

  INSERT INTO public.agenda_events (
    pipeline_client_id,
    title,
    description,
    notes,
    client_name,
    client_phone,
    event_date,
    event_time,
    duration_minutes,
    meeting_link,
    color,
    reminder_2h_sent,
    reminder_30min_sent,
    created_by_user_id,
    team_id,
    updated_at
  )
  VALUES (
    NEW.id,
    'Reuniao com ' || COALESCE(NULLIF(NEW.client_name, ''), 'Lead sem nome'),
    'Lead do Pipeline - ' || COALESCE(NULLIF(NEW.criativo, ''), 'NAO IDENTIFICADO'),
    NEW.notes,
    NEW.client_name,
    normalized_phone,
    event_date,
    event_time,
    60,
    NULL,
    agenda_color,
    false,
    false,
    NULL,
    NEW.equipe,
    now()
  )
  ON CONFLICT (pipeline_client_id)
  WHERE pipeline_client_id IS NOT NULL
  DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    notes = EXCLUDED.notes,
    client_name = EXCLUDED.client_name,
    client_phone = EXCLUDED.client_phone,
    event_date = EXCLUDED.event_date,
    event_time = EXCLUDED.event_time,
    color = EXCLUDED.color,
    team_id = EXCLUDED.team_id,
    updated_at = now();

  INSERT INTO public.agendamento_leads (
    pipeline_client_id,
    data,
    nome,
    telefone,
    horario,
    horario_especifico,
    tem_socio,
    tem_mkt,
    tem_secretaria,
    salao_ou_clinica,
    faturamento,
    pode_investir,
    agendado_via,
    funil,
    status,
    created_by_user_id,
    updated_at
  )
  VALUES (
    NEW.id,
    to_char(event_date, 'DD/MM/YYYY'),
    NEW.client_name,
    normalized_phone,
    public.commercial_time_to_period(NEW.meeting_time),
    substring(NEW.meeting_time from 1 for 5),
    COALESCE(NULLIF(NEW.tem_socio, ''), 'NAO'),
    COALESCE(NULLIF(NEW.tem_mkt, ''), 'NAO'),
    COALESCE(NULLIF(NEW.tem_secretaria, ''), 'NAO'),
    COALESCE(NULLIF(NEW.salao_ou_clinica, ''), 'NAO_INFORMADO'),
    COALESCE(NULLIF(NEW.faturamento, ''), 'NAO_INFORMADO'),
    NEW.pode_investir,
    NEW.agendado_via,
    COALESCE(NULLIF(NEW.criativo, ''), 'NAO IDENTIFICADO'),
    public.commercial_stage_to_agendamento_status(NEW.stage),
    NEW.created_by_user_id,
    now()
  )
  ON CONFLICT (pipeline_client_id)
  WHERE pipeline_client_id IS NOT NULL
  DO UPDATE SET
    data = EXCLUDED.data,
    nome = EXCLUDED.nome,
    telefone = EXCLUDED.telefone,
    horario = EXCLUDED.horario,
    horario_especifico = EXCLUDED.horario_especifico,
    tem_socio = EXCLUDED.tem_socio,
    tem_mkt = EXCLUDED.tem_mkt,
    tem_secretaria = EXCLUDED.tem_secretaria,
    salao_ou_clinica = EXCLUDED.salao_ou_clinica,
    faturamento = EXCLUDED.faturamento,
    pode_investir = EXCLUDED.pode_investir,
    agendado_via = EXCLUDED.agendado_via,
    funil = EXCLUDED.funil,
    status = EXCLUDED.status,
    updated_at = now();

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_pipeline_client_projections()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.agenda_events WHERE pipeline_client_id = OLD.id;
  DELETE FROM public.agendamento_leads WHERE pipeline_client_id = OLD.id;
  RETURN OLD;
END;
$$;

-- Replace older partial sync triggers so CRM is the only source of truth.
DROP TRIGGER IF EXISTS trg_sync_agendamento_status_from_pipeline ON public.pipeline_clients;
DROP TRIGGER IF EXISTS trg_sync_pipeline_client_to_agenda ON public.pipeline_clients;
CREATE TRIGGER trg_sync_pipeline_client_to_agenda
AFTER INSERT OR UPDATE OF
  client_name,
  clinic_name,
  telefone,
  vendedor,
  criativo,
  equipe,
  faturamento,
  pode_investir,
  stage,
  notes,
  agendado_por,
  agendado_via,
  tem_socio,
  tem_mkt,
  tem_secretaria,
  salao_ou_clinica,
  meeting_date,
  meeting_time
ON public.pipeline_clients
FOR EACH ROW
EXECUTE FUNCTION public.sync_pipeline_client_to_agenda();

DROP TRIGGER IF EXISTS trg_cleanup_pipeline_client_projections ON public.pipeline_clients;
CREATE TRIGGER trg_cleanup_pipeline_client_projections
AFTER DELETE ON public.pipeline_clients
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_pipeline_client_projections();

DROP POLICY IF EXISTS "Admin can manage goals" ON public.commercial_goals;
DROP POLICY IF EXISTS "Coordinators can update commercial goals" ON public.commercial_goals;
DROP POLICY IF EXISTS "Coordinators can insert commercial goals" ON public.commercial_goals;
DROP POLICY IF EXISTS "Authenticated users can manage commercial goals" ON public.commercial_goals;
CREATE POLICY "Authenticated users can manage commercial goals"
ON public.commercial_goals
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Admin can manage SDR goals" ON public.sdr_goals;
DROP POLICY IF EXISTS "Coordinators can update sdr_goals" ON public.sdr_goals;
DROP POLICY IF EXISTS "Coordinators can insert sdr_goals" ON public.sdr_goals;
DROP POLICY IF EXISTS "Authenticated users can manage SDR goals" ON public.sdr_goals;
CREATE POLICY "Authenticated users can manage SDR goals"
ON public.sdr_goals
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can insert commercial_settings" ON public.commercial_settings;
DROP POLICY IF EXISTS "Authenticated users can update commercial_settings" ON public.commercial_settings;
DROP POLICY IF EXISTS "Authenticated users can manage commercial settings" ON public.commercial_settings;
CREATE POLICY "Authenticated users can manage commercial settings"
ON public.commercial_settings
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'commercial_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.commercial_settings;
  END IF;
END $$;

-- Backfill projections for existing CRM cards.
UPDATE public.pipeline_clients
SET updated_at = now()
WHERE meeting_date IS NOT NULL
  AND meeting_time IS NOT NULL;
