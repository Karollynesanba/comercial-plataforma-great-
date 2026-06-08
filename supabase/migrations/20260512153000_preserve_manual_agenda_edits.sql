-- Preserve manual agenda edits when pipeline clients are synced again.
-- Once an agenda event exists, the agenda record should keep the user's edits
-- instead of being rebuilt from pipeline defaults on every pipeline update.

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
    NEW.equipe,
    now()
  )
  ON CONFLICT (pipeline_client_id)
  WHERE pipeline_client_id IS NOT NULL
  DO UPDATE SET
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
    updated_at = now();

  RETURN NEW;
END;
$$;
