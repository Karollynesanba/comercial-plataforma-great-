-- GreatGo CRM -> Agenda fix
-- Run this in the Supabase SQL editor.
-- It guarantees that every pipeline client with meeting_date + meeting_time
-- has exactly one linked row in agenda_events, and removes the agenda row
-- when the scheduling date is cleared or the lead is deleted.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.pipeline_clients
  ADD COLUMN IF NOT EXISTS meeting_date TEXT,
  ADD COLUMN IF NOT EXISTS meeting_time TEXT;

ALTER TABLE public.agenda_events
  ADD COLUMN IF NOT EXISTS pipeline_client_id UUID;

ALTER TABLE public.agendamento_leads
  ADD COLUMN IF NOT EXISTS pipeline_client_id UUID,
  ADD COLUMN IF NOT EXISTS agenda_event_id UUID,
  ADD COLUMN IF NOT EXISTS agenda_event_date TEXT,
  ADD COLUMN IF NOT EXISTS agenda_event_time TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS agenda_events_pipeline_client_id_key
  ON public.agenda_events (pipeline_client_id)
  WHERE pipeline_client_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS agendamento_leads_pipeline_client_id_key
  ON public.agendamento_leads (pipeline_client_id)
  WHERE pipeline_client_id IS NOT NULL;

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

CREATE OR REPLACE FUNCTION public.sync_pipeline_client_to_agenda_by_id(client_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pc RECORD;
  v_event_date DATE;
  v_event_time TIME;
  normalized_phone TEXT;
  agenda_color TEXT;
  default_title TEXT;
  v_agenda_event_id UUID;
  agenda_lead_id UUID;
  exact_slot_lead_id UUID;
BEGIN
  SELECT *
  INTO pc
  FROM public.pipeline_clients
  WHERE id = client_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  normalized_phone := regexp_replace(COALESCE(pc.telefone, ''), '\D', '', 'g');
  default_title := 'Reuniao com ' || COALESCE(NULLIF(pc.client_name, ''), 'Lead sem nome');

  IF NULLIF(btrim(COALESCE(pc.meeting_date, '')), '') IS NULL
     OR NULLIF(btrim(COALESCE(pc.meeting_time, '')), '') IS NULL THEN
    DELETE FROM public.agenda_events
    WHERE pipeline_client_id = pc.id;

    DELETE FROM public.agendamento_leads
    WHERE pipeline_client_id = pc.id;
    RETURN;
  END IF;

  v_event_date := COALESCE(
    NULLIF(trim(pc.meeting_date), '')::DATE,
    to_char(COALESCE(pc.created_at, now()), 'YYYY-MM-DD')::DATE
  );
  v_event_time := COALESCE(
    NULLIF(trim(pc.meeting_time), '')::TIME,
    '09:00'::TIME
  );
  agenda_color := CASE
    WHEN pc.stage IN ('NO_SHOW', 'PERDIDO') THEN '#FF0000'
    WHEN pc.stage IN ('TAXA_INTERESSE', 'NEGOCIACAO', 'FECHADO') THEN '#66FF00'
    ELSE '#3B82F6'
  END;

  SELECT ae.id
  INTO v_agenda_event_id
  FROM public.agenda_events ae
  WHERE ae.pipeline_client_id = pc.id
  LIMIT 1;

  IF v_agenda_event_id IS NOT NULL THEN
    UPDATE public.agenda_events
    SET
      title = default_title,
      description = 'Lead do Pipeline - ' || COALESCE(NULLIF(pc.criativo, ''), 'NAO IDENTIFICADO'),
      notes = pc.notes,
      client_name = pc.client_name,
      client_phone = normalized_phone,
      clinic_name = COALESCE(NULLIF(pc.clinic_name, ''), pc.client_name),
      scheduled_by = pc.agendado_por,
      lead_stage = pc.stage,
      creative_source = pc.criativo,
      event_date = v_event_date,
      event_time = v_event_time,
      duration_minutes = 60,
      meeting_link = NULL,
      color = agenda_color,
      reminder_2h_sent = false,
      reminder_30min_sent = false,
      created_by_user_id = pc.created_by_user_id,
      team_id = CASE
        WHEN pc.equipe = 'team-equipe-7' THEN 'ac2c282a-54a6-491e-b133-90890e2d299d'::uuid
        WHEN pc.equipe = 'team-tropa-de-elite' THEN '5090ad67-315d-45f5-b4b2-5a1a73ae201d'::uuid
        ELSE NULL
      END,
      updated_at = now()
    WHERE id = v_agenda_event_id;
  ELSE
    INSERT INTO public.agenda_events (
      pipeline_client_id,
      title,
      description,
      notes,
      client_name,
      client_phone,
      clinic_name,
      scheduled_by,
      lead_stage,
      creative_source,
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
      pc.id,
      default_title,
      'Lead do Pipeline - ' || COALESCE(NULLIF(pc.criativo, ''), 'NAO IDENTIFICADO'),
      pc.notes,
      pc.client_name,
      normalized_phone,
      COALESCE(NULLIF(pc.clinic_name, ''), pc.client_name),
      pc.agendado_por,
      pc.stage,
      pc.criativo,
      v_event_date,
      v_event_time,
      60,
      NULL,
      agenda_color,
      false,
      false,
      pc.created_by_user_id,
      CASE
        WHEN pc.equipe = 'team-equipe-7' THEN 'ac2c282a-54a6-491e-b133-90890e2d299d'::uuid
        WHEN pc.equipe = 'team-tropa-de-elite' THEN '5090ad67-315d-45f5-b4b2-5a1a73ae201d'::uuid
        ELSE NULL
      END,
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
      clinic_name = EXCLUDED.clinic_name,
      scheduled_by = EXCLUDED.scheduled_by,
      lead_stage = EXCLUDED.lead_stage,
      creative_source = EXCLUDED.creative_source,
      event_date = EXCLUDED.event_date,
      event_time = EXCLUDED.event_time,
      duration_minutes = EXCLUDED.duration_minutes,
      meeting_link = EXCLUDED.meeting_link,
      color = EXCLUDED.color,
      reminder_2h_sent = EXCLUDED.reminder_2h_sent,
      reminder_30min_sent = EXCLUDED.reminder_30min_sent,
      created_by_user_id = EXCLUDED.created_by_user_id,
      team_id = EXCLUDED.team_id,
      updated_at = now();
  END IF;

  SELECT ag.id
  INTO agenda_lead_id
  FROM public.agendamento_leads ag
  WHERE ag.pipeline_client_id = pc.id
  LIMIT 1;

  SELECT ag.id
  INTO exact_slot_lead_id
  FROM public.agendamento_leads ag
  WHERE regexp_replace(COALESCE(ag.telefone, ''), '\D', '', 'g') = normalized_phone
    AND COALESCE(ag.data, '') = to_char(v_event_date, 'DD/MM/YYYY')
    AND COALESCE(ag.horario_especifico, '') = LEFT(to_char(v_event_time, 'HH24:MI:SS'), 5)
  ORDER BY
    (ag.pipeline_client_id IS NOT NULL) DESC,
    ag.updated_at DESC,
    ag.created_at DESC,
    ag.id DESC
  LIMIT 1;

  IF exact_slot_lead_id IS NOT NULL THEN
    IF agenda_lead_id IS NOT NULL AND agenda_lead_id <> exact_slot_lead_id THEN
      DELETE FROM public.agendamento_leads
      WHERE id = agenda_lead_id;
    END IF;

    agenda_lead_id := exact_slot_lead_id;
  END IF;

  IF agenda_lead_id IS NOT NULL THEN
    DELETE FROM public.agendamento_leads
    WHERE id <> agenda_lead_id
      AND regexp_replace(COALESCE(telefone, ''), '\D', '', 'g') = normalized_phone
      AND COALESCE(data, '') = to_char(v_event_date, 'DD/MM/YYYY')
      AND COALESCE(horario_especifico, '') = LEFT(to_char(v_event_time, 'HH24:MI:SS'), 5);

    UPDATE public.agendamento_leads
    SET
      pipeline_client_id = pc.id,
      agenda_event_id = v_agenda_event_id,
      agenda_event_date = to_char(v_event_date, 'YYYY-MM-DD'),
      agenda_event_time = LEFT(to_char(v_event_time, 'HH24:MI:SS'), 5),
      data = to_char(v_event_date, 'DD/MM/YYYY'),
      nome = pc.client_name,
      telefone = normalized_phone,
      horario = public.commercial_time_to_period(pc.meeting_time),
      horario_especifico = LEFT(to_char(v_event_time, 'HH24:MI:SS'), 5),
      tem_socio = COALESCE(NULLIF(pc.tem_socio, ''), 'NAO'),
      tem_mkt = COALESCE(NULLIF(pc.tem_mkt, ''), 'NAO'),
      tem_secretaria = COALESCE(NULLIF(pc.tem_secretaria, ''), 'NAO_SEI'),
      salao_ou_clinica = COALESCE(NULLIF(pc.salao_ou_clinica, ''), 'NAO_INFORMADO'),
      faturamento = COALESCE(NULLIF(pc.faturamento, ''), 'NAO_INFORMADO'),
      pode_investir = pc.pode_investir,
      agendado_via = pc.agendado_via,
      funil = COALESCE(NULLIF(pc.criativo, ''), 'NAO IDENTIFICADO'),
      status = public.commercial_stage_to_agendamento_status(pc.stage),
      created_by_user_id = pc.created_by_user_id,
      updated_at = now()
    WHERE id = agenda_lead_id;
  ELSE
    DELETE FROM public.agendamento_leads
    WHERE regexp_replace(COALESCE(telefone, ''), '\D', '', 'g') = normalized_phone
      AND COALESCE(data, '') = to_char(v_event_date, 'DD/MM/YYYY')
      AND COALESCE(horario_especifico, '') = LEFT(to_char(v_event_time, 'HH24:MI:SS'), 5);

    INSERT INTO public.agendamento_leads (
      pipeline_client_id,
      agenda_event_id,
      agenda_event_date,
      agenda_event_time,
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
      pc.id,
      v_agenda_event_id,
      to_char(v_event_date, 'YYYY-MM-DD'),
      LEFT(to_char(v_event_time, 'HH24:MI:SS'), 5),
      to_char(v_event_date, 'DD/MM/YYYY'),
      pc.client_name,
      normalized_phone,
      public.commercial_time_to_period(pc.meeting_time),
      LEFT(to_char(v_event_time, 'HH24:MI:SS'), 5),
      COALESCE(NULLIF(pc.tem_socio, ''), 'NAO'),
      COALESCE(NULLIF(pc.tem_mkt, ''), 'NAO'),
      COALESCE(NULLIF(pc.tem_secretaria, ''), 'NAO_SEI'),
      COALESCE(NULLIF(pc.salao_ou_clinica, ''), 'NAO_INFORMADO'),
      COALESCE(NULLIF(pc.faturamento, ''), 'NAO_INFORMADO'),
      pc.pode_investir,
      pc.agendado_via,
      COALESCE(NULLIF(pc.criativo, ''), 'NAO IDENTIFICADO'),
      public.commercial_stage_to_agendamento_status(pc.stage),
      pc.created_by_user_id,
      now()
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_pipeline_client_to_agenda()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.sync_pipeline_client_to_agenda_by_id(NEW.id);
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

DO $$
DECLARE
  pc RECORD;
BEGIN
  FOR pc IN SELECT id FROM public.pipeline_clients LOOP
    PERFORM public.sync_pipeline_client_to_agenda_by_id(pc.id);
  END LOOP;
END $$;
