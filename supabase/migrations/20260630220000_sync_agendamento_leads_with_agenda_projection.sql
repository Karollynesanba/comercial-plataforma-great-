-- Persist the agenda projection directly on agendamento_leads so rescheduled
-- leads keep appearing on the new day across all devices after a day/time edit.

ALTER TABLE public.agendamento_leads
  ADD COLUMN IF NOT EXISTS agenda_event_id UUID,
  ADD COLUMN IF NOT EXISTS agenda_event_date TEXT,
  ADD COLUMN IF NOT EXISTS agenda_event_time TEXT,
  ADD COLUMN IF NOT EXISTS agenda_event_title TEXT;

CREATE INDEX IF NOT EXISTS agendamento_leads_agenda_event_id_idx
  ON public.agendamento_leads (agenda_event_id)
  WHERE agenda_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS agendamento_leads_agenda_event_date_idx
  ON public.agendamento_leads (agenda_event_date)
  WHERE agenda_event_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS agendamento_leads_agenda_event_time_idx
  ON public.agendamento_leads (agenda_event_time)
  WHERE agenda_event_time IS NOT NULL;

UPDATE public.agendamento_leads al
SET
  agenda_event_id = ae.id,
  agenda_event_date = to_char(ae.event_date, 'YYYY-MM-DD'),
  agenda_event_time = LEFT(to_char(ae.event_time, 'HH24:MI:SS'), 5),
  agenda_event_title = ae.title,
  data = to_char(ae.event_date, 'DD/MM/YYYY'),
  horario_especifico = LEFT(to_char(ae.event_time, 'HH24:MI:SS'), 5),
  updated_at = now()
FROM public.agenda_events ae
WHERE ae.pipeline_client_id IS NOT NULL
  AND al.pipeline_client_id = ae.pipeline_client_id;

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
  v_agenda_event_title TEXT;
  v_agenda_lead_id UUID;
BEGIN
  SELECT *
  INTO pc
  FROM public.pipeline_clients
  WHERE id = client_id;

  IF NOT FOUND THEN
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
  normalized_phone := regexp_replace(COALESCE(pc.telefone, ''), '\D', '', 'g');
  agenda_color := CASE
    WHEN pc.stage IN ('NO_SHOW', 'PERDIDO') THEN '#FF0000'
    WHEN pc.stage IN ('TAXA_INTERESSE', 'NEGOCIACAO', 'FECHADO') THEN '#66FF00'
    ELSE '#3B82F6'
  END;
  default_title := 'Reuniao com ' || COALESCE(NULLIF(pc.client_name, ''), 'Lead sem nome');

  SELECT
    ae.id
  INTO
    v_agenda_event_id
  FROM public.agenda_events ae
  WHERE ae.pipeline_client_id = pc.id
  ORDER BY ae.updated_at DESC, ae.created_at DESC, ae.id DESC
  LIMIT 1;

  IF v_agenda_event_id IS NULL THEN
    SELECT
      ae.id
    INTO
      v_agenda_event_id
    FROM public.agenda_events ae
    WHERE ae.pipeline_client_id IS NULL
      AND ae.event_date = v_event_date
      AND ae.event_time = v_event_time
      AND (
        regexp_replace(COALESCE(ae.client_phone, ''), '\D', '', 'g') = normalized_phone
        OR lower(btrim(COALESCE(ae.client_name, ''))) = lower(btrim(COALESCE(pc.client_name, '')))
        OR lower(btrim(COALESCE(ae.title, ''))) = lower(btrim(COALESCE(default_title, '')))
      )
    ORDER BY ae.updated_at DESC, ae.created_at DESC, ae.id DESC
    LIMIT 1;
  END IF;

  IF v_agenda_event_id IS NOT NULL THEN
    UPDATE public.agenda_events
    SET
      pipeline_client_id = pc.id,
      title = COALESCE(NULLIF(btrim(title), ''), default_title),
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
      color = agenda_color,
      team_id = CASE
        WHEN pc.equipe = 'team-equipe-7' THEN 'ac2c282a-54a6-491e-b133-90890e2d299d'::uuid
        WHEN pc.equipe = 'team-tropa-de-elite' THEN '5090ad67-315d-45f5-b4b2-5a1a73ae201d'::uuid
        ELSE NULL
      END,
      updated_at = now()
    WHERE id = v_agenda_event_id;

    SELECT ae.title
    INTO v_agenda_event_title
    FROM public.agenda_events ae
    WHERE ae.id = v_agenda_event_id;
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
      color = EXCLUDED.color,
      team_id = EXCLUDED.team_id,
      updated_at = now()
    RETURNING id, title
    INTO v_agenda_event_id, v_agenda_event_title;
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
      AND COALESCE(ag.horario_especifico, '') = COALESCE(NULLIF(substring(COALESCE(pc.meeting_time, '09:00') from 1 for 5), ''), '09:00')
    ORDER BY ag.updated_at DESC, ag.created_at DESC, ag.id DESC
    LIMIT 1;
  END IF;

  IF v_agenda_lead_id IS NOT NULL THEN
    UPDATE public.agendamento_leads
    SET
      pipeline_client_id = pc.id,
      data = to_char(v_event_date, 'DD/MM/YYYY'),
      nome = pc.client_name,
      telefone = normalized_phone,
      horario = public.commercial_time_to_period(pc.meeting_time),
      horario_especifico = substring(COALESCE(pc.meeting_time, '09:00') from 1 for 5),
      tem_socio = COALESCE(NULLIF(pc.tem_socio, ''), 'NAO'),
      tem_mkt = COALESCE(NULLIF(pc.tem_mkt, ''), 'NAO'),
      tem_secretaria = COALESCE(NULLIF(pc.tem_secretaria, ''), 'NAO_SEI'),
      salao_ou_clinica = COALESCE(NULLIF(pc.salao_ou_clinica, ''), 'NAO_INFORMADO'),
      faturamento = COALESCE(NULLIF(pc.faturamento, ''), 'NAO_INFORMADO'),
      pode_investir = pc.pode_investir,
      agendado_via = pc.agendado_via,
      funil = COALESCE(NULLIF(pc.criativo, ''), 'NAO IDENTIFICADO'),
      status = public.commercial_stage_to_agendamento_status(pc.stage),
      agenda_event_id = v_agenda_event_id,
      agenda_event_date = to_char(v_event_date, 'YYYY-MM-DD'),
      agenda_event_time = LEFT(to_char(v_event_time, 'HH24:MI:SS'), 5),
      agenda_event_title = COALESCE(NULLIF(btrim(v_agenda_event_title), ''), default_title),
      created_by_user_id = pc.created_by_user_id,
      updated_at = now()
    WHERE id = v_agenda_lead_id;
  ELSE
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
      agenda_event_id,
      agenda_event_date,
      agenda_event_time,
      agenda_event_title,
      created_by_user_id,
      updated_at
    )
    VALUES (
      pc.id,
      to_char(v_event_date, 'DD/MM/YYYY'),
      pc.client_name,
      normalized_phone,
      public.commercial_time_to_period(pc.meeting_time),
      substring(COALESCE(pc.meeting_time, '09:00') from 1 for 5),
      COALESCE(NULLIF(pc.tem_socio, ''), 'NAO'),
      COALESCE(NULLIF(pc.tem_mkt, ''), 'NAO'),
      COALESCE(NULLIF(pc.tem_secretaria, ''), 'NAO_SEI'),
      COALESCE(NULLIF(pc.salao_ou_clinica, ''), 'NAO_INFORMADO'),
      COALESCE(NULLIF(pc.faturamento, ''), 'NAO_INFORMADO'),
      pc.pode_investir,
      pc.agendado_via,
      COALESCE(NULLIF(pc.criativo, ''), 'NAO IDENTIFICADO'),
      public.commercial_stage_to_agendamento_status(pc.stage),
      v_agenda_event_id,
      to_char(v_event_date, 'YYYY-MM-DD'),
      LEFT(to_char(v_event_time, 'HH24:MI:SS'), 5),
      COALESCE(NULLIF(btrim(v_agenda_event_title), ''), default_title),
      pc.created_by_user_id,
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
      agenda_event_id = EXCLUDED.agenda_event_id,
      agenda_event_date = EXCLUDED.agenda_event_date,
      agenda_event_time = EXCLUDED.agenda_event_time,
      agenda_event_title = EXCLUDED.agenda_event_title,
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

DO $$
DECLARE
  pc RECORD;
BEGIN
  FOR pc IN
    SELECT id
    FROM public.pipeline_clients
  LOOP
    PERFORM public.sync_pipeline_client_to_agenda_by_id(pc.id);
  END LOOP;
END $$;
