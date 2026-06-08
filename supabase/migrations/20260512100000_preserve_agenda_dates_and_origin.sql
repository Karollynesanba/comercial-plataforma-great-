-- Preserve manually adjusted agenda dates/times when pipeline cards are updated.
-- Agenda should remain authoritative for scheduling once a lead already has an agenda record.

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
  SELECT ae.event_date, ae.event_time
    INTO event_date, event_time
  FROM public.agenda_events ae
  WHERE ae.pipeline_client_id = NEW.id
  LIMIT 1;

  event_date := COALESCE(
    event_date,
    NULLIF(trim(NEW.meeting_date), '')::DATE,
    to_char(COALESCE(NEW.created_at, now()), 'YYYY-MM-DD')::DATE
  );
  event_time := COALESCE(
    event_time,
    NULLIF(trim(NEW.meeting_time), '')::TIME,
    '09:00'::TIME
  );
  normalized_phone := regexp_replace(COALESCE(NEW.telefone, ''), '\D', '', 'g');
  agenda_color := CASE
    WHEN NEW.stage IN ('NO_SHOW', 'PERDIDO') THEN '#FF0000'
    WHEN NEW.stage IN ('TAXA_INTERESSE', 'NEGOCIACAO', 'FECHADO') THEN '#66FF00'
    ELSE '#3B82F6'
  END;

  INSERT INTO public.agenda_events AS ae (
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
    NEW.id,
    'Reuniao com ' || COALESCE(NULLIF(NEW.client_name, ''), 'Lead sem nome'),
    'Lead do Pipeline - ' || COALESCE(NULLIF(NEW.criativo, ''), 'NAO IDENTIFICADO'),
    NEW.notes,
    NEW.client_name,
    normalized_phone,
    COALESCE(NULLIF(NEW.clinic_name, ''), NEW.client_name),
    NEW.agendado_por,
    NEW.stage,
    NEW.criativo,
    event_date,
    event_time,
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
    event_date = COALESCE(ae.event_date, EXCLUDED.event_date),
    event_time = COALESCE(ae.event_time, EXCLUDED.event_time),
    color = EXCLUDED.color,
    team_id = EXCLUDED.team_id,
    updated_at = now();

  INSERT INTO public.agendamento_leads AS ag (
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
    data = COALESCE(ag.data, EXCLUDED.data),
    nome = EXCLUDED.nome,
    telefone = EXCLUDED.telefone,
    horario = COALESCE(ag.horario, EXCLUDED.horario),
    horario_especifico = COALESCE(ag.horario_especifico, EXCLUDED.horario_especifico),
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

UPDATE public.agenda_events ae
SET
  title = 'Reuniao com ' || COALESCE(NULLIF(pc.client_name, ''), 'Lead sem nome'),
  description = 'Lead do Pipeline - ' || COALESCE(NULLIF(pc.criativo, ''), 'NAO IDENTIFICADO'),
  notes = pc.notes,
  client_name = pc.client_name,
  client_phone = regexp_replace(COALESCE(pc.telefone, ''), '\D', '', 'g'),
  clinic_name = COALESCE(NULLIF(pc.clinic_name, ''), pc.client_name),
  scheduled_by = pc.agendado_por,
  lead_stage = pc.stage,
  creative_source = pc.criativo,
  event_date = COALESCE(ae.event_date, NULLIF(trim(pc.meeting_date), '')::DATE, to_char(COALESCE(pc.created_at, now()), 'YYYY-MM-DD')::DATE),
  event_time = COALESCE(ae.event_time, NULLIF(trim(pc.meeting_time), '')::TIME, '09:00'::TIME),
  color = CASE
    WHEN pc.stage IN ('NO_SHOW', 'PERDIDO') THEN '#FF0000'
    WHEN pc.stage IN ('TAXA_INTERESSE', 'NEGOCIACAO', 'FECHADO') THEN '#66FF00'
    ELSE '#3B82F6'
  END,
  team_id = CASE
    WHEN pc.equipe = 'team-equipe-7' THEN 'ac2c282a-54a6-491e-b133-90890e2d299d'
    WHEN pc.equipe = 'team-tropa-de-elite' THEN '5090ad67-315d-45f5-b4b2-5a1a73ae201d'
    ELSE NULL
  END::uuid,
  updated_at = now()
FROM public.pipeline_clients pc
WHERE ae.pipeline_client_id = pc.id
  AND pc.meeting_date IS NOT NULL
  AND pc.meeting_time IS NOT NULL;

INSERT INTO public.agenda_events AS ae (
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
  created_at,
  updated_at
)
SELECT
  pc.id,
  'Reuniao com ' || COALESCE(NULLIF(pc.client_name, ''), 'Lead sem nome'),
  'Lead do Pipeline - ' || COALESCE(NULLIF(pc.criativo, ''), 'NAO IDENTIFICADO'),
  pc.notes,
  pc.client_name,
  regexp_replace(COALESCE(pc.telefone, ''), '\D', '', 'g'),
  COALESCE(NULLIF(pc.clinic_name, ''), pc.client_name),
  pc.agendado_por,
  pc.stage,
  pc.criativo,
  COALESCE(NULLIF(trim(pc.meeting_date), '')::DATE, to_char(COALESCE(pc.created_at, now()), 'YYYY-MM-DD')::DATE),
  COALESCE(NULLIF(trim(pc.meeting_time), '')::TIME, '09:00'::TIME),
  60,
  NULL,
  CASE
    WHEN pc.stage IN ('NO_SHOW', 'PERDIDO') THEN '#FF0000'
    WHEN pc.stage IN ('TAXA_INTERESSE', 'NEGOCIACAO', 'FECHADO') THEN '#66FF00'
    ELSE '#3B82F6'
  END,
  false,
  false,
  pc.created_by_user_id,
  CASE
    WHEN pc.equipe = 'team-equipe-7' THEN 'ac2c282a-54a6-491e-b133-90890e2d299d'
    WHEN pc.equipe = 'team-tropa-de-elite' THEN '5090ad67-315d-45f5-b4b2-5a1a73ae201d'
    ELSE NULL
  END::uuid,
  COALESCE(pc.created_at, now()),
  now()
FROM public.pipeline_clients pc
WHERE pc.meeting_date IS NOT NULL
  AND pc.meeting_time IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.agenda_events ae
    WHERE ae.pipeline_client_id = pc.id
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
  event_date = COALESCE(ae.event_date, EXCLUDED.event_date),
  event_time = COALESCE(ae.event_time, EXCLUDED.event_time),
  duration_minutes = EXCLUDED.duration_minutes,
  meeting_link = EXCLUDED.meeting_link,
  color = EXCLUDED.color,
  team_id = EXCLUDED.team_id,
  updated_at = now();
