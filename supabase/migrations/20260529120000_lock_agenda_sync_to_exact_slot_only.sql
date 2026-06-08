-- Lock agenda/pipeline sync to exact slot matching only.
-- This prevents automatic triplication by stopping fuzzy matches on name/title
-- and by deduplicating exact same-person/same-day/same-time rows.

BEGIN;

-- Remove exact duplicates already created by older trigger versions.
-- Keep linked rows first, then the oldest remaining record for the same slot.
WITH ranked_agenda_events AS (
  SELECT
    ctid,
    row_number() OVER (
      PARTITION BY
        regexp_replace(COALESCE(client_phone, ''), '\D', '', 'g'),
        event_date,
        event_time
      ORDER BY
        (pipeline_client_id IS NULL),
        created_at ASC,
        updated_at ASC,
        id ASC
    ) AS rn
  FROM public.agenda_events
)
DELETE FROM public.agenda_events ae
USING ranked_agenda_events ranked
WHERE ae.ctid = ranked.ctid
  AND ranked.rn > 1;

WITH ranked_agendamento_leads AS (
  SELECT
    ctid,
    row_number() OVER (
      PARTITION BY
        regexp_replace(COALESCE(telefone, ''), '\D', '', 'g'),
        data,
        horario_especifico
      ORDER BY
        (pipeline_client_id IS NULL),
        created_at ASC,
        updated_at ASC,
        id ASC
    ) AS rn
  FROM public.agendamento_leads
)
DELETE FROM public.agendamento_leads al
USING ranked_agendamento_leads ranked
WHERE al.ctid = ranked.ctid
  AND ranked.rn > 1;

-- Backstop: exact same slot cannot exist twice anymore.
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

-- Rebuild the pipeline -> agenda sync so it only uses:
-- 1) the exact row already linked to the pipeline_client_id, or
-- 2) the exact unlinked slot created for the same person/date/time.
-- It no longer searches by fuzzy name/title matches, which was causing
-- the original appointment to be moved into the duplicated slot.
CREATE OR REPLACE FUNCTION public.sync_pipeline_client_to_agenda()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_date DATE;
  v_event_time TIME;
  normalized_phone TEXT;
  agenda_color TEXT;
  default_title TEXT;
  agenda_event_id UUID;
  agenda_lead_id UUID;
  existing_title TEXT;
  existing_title_locked BOOLEAN;
  existing_color TEXT;
BEGIN
  v_event_date := COALESCE(
    NULLIF(trim(NEW.meeting_date), '')::DATE,
    to_char(COALESCE(NEW.created_at, now()), 'YYYY-MM-DD')::DATE
  );
  v_event_time := COALESCE(
    NULLIF(trim(NEW.meeting_time), '')::TIME,
    '09:00'::TIME
  );
  normalized_phone := regexp_replace(COALESCE(NEW.telefone, ''), '\D', '', 'g');
  agenda_color := CASE
    WHEN NEW.stage = 'NO_SHOW' THEN '#FF0000'
    WHEN NEW.stage IN ('TAXA_INTERESSE', 'NEGOCIACAO', 'FECHADO') THEN '#66FF00'
    ELSE '#3B82F6'
  END;
  default_title := 'Reuniao com ' || COALESCE(NULLIF(NEW.client_name, ''), 'Lead sem nome');

  SELECT
    ae.id,
    ae.title,
    ae.title_locked,
    ae.color
  INTO
    agenda_event_id,
    existing_title,
    existing_title_locked,
    existing_color
  FROM public.agenda_events ae
  WHERE ae.pipeline_client_id = NEW.id
  ORDER BY ae.updated_at DESC, ae.created_at DESC, ae.id DESC
  LIMIT 1;

  IF agenda_event_id IS NULL THEN
    SELECT
      ae.id,
      ae.title,
      ae.title_locked,
      ae.color
    INTO
      agenda_event_id,
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

  IF agenda_event_id IS NOT NULL THEN
    UPDATE public.agenda_events
    SET
      pipeline_client_id = NEW.id,
      title = COALESCE(NULLIF(btrim(existing_title), ''), default_title),
      title_locked = COALESCE(existing_title_locked, false)
        OR COALESCE(NULLIF(btrim(existing_title), ''), default_title) <> default_title,
      description = 'Lead do Pipeline - ' || COALESCE(NULLIF(NEW.criativo, ''), 'NAO IDENTIFICADO'),
      notes = NEW.notes,
      client_name = NEW.client_name,
      client_phone = normalized_phone,
      clinic_name = COALESCE(NULLIF(NEW.clinic_name, ''), NEW.client_name),
      scheduled_by = NEW.agendado_por,
      lead_stage = NEW.stage,
      creative_source = NEW.criativo,
      event_date = v_event_date,
      event_time = v_event_time,
      color = COALESCE(NULLIF(existing_color, ''), agenda_color),
      team_id = CASE
        WHEN NEW.equipe = 'team-equipe-7' THEN 'ac2c282a-54a6-491e-b133-90890e2d299d'
        WHEN NEW.equipe = 'team-tropa-de-elite' THEN '5090ad67-315d-45f5-b4b2-5a1a73ae201d'
        ELSE NULL
      END::uuid,
      updated_at = now()
    WHERE id = agenda_event_id;
  ELSE
    INSERT INTO public.agenda_events (
      pipeline_client_id,
      title,
      title_locked,
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
      NEW.id,
      default_title,
      false,
      'Lead do Pipeline - ' || COALESCE(NULLIF(NEW.criativo, ''), 'NAO IDENTIFICADO'),
      NEW.notes,
      NEW.client_name,
      normalized_phone,
      COALESCE(NULLIF(NEW.clinic_name, ''), NEW.client_name),
      NEW.agendado_por,
      NEW.stage,
      NEW.criativo,
      v_event_date,
      v_event_time,
      60,
      NULL,
      agenda_color,
      false,
      false,
      NEW.created_by_user_id,
      CASE
        WHEN NEW.equipe = 'team-equipe-7' THEN 'ac2c282a-54a6-491e-b133-90890e2d299d'
        WHEN NEW.equipe = 'team-tropa-de-elite' THEN '5090ad67-315d-45f5-b4b2-5a1a73ae201d'
        ELSE NULL
      END::uuid,
      now()
    );
  END IF;

  SELECT ag.id
  INTO agenda_lead_id
  FROM public.agendamento_leads ag
  WHERE ag.pipeline_client_id = NEW.id
  ORDER BY ag.updated_at DESC, ag.created_at DESC, ag.id DESC
  LIMIT 1;

  IF agenda_lead_id IS NULL THEN
    SELECT
      ag.id
    INTO
      agenda_lead_id
    FROM public.agendamento_leads ag
    WHERE ag.pipeline_client_id IS NULL
      AND lower(btrim(COALESCE(ag.nome, ''))) = lower(btrim(COALESCE(NEW.client_name, '')))
      AND regexp_replace(COALESCE(ag.telefone, ''), '\D', '', 'g') = normalized_phone
      AND COALESCE(ag.data, '') = to_char(v_event_date, 'DD/MM/YYYY')
      AND COALESCE(ag.horario_especifico, '') = COALESCE(NULLIF(substring(NEW.meeting_time from 1 for 5), ''), '09:00')
    ORDER BY ag.updated_at DESC, ag.created_at DESC, ag.id DESC
    LIMIT 1;
  END IF;

  IF agenda_lead_id IS NOT NULL THEN
    UPDATE public.agendamento_leads
    SET
      pipeline_client_id = NEW.id,
      data = to_char(v_event_date, 'DD/MM/YYYY'),
      nome = NEW.client_name,
      telefone = normalized_phone,
      horario = public.commercial_time_to_period(NEW.meeting_time),
      horario_especifico = substring(NEW.meeting_time from 1 for 5),
      tem_socio = COALESCE(NULLIF(NEW.tem_socio, ''), 'NAO'),
      tem_mkt = COALESCE(NULLIF(NEW.tem_mkt, ''), 'NAO'),
      tem_secretaria = COALESCE(NULLIF(NEW.tem_secretaria, ''), 'NAO'),
      salao_ou_clinica = COALESCE(NULLIF(NEW.salao_ou_clinica, ''), 'NAO_INFORMADO'),
      faturamento = COALESCE(NULLIF(NEW.faturamento, ''), 'NAO_INFORMADO'),
      pode_investir = NEW.pode_investir,
      agendado_via = NEW.agendado_via,
      funil = COALESCE(NULLIF(NEW.criativo, ''), 'NAO IDENTIFICADO'),
      status = public.commercial_stage_to_agendamento_status(NEW.stage),
      created_by_user_id = NEW.created_by_user_id,
      updated_at = now()
    WHERE id = agenda_lead_id;
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
      created_by_user_id,
      updated_at
    )
    VALUES (
      NEW.id,
      to_char(v_event_date, 'DD/MM/YYYY'),
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
    );
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;
