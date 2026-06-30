-- Make the CRM -> Agenda projection fully idempotent:
-- - one active agenda row per pipeline client
-- - rescheduling updates the same linked row
-- - removing meeting data deletes the related agenda rows
-- - deleting the lead removes the related agenda rows

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
    WHERE pipeline_client_id = pc.id
       OR (
        pipeline_client_id IS NULL
        AND (
          regexp_replace(COALESCE(client_phone, ''), '\D', '', 'g') = normalized_phone
          OR lower(btrim(COALESCE(client_name, ''))) = lower(btrim(COALESCE(pc.client_name, '')))
        )
      );

    DELETE FROM public.agendamento_leads
    WHERE pipeline_client_id = pc.id
       OR (
        pipeline_client_id IS NULL
        AND (
          regexp_replace(COALESCE(telefone, ''), '\D', '', 'g') = normalized_phone
          OR lower(btrim(COALESCE(nome, ''))) = lower(btrim(COALESCE(pc.client_name, '')))
        )
      );
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

  -- Remove stale unlinked projection rows for the same lead before upserting
  -- the canonical linked record.
  DELETE FROM public.agenda_events
  WHERE pipeline_client_id IS NULL
    AND (
      regexp_replace(COALESCE(client_phone, ''), '\D', '', 'g') = normalized_phone
      OR lower(btrim(COALESCE(client_name, ''))) = lower(btrim(COALESCE(pc.client_name, '')))
    );

  DELETE FROM public.agendamento_leads
  WHERE pipeline_client_id IS NULL
    AND (
      regexp_replace(COALESCE(telefone, ''), '\D', '', 'g') = normalized_phone
      OR lower(btrim(COALESCE(nome, ''))) = lower(btrim(COALESCE(pc.client_name, '')))
    );

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
    pc.id,
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

DO $$
DECLARE
  pc RECORD;
BEGIN
  FOR pc IN SELECT id FROM public.pipeline_clients LOOP
    PERFORM public.sync_pipeline_client_to_agenda_by_id(pc.id);
  END LOOP;
END $$;
