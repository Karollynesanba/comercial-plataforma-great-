-- Repair the CRM -> Agenda sync so pipeline saves never fail on exact-slot
-- duplicates and lead edits always reuse the existing agenda row.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE UNIQUE INDEX IF NOT EXISTS agenda_events_exact_slot_uidx
  ON public.agenda_events (
    regexp_replace(COALESCE(client_phone, ''), '\D', '', 'g'),
    event_date,
    event_time
  )
  WHERE client_phone IS NOT NULL
    AND event_date IS NOT NULL
    AND event_time IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS agendamento_leads_exact_slot_uidx
  ON public.agendamento_leads (
    regexp_replace(COALESCE(telefone, ''), '\D', '', 'g'),
    data,
    horario_especifico
  )
  WHERE telefone IS NOT NULL
    AND data IS NOT NULL
    AND btrim(data) <> ''
    AND horario_especifico IS NOT NULL
    AND btrim(horario_especifico) <> '';

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
  v_agenda_lead_id UUID;
  existing_title TEXT;
  existing_title_locked BOOLEAN;
  existing_color TEXT;
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

  SELECT
    ae.id,
    ae.title,
    ae.title_locked,
    ae.color
  INTO
    v_agenda_event_id,
    existing_title,
    existing_title_locked,
    existing_color
  FROM public.agenda_events ae
  WHERE ae.pipeline_client_id = pc.id
  ORDER BY ae.updated_at DESC, ae.created_at DESC, ae.id DESC
  LIMIT 1;

  IF v_agenda_event_id IS NULL THEN
    SELECT
      ae.id,
      ae.title,
      ae.title_locked,
      ae.color
    INTO
      v_agenda_event_id,
      existing_title,
      existing_title_locked,
      existing_color
    FROM public.agenda_events ae
    WHERE ae.pipeline_client_id IS NULL
      AND ae.event_date = v_event_date
      AND ae.event_time = v_event_time
      AND regexp_replace(COALESCE(ae.client_phone, ''), '\D', '', 'g') = normalized_phone
    ORDER BY ae.updated_at DESC, ae.created_at DESC, ae.id DESC
    LIMIT 1;
  END IF;

  IF v_agenda_event_id IS NOT NULL THEN
    UPDATE public.agenda_events
    SET
      pipeline_client_id = pc.id,
      title = COALESCE(NULLIF(btrim(existing_title), ''), default_title),
      title_locked = COALESCE(existing_title_locked, false)
        OR COALESCE(NULLIF(btrim(existing_title), ''), default_title) <> default_title,
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
      color = COALESCE(NULLIF(existing_color, ''), agenda_color),
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
    ON CONFLICT (
      (regexp_replace(COALESCE(client_phone, ''), '\D', '', 'g')),
      event_date,
      event_time
    )
    WHERE client_phone IS NOT NULL
      AND event_date IS NOT NULL
      AND event_time IS NOT NULL
    DO UPDATE SET
      pipeline_client_id = EXCLUDED.pipeline_client_id,
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
      updated_at = now()
    RETURNING id INTO v_agenda_event_id;
  END IF;

  SELECT
    ag.id
  INTO
    v_agenda_lead_id
  FROM public.agendamento_leads ag
  WHERE ag.pipeline_client_id = pc.id
  ORDER BY ag.updated_at DESC, ag.created_at DESC, ag.id DESC
  LIMIT 1;

  IF v_agenda_lead_id IS NULL THEN
    SELECT
      ag.id
    INTO
      v_agenda_lead_id
    FROM public.agendamento_leads ag
    WHERE ag.pipeline_client_id IS NULL
      AND lower(btrim(COALESCE(ag.nome, ''))) = lower(btrim(COALESCE(pc.client_name, '')))
      AND regexp_replace(COALESCE(ag.telefone, ''), '\D', '', 'g') = normalized_phone
      AND COALESCE(ag.data, '') = to_char(v_event_date, 'DD/MM/YYYY')
      AND COALESCE(ag.horario_especifico, '') = LEFT(to_char(v_event_time, 'HH24:MI:SS'), 5)
    ORDER BY ag.updated_at DESC, ag.created_at DESC, ag.id DESC
    LIMIT 1;
  END IF;

  IF v_agenda_lead_id IS NOT NULL THEN
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
    WHERE id = v_agenda_lead_id;
  ELSE
    INSERT INTO public.agendamento_leads (
      pipeline_client_id,
      v_agenda_event_id,
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
      agenda_event_id,
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
    )
    ON CONFLICT (
      (regexp_replace(COALESCE(telefone, ''), '\D', '', 'g')),
      data,
      horario_especifico
    )
    WHERE telefone IS NOT NULL
      AND data IS NOT NULL
      AND btrim(data) <> ''
      AND horario_especifico IS NOT NULL
      AND btrim(horario_especifico) <> ''
    DO UPDATE SET
      pipeline_client_id = EXCLUDED.pipeline_client_id,
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
      created_by_user_id = EXCLUDED.created_by_user_id,
      updated_at = now()
    RETURNING id INTO v_agenda_lead_id;
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

DO $$
DECLARE
  pc RECORD;
BEGIN
  FOR pc IN SELECT id FROM public.pipeline_clients LOOP
    PERFORM public.sync_pipeline_client_to_agenda_by_id(pc.id);
  END LOOP;
END $$;

COMMIT;
