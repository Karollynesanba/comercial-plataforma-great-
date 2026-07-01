-- GreatGo: pipeline_clients -> agenda_events / agendamento_leads
-- Run this in Supabase SQL editor.
-- It guarantees one active agenda record per lead and reuses exact-slot rows
-- instead of trying to insert duplicates.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
  v_phone TEXT;
  v_title TEXT;
  v_color TEXT;
  v_agenda_event_id UUID;
  v_agenda_lead_id UUID;
BEGIN
  SELECT *
  INTO pc
  FROM public.pipeline_clients
  WHERE id = client_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF NULLIF(BTRIM(COALESCE(pc.meeting_date, '')), '') IS NULL
     OR NULLIF(BTRIM(COALESCE(pc.meeting_time, '')), '') IS NULL THEN
    DELETE FROM public.agenda_events
    WHERE pipeline_client_id = pc.id;

    DELETE FROM public.agendamento_leads
    WHERE pipeline_client_id = pc.id;
    RETURN;
  END IF;

  v_event_date := NULLIF(BTRIM(pc.meeting_date), '')::DATE;
  v_event_time := NULLIF(BTRIM(pc.meeting_time), '')::TIME;
  v_phone := REGEXP_REPLACE(COALESCE(pc.telefone, ''), '\D', '', 'g');
  v_title := 'Reuniao com ' || COALESCE(NULLIF(pc.client_name, ''), 'Lead sem nome');
  v_color := CASE
    WHEN pc.stage IN ('NO_SHOW', 'PERDIDO') THEN '#FF0000'
    WHEN pc.stage IN ('TAXA_INTERESSE', 'NEGOCIACAO', 'FECHADO') THEN '#66FF00'
    ELSE '#3B82F6'
  END;

  SELECT ae.id
  INTO v_agenda_event_id
  FROM public.agenda_events ae
  WHERE ae.pipeline_client_id = pc.id
  ORDER BY ae.updated_at DESC, ae.created_at DESC, ae.id DESC
  LIMIT 1;

  IF v_agenda_event_id IS NULL THEN
    SELECT ae.id
    INTO v_agenda_event_id
    FROM public.agenda_events ae
    WHERE REGEXP_REPLACE(COALESCE(ae.client_phone, ''), '\D', '', 'g') = v_phone
      AND ae.event_date = v_event_date
      AND ae.event_time = v_event_time
    ORDER BY ae.updated_at DESC, ae.created_at DESC, ae.id DESC
    LIMIT 1;
  END IF;

  IF v_agenda_event_id IS NOT NULL THEN
    DELETE FROM public.agenda_events
    WHERE id <> v_agenda_event_id
      AND REGEXP_REPLACE(COALESCE(client_phone, ''), '\D', '', 'g') = v_phone
      AND event_date = v_event_date
      AND event_time = v_event_time;

    UPDATE public.agenda_events
    SET
      pipeline_client_id = pc.id,
      title = v_title,
      description = 'Lead do Pipeline',
      notes = pc.notes,
      client_name = pc.client_name,
      client_phone = v_phone,
      clinic_name = COALESCE(NULLIF(pc.clinic_name, ''), pc.client_name),
      scheduled_by = pc.agendado_por,
      lead_stage = pc.stage,
      creative_source = pc.criativo,
      event_date = v_event_date,
      event_time = v_event_time,
      duration_minutes = 60,
      meeting_link = NULL,
      color = v_color,
      reminder_2h_sent = false,
      reminder_30min_sent = false,
      created_by_user_id = pc.created_by_user_id,
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
      updated_at
    )
    VALUES (
      pc.id,
      v_title,
      'Lead do Pipeline',
      pc.notes,
      pc.client_name,
      v_phone,
      COALESCE(NULLIF(pc.clinic_name, ''), pc.client_name),
      pc.agendado_por,
      pc.stage,
      pc.criativo,
      v_event_date,
      v_event_time,
      60,
      NULL,
      v_color,
      false,
      false,
      pc.created_by_user_id,
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
      updated_at = now();
  END IF;

  SELECT al.id
  INTO v_agenda_lead_id
  FROM public.agendamento_leads al
  WHERE al.pipeline_client_id = pc.id
  ORDER BY al.updated_at DESC, al.created_at DESC, al.id DESC
  LIMIT 1;

  IF v_agenda_lead_id IS NULL THEN
    SELECT al.id
    INTO v_agenda_lead_id
    FROM public.agendamento_leads al
    WHERE REGEXP_REPLACE(COALESCE(al.telefone, ''), '\D', '', 'g') = v_phone
      AND COALESCE(al.data, '') = TO_CHAR(v_event_date, 'DD/MM/YYYY')
      AND COALESCE(al.horario_especifico, '') = LEFT(TO_CHAR(v_event_time, 'HH24:MI:SS'), 5)
    ORDER BY al.updated_at DESC, al.created_at DESC, al.id DESC
    LIMIT 1;
  END IF;

  IF v_agenda_lead_id IS NOT NULL THEN
    DELETE FROM public.agendamento_leads
    WHERE id <> v_agenda_lead_id
      AND REGEXP_REPLACE(COALESCE(telefone, ''), '\D', '', 'g') = v_phone
      AND COALESCE(data, '') = TO_CHAR(v_event_date, 'DD/MM/YYYY')
      AND COALESCE(horario_especifico, '') = LEFT(TO_CHAR(v_event_time, 'HH24:MI:SS'), 5);

    UPDATE public.agendamento_leads
    SET
      pipeline_client_id = pc.id,
      agenda_event_id = v_agenda_event_id,
      agenda_event_date = TO_CHAR(v_event_date, 'YYYY-MM-DD'),
      agenda_event_time = LEFT(TO_CHAR(v_event_time, 'HH24:MI:SS'), 5),
      data = TO_CHAR(v_event_date, 'DD/MM/YYYY'),
      nome = pc.client_name,
      telefone = v_phone,
      horario = CASE
        WHEN EXTRACT(HOUR FROM v_event_time) < 12 THEN 'MANHA'
        WHEN EXTRACT(HOUR FROM v_event_time) < 18 THEN 'TARDE'
        ELSE 'NOITE'
      END,
      horario_especifico = LEFT(TO_CHAR(v_event_time, 'HH24:MI:SS'), 5),
      tem_socio = COALESCE(NULLIF(pc.tem_socio, ''), 'NAO'),
      tem_mkt = COALESCE(NULLIF(pc.tem_mkt, ''), 'NAO'),
      tem_secretaria = COALESCE(NULLIF(pc.tem_secretaria, ''), 'NAO_SEI'),
      salao_ou_clinica = COALESCE(NULLIF(pc.salao_ou_clinica, ''), 'NAO_INFORMADO'),
      faturamento = COALESCE(NULLIF(pc.faturamento, ''), 'NAO_INFORMADO'),
      pode_investir = pc.pode_investir,
      agendado_via = pc.agendado_via,
      funil = COALESCE(NULLIF(pc.criativo, ''), 'NAO IDENTIFICADO'),
      status = CASE
        WHEN pc.stage = 'NO_SHOW' THEN 'NO_SHOW'
        WHEN pc.stage = 'TAXA_INTERESSE' THEN 'TAXA_INTERESSE'
        WHEN pc.stage = 'NEGOCIACAO' THEN 'NEGOCIACAO'
        WHEN pc.stage = 'PERDIDO' THEN 'PERDIDO'
        WHEN pc.stage = 'FECHADO' THEN 'FECHADO'
        ELSE 'NOVO_LEAD'
      END,
      created_by_user_id = pc.created_by_user_id,
      updated_at = now()
    WHERE id = v_agenda_lead_id;
  ELSE
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
      TO_CHAR(v_event_date, 'YYYY-MM-DD'),
      LEFT(TO_CHAR(v_event_time, 'HH24:MI:SS'), 5),
      TO_CHAR(v_event_date, 'DD/MM/YYYY'),
      pc.client_name,
      v_phone,
      CASE
        WHEN EXTRACT(HOUR FROM v_event_time) < 12 THEN 'MANHA'
        WHEN EXTRACT(HOUR FROM v_event_time) < 18 THEN 'TARDE'
        ELSE 'NOITE'
      END,
      LEFT(TO_CHAR(v_event_time, 'HH24:MI:SS'), 5),
      COALESCE(NULLIF(pc.tem_socio, ''), 'NAO'),
      COALESCE(NULLIF(pc.tem_mkt, ''), 'NAO'),
      COALESCE(NULLIF(pc.tem_secretaria, ''), 'NAO_SEI'),
      COALESCE(NULLIF(pc.salao_ou_clinica, ''), 'NAO_INFORMADO'),
      COALESCE(NULLIF(pc.faturamento, ''), 'NAO_INFORMADO'),
      pc.pode_investir,
      pc.agendado_via,
      COALESCE(NULLIF(pc.criativo, ''), 'NAO IDENTIFICADO'),
      CASE
        WHEN pc.stage = 'NO_SHOW' THEN 'NO_SHOW'
        WHEN pc.stage = 'TAXA_INTERESSE' THEN 'TAXA_INTERESSE'
        WHEN pc.stage = 'NEGOCIACAO' THEN 'NEGOCIACAO'
        WHEN pc.stage = 'PERDIDO' THEN 'PERDIDO'
        WHEN pc.stage = 'FECHADO' THEN 'FECHADO'
        ELSE 'NOVO_LEAD'
      END,
      pc.created_by_user_id,
      now()
    )
    ON CONFLICT (pipeline_client_id)
    WHERE pipeline_client_id IS NOT NULL
    DO UPDATE SET
      agenda_event_id = EXCLUDED.agenda_event_id,
      agenda_event_date = EXCLUDED.agenda_event_date,
      agenda_event_time = EXCLUDED.agenda_event_time,
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
      created_by_user_id = COALESCE(EXCLUDED.created_by_user_id, public.agendamento_leads.created_by_user_id),
      updated_at = now();
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
  notes,
  agendado_por,
  criativo,
  stage,
  meeting_date,
  meeting_time,
  tem_socio,
  tem_mkt,
  tem_secretaria,
  salao_ou_clinica,
  agendado_via,
  pode_investir
ON public.pipeline_clients
FOR EACH ROW
EXECUTE FUNCTION public.sync_pipeline_client_to_agenda();

DROP TRIGGER IF EXISTS trg_cleanup_pipeline_client_projections ON public.pipeline_clients;
CREATE TRIGGER trg_cleanup_pipeline_client_projections
AFTER DELETE ON public.pipeline_clients
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_pipeline_client_projections();

UPDATE public.pipeline_clients
SET meeting_date = meeting_date,
    meeting_time = meeting_time
WHERE meeting_date IS NOT NULL
  AND meeting_time IS NOT NULL;

