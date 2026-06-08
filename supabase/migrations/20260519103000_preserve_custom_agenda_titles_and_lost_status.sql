-- Preserve manually edited agenda titles and stop lost CRM records from
-- being reclassified as no-show just because they use a red color.

UPDATE public.agenda_events
SET title_locked = true
WHERE title_locked = false
  AND title IS NOT NULL
  AND btrim(title) <> ''
  AND title <> ('Reuniao com ' || COALESCE(NULLIF(btrim(client_name), ''), 'Lead sem nome'));

CREATE OR REPLACE FUNCTION public.ensure_agenda_event_title()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fallback_name TEXT;
  default_title TEXT;
  old_default_title TEXT;
BEGIN
  fallback_name := COALESCE(NULLIF(btrim(NEW.client_name), ''), 'Lead sem nome');
  NEW.client_name := fallback_name;
  default_title := 'Reuniao com ' || fallback_name;

  IF TG_OP = 'UPDATE' THEN
    old_default_title := 'Reuniao com ' || COALESCE(NULLIF(btrim(OLD.client_name), ''), 'Lead sem nome');

    IF NEW.title IS NULL OR btrim(NEW.title) = '' THEN
      NEW.title := COALESCE(OLD.title, default_title);
    ELSE
      NEW.title := normalizeMeetingTitle(NEW.title);
    END IF;

    NEW.title_locked := COALESCE(OLD.title_locked, false) OR NEW.title <> default_title;
  ELSE
    old_default_title := default_title;

    IF NEW.title IS NULL OR btrim(NEW.title) = '' THEN
      NEW.title := default_title;
    ELSE
      NEW.title := normalizeMeetingTitle(NEW.title);
    END IF;

    NEW.title_locked := COALESCE(NEW.title_locked, false) OR NEW.title <> default_title;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_agenda_event_title ON public.agenda_events;
CREATE TRIGGER trg_ensure_agenda_event_title
BEFORE INSERT OR UPDATE OF title, client_name, pipeline_client_id
ON public.agenda_events
FOR EACH ROW
EXECUTE FUNCTION public.ensure_agenda_event_title();

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
  existing_title TEXT;
  existing_title_locked BOOLEAN;
  default_title TEXT;
  resolved_title TEXT;
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
    WHEN NEW.stage IN ('NO_SHOW', 'PERDIDO') THEN '#FF0000'
    WHEN NEW.stage IN ('TAXA_INTERESSE', 'NEGOCIACAO', 'FECHADO') THEN '#66FF00'
    ELSE '#3B82F6'
  END;
  default_title := 'Reuniao com ' || COALESCE(NULLIF(NEW.client_name, ''), 'Lead sem nome');

  SELECT ae.id, ae.title, ae.title_locked
    INTO agenda_event_id, existing_title, existing_title_locked
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

  resolved_title := CASE
    WHEN agenda_event_id IS NOT NULL
      THEN COALESCE(NULLIF(btrim(existing_title), ''), default_title)
    ELSE default_title
  END;

  IF agenda_event_id IS NOT NULL THEN
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
      color = agenda_color,
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

  SELECT ag.id
    INTO agenda_lead_id
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
