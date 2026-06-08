-- Preserve agenda history when a pipeline client is rescheduled.
-- If a linked agenda event/lead already exists and the slot changes,
-- create a new unlinked record instead of moving the original.

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
  agenda_event_id UUID;
  agenda_lead_id UUID;
  existing_event_date DATE;
  existing_event_time TIME;
  existing_lead_data TEXT;
  existing_lead_time TEXT;
  existing_title TEXT;
  existing_title_locked BOOLEAN;
  existing_color TEXT;
  default_title TEXT;
  resolved_title TEXT;
  linked_event_exists BOOLEAN;
  linked_lead_exists BOOLEAN;
  preserve_event_history BOOLEAN;
  preserve_lead_history BOOLEAN;
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

  linked_event_exists := EXISTS (
    SELECT 1
    FROM public.agenda_events ae
    WHERE ae.pipeline_client_id = NEW.id
  );

  SELECT ae.id, ae.event_date, ae.event_time, ae.title, ae.title_locked, ae.color
    INTO agenda_event_id, existing_event_date, existing_event_time, existing_title, existing_title_locked, existing_color
  FROM public.agenda_events ae
  WHERE ae.pipeline_client_id = NEW.id
     OR (
      ae.pipeline_client_id IS NULL
      AND ae.event_date = v_event_date
      AND ae.event_time = v_event_time
      AND (
        regexp_replace(COALESCE(ae.client_phone, ''), '\D', '', 'g') = normalized_phone
        OR lower(btrim(COALESCE(ae.client_name, ''))) = lower(btrim(COALESCE(NEW.client_name, '')))
        OR lower(btrim(COALESCE(ae.title, ''))) = lower(btrim(COALESCE(default_title, '')))
      )
    )
  ORDER BY
    CASE WHEN ae.pipeline_client_id = NEW.id THEN 0 ELSE 1 END,
    CASE WHEN ae.title_locked THEN 0 ELSE 1 END,
    ae.updated_at DESC
  LIMIT 1;

  preserve_event_history :=
    linked_event_exists
    AND agenda_event_id IS NOT NULL
    AND (COALESCE(existing_event_date, v_event_date) <> v_event_date OR COALESCE(existing_event_time, v_event_time) <> v_event_time);

  resolved_title := COALESCE(NULLIF(btrim(existing_title), ''), default_title);

  IF agenda_event_id IS NOT NULL AND NOT preserve_event_history THEN
    UPDATE public.agenda_events
    SET
      pipeline_client_id = NEW.id,
      title = resolved_title,
      title_locked = COALESCE(existing_title_locked, false) OR resolved_title <> default_title,
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
      CASE WHEN preserve_event_history THEN NULL ELSE NEW.id END,
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
    )
    ON CONFLICT (pipeline_client_id)
    WHERE pipeline_client_id IS NOT NULL
    DO UPDATE SET
      title = EXCLUDED.title,
      title_locked = EXCLUDED.title_locked,
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
  END IF;

  linked_lead_exists := EXISTS (
    SELECT 1
    FROM public.agendamento_leads ag
    WHERE ag.pipeline_client_id = NEW.id
  );

  SELECT ag.id, ag.data, ag.horario_especifico
    INTO agenda_lead_id, existing_lead_data, existing_lead_time
  FROM public.agendamento_leads ag
  WHERE ag.pipeline_client_id = NEW.id
     OR (
      ag.pipeline_client_id IS NULL
      AND lower(btrim(COALESCE(ag.nome, ''))) = lower(btrim(COALESCE(NEW.client_name, '')))
      AND regexp_replace(COALESCE(ag.telefone, ''), '\D', '', 'g') = normalized_phone
      AND COALESCE(ag.data, '') = to_char(v_event_date, 'DD/MM/YYYY')
      AND COALESCE(ag.horario_especifico, '') = COALESCE(NULLIF(substring(NEW.meeting_time from 1 for 5), ''), '09:00')
    )
  ORDER BY
    CASE WHEN ag.pipeline_client_id = NEW.id THEN 0 ELSE 1 END,
    ag.updated_at DESC
  LIMIT 1;

  preserve_lead_history :=
    linked_lead_exists
    AND agenda_lead_id IS NOT NULL
    AND (
      COALESCE(existing_lead_data, '') <> to_char(v_event_date, 'DD/MM/YYYY')
      OR COALESCE(existing_lead_time, '') <> COALESCE(NULLIF(substring(NEW.meeting_time from 1 for 5), ''), '09:00')
    );

  IF agenda_lead_id IS NOT NULL AND NOT preserve_lead_history THEN
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
      CASE WHEN preserve_lead_history THEN NULL ELSE NEW.id END,
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
  END IF;

  RETURN NEW;
END;
$$;
