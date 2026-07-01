-- Keep agenda edits persistent across devices.
-- This migration does two things:
-- 1) prevents agenda UPDATEs from creating/updating CRM leads again;
-- 2) makes CRM -> agenda sync preserve manual agenda fields instead of
--    rebuilding the card from pipeline defaults on every refresh.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.agenda_events
  ADD COLUMN IF NOT EXISTS pipeline_client_id UUID;

ALTER TABLE public.agendamento_leads
  ADD COLUMN IF NOT EXISTS pipeline_client_id UUID,
  ADD COLUMN IF NOT EXISTS agenda_event_id UUID,
  ADD COLUMN IF NOT EXISTS agenda_event_date TEXT,
  ADD COLUMN IF NOT EXISTS agenda_event_time TEXT,
  ADD COLUMN IF NOT EXISTS agenda_event_title TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS agenda_events_pipeline_client_id_key
  ON public.agenda_events (pipeline_client_id)
  WHERE pipeline_client_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS agendamento_leads_pipeline_client_id_key
  ON public.agendamento_leads (pipeline_client_id)
  WHERE pipeline_client_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_agendamento_lead_to_pipeline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_phone TEXT;
  matching_pipeline_id UUID;
  target_pipeline_id UUID;
  target_meeting_date TEXT;
  target_meeting_time TEXT;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  normalized_phone := regexp_replace(COALESCE(NEW.telefone, ''), '\D', '', 'g');
  target_meeting_time := LEFT(COALESCE(NULLIF(NEW.horario_especifico, ''), '09:00'), 5);

  IF NEW.data ~ '^\d{2}/\d{2}/\d{4}$' THEN
    target_meeting_date := to_char(to_date(NEW.data, 'DD/MM/YYYY'), 'YYYY-MM-DD');
  ELSE
    target_meeting_date := to_char(COALESCE(NEW.created_at, now()), 'YYYY-MM-DD');
  END IF;

  IF NEW.pipeline_client_id IS NOT NULL THEN
    target_pipeline_id := NEW.pipeline_client_id;
  ELSE
    SELECT pc.id
      INTO matching_pipeline_id
    FROM public.pipeline_clients pc
    WHERE
      regexp_replace(COALESCE(pc.telefone, ''), '\D', '', 'g') = normalized_phone
      OR lower(btrim(COALESCE(pc.client_name, ''))) = lower(btrim(COALESCE(NEW.nome, '')))
    ORDER BY pc.updated_at DESC
    LIMIT 1;

    target_pipeline_id := COALESCE(matching_pipeline_id, gen_random_uuid());
  END IF;

  INSERT INTO public.pipeline_clients (
    id,
    ativo,
    client_name,
    clinic_name,
    telefone,
    criativo,
    equipe,
    faturamento,
    pacote,
    periodo,
    entrada,
    data_entrada,
    stage,
    last_stage_change,
    notes,
    agendado_via,
    tem_socio,
    tem_mkt,
    tem_secretaria,
    salao_ou_clinica,
    funil,
    meeting_date,
    meeting_time,
    created_by_user_id,
    created_at,
    updated_at
  )
  VALUES (
    target_pipeline_id,
    true,
    COALESCE(NULLIF(NEW.nome, ''), 'Lead sem nome'),
    COALESCE(NULLIF(NEW.nome, ''), 'Lead sem nome'),
    normalized_phone,
    COALESCE(NULLIF(NEW.funil, ''), 'NAO IDENTIFICADO'),
    'team-equipe-7',
    COALESCE(NULLIF(NEW.faturamento, ''), 'NAO_INFORMADO'),
    'COMPLETO',
    'MENSAL',
    0,
    COALESCE(NEW.created_at, now()),
    CASE
      WHEN NEW.status = 'NO_SHOW' THEN 'NO_SHOW'
      WHEN NEW.status = 'TAXA_INTERESSE' THEN 'TAXA_INTERESSE'
      WHEN NEW.status = 'NEGOCIACAO' THEN 'NEGOCIACAO'
      WHEN NEW.status = 'PERDIDO' THEN 'PERDIDO'
      WHEN NEW.status = 'FECHADO' THEN 'FECHADO'
      ELSE 'NOVO'
    END,
    COALESCE(NEW.updated_at, NEW.created_at, now()),
    NULL,
    NEW.agendado_via,
    COALESCE(NULLIF(NEW.tem_socio, ''), 'NAO'),
    COALESCE(NULLIF(NEW.tem_mkt, ''), 'NAO'),
    COALESCE(NULLIF(NEW.tem_secretaria, ''), 'NAO_SEI'),
    COALESCE(NULLIF(NEW.salao_ou_clinica, ''), 'NAO_INFORMADO'),
    COALESCE(NULLIF(NEW.funil, ''), 'NAO IDENTIFICADO'),
    target_meeting_date,
    target_meeting_time,
    NEW.created_by_user_id,
    COALESCE(NEW.created_at, now()),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    ativo = EXCLUDED.ativo,
    client_name = EXCLUDED.client_name,
    clinic_name = EXCLUDED.clinic_name,
    telefone = EXCLUDED.telefone,
    criativo = EXCLUDED.criativo,
    equipe = EXCLUDED.equipe,
    faturamento = EXCLUDED.faturamento,
    pacote = EXCLUDED.pacote,
    periodo = EXCLUDED.periodo,
    entrada = EXCLUDED.entrada,
    data_entrada = EXCLUDED.data_entrada,
    stage = EXCLUDED.stage,
    last_stage_change = EXCLUDED.last_stage_change,
    notes = EXCLUDED.notes,
    agendado_via = EXCLUDED.agendado_via,
    tem_socio = EXCLUDED.tem_socio,
    tem_mkt = EXCLUDED.tem_mkt,
    tem_secretaria = EXCLUDED.tem_secretaria,
    salao_ou_clinica = EXCLUDED.salao_ou_clinica,
    funil = EXCLUDED.funil,
    meeting_date = EXCLUDED.meeting_date,
    meeting_time = EXCLUDED.meeting_time,
    created_by_user_id = COALESCE(EXCLUDED.created_by_user_id, public.pipeline_clients.created_by_user_id),
    updated_at = now();

  UPDATE public.agendamento_leads
  SET
    pipeline_client_id = target_pipeline_id,
    updated_at = now()
  WHERE id = NEW.id
    AND (NEW.pipeline_client_id IS NULL OR NEW.pipeline_client_id <> target_pipeline_id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_agendamento_lead_to_pipeline ON public.agendamento_leads;
CREATE TRIGGER trg_sync_agendamento_lead_to_pipeline
AFTER INSERT
ON public.agendamento_leads
FOR EACH ROW
EXECUTE FUNCTION public.sync_agendamento_lead_to_pipeline();

CREATE OR REPLACE FUNCTION public.sync_pipeline_client_to_agenda_by_id(client_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pc RECORD;
  existing_event RECORD;
  exact_slot_event_id UUID;
  exact_slot_event_title TEXT;
  exact_slot_event_description TEXT;
  exact_slot_event_notes TEXT;
  exact_slot_event_client_name TEXT;
  exact_slot_event_client_phone TEXT;
  exact_slot_event_clinic_name TEXT;
  exact_slot_event_scheduled_by TEXT;
  exact_slot_event_lead_stage TEXT;
  exact_slot_event_creative_source TEXT;
  exact_slot_event_duration_minutes INTEGER;
  exact_slot_event_meeting_link TEXT;
  exact_slot_event_color TEXT;
  exact_slot_event_reminder_2h_sent BOOLEAN;
  exact_slot_event_reminder_30min_sent BOOLEAN;
  exact_slot_event_created_by_user_id UUID;
  existing_lead RECORD;
  exact_slot_lead RECORD;
  v_event_date DATE;
  v_event_time TIME;
  v_phone TEXT;
  v_title TEXT;
  v_description TEXT;
  v_color TEXT;
  v_status TEXT;
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
  v_description := 'Lead do Pipeline - ' || COALESCE(NULLIF(pc.criativo, ''), 'NAO IDENTIFICADO');
  v_color := CASE
    WHEN pc.stage IN ('NO_SHOW', 'PERDIDO') THEN '#FF0000'
    WHEN pc.stage IN ('TAXA_INTERESSE', 'NEGOCIACAO', 'FECHADO') THEN '#66FF00'
    ELSE '#3B82F6'
  END;
  v_status := CASE
    WHEN pc.stage = 'NO_SHOW' THEN 'NO_SHOW'
    WHEN pc.stage = 'TAXA_INTERESSE' THEN 'TAXA_INTERESSE'
    WHEN pc.stage = 'NEGOCIACAO' THEN 'NEGOCIACAO'
    WHEN pc.stage = 'PERDIDO' THEN 'PERDIDO'
    WHEN pc.stage = 'FECHADO' THEN 'FECHADO'
    ELSE 'NOVO_LEAD'
  END;

  SELECT *
  INTO existing_event
  FROM public.agenda_events ae
  WHERE ae.pipeline_client_id = pc.id
  ORDER BY ae.updated_at DESC, ae.created_at DESC, ae.id DESC
  LIMIT 1;

  IF existing_event.id IS NULL THEN
    SELECT
      ae.id,
      ae.title,
      ae.description,
      ae.notes,
      ae.client_name,
      ae.client_phone,
      ae.clinic_name,
      ae.scheduled_by,
      ae.lead_stage,
      ae.creative_source,
      ae.duration_minutes,
      ae.meeting_link,
      ae.color,
      ae.reminder_2h_sent,
      ae.reminder_30min_sent,
      ae.created_by_user_id
    INTO
      exact_slot_event_id,
      exact_slot_event_title,
      exact_slot_event_description,
      exact_slot_event_notes,
      exact_slot_event_client_name,
      exact_slot_event_client_phone,
      exact_slot_event_clinic_name,
      exact_slot_event_scheduled_by,
      exact_slot_event_lead_stage,
      exact_slot_event_creative_source,
      exact_slot_event_duration_minutes,
      exact_slot_event_meeting_link,
      exact_slot_event_color,
      exact_slot_event_reminder_2h_sent,
      exact_slot_event_reminder_30min_sent,
      exact_slot_event_created_by_user_id
    FROM public.agenda_events ae
    WHERE regexp_replace(COALESCE(ae.client_phone, ''), '\D', '', 'g') = v_phone
      AND ae.event_date = v_event_date
      AND ae.event_time = v_event_time
    ORDER BY ae.updated_at DESC, ae.created_at DESC, ae.id DESC
    LIMIT 1;
  END IF;

  IF existing_event.id IS NOT NULL THEN
    UPDATE public.agenda_events
    SET
      pipeline_client_id = pc.id,
      title = COALESCE(NULLIF(BTRIM(existing_event.title), ''), v_title),
      description = COALESCE(NULLIF(BTRIM(existing_event.description), ''), v_description),
      notes = COALESCE(existing_event.notes, pc.notes),
      client_name = COALESCE(NULLIF(BTRIM(existing_event.client_name), ''), pc.client_name),
      client_phone = COALESCE(NULLIF(BTRIM(existing_event.client_phone), ''), v_phone),
      clinic_name = COALESCE(NULLIF(BTRIM(existing_event.clinic_name), ''), pc.clinic_name, pc.client_name),
      scheduled_by = COALESCE(existing_event.scheduled_by, pc.agendado_por, pc.agendado_por),
      lead_stage = COALESCE(existing_event.lead_stage, pc.stage),
      creative_source = COALESCE(existing_event.creative_source, pc.criativo),
      event_date = v_event_date,
      event_time = v_event_time,
      duration_minutes = COALESCE(existing_event.duration_minutes, 60),
      meeting_link = existing_event.meeting_link,
      color = COALESCE(NULLIF(BTRIM(existing_event.color), ''), v_color),
      reminder_2h_sent = COALESCE(existing_event.reminder_2h_sent, false),
      reminder_30min_sent = COALESCE(existing_event.reminder_30min_sent, false),
      created_by_user_id = COALESCE(existing_event.created_by_user_id, pc.created_by_user_id),
      updated_at = now()
    WHERE id = existing_event.id;
  ELSIF exact_slot_event_id IS NOT NULL THEN
    UPDATE public.agenda_events
    SET
      pipeline_client_id = pc.id,
      title = COALESCE(NULLIF(BTRIM(exact_slot_event_title), ''), v_title),
      description = COALESCE(NULLIF(BTRIM(exact_slot_event_description), ''), v_description),
      notes = COALESCE(exact_slot_event_notes, pc.notes),
      client_name = COALESCE(NULLIF(BTRIM(exact_slot_event_client_name), ''), pc.client_name),
      client_phone = COALESCE(NULLIF(BTRIM(exact_slot_event_client_phone), ''), v_phone),
      clinic_name = COALESCE(NULLIF(BTRIM(exact_slot_event_clinic_name), ''), pc.clinic_name, pc.client_name),
      scheduled_by = COALESCE(exact_slot_event_scheduled_by, pc.agendado_por, pc.agendado_por),
      lead_stage = COALESCE(exact_slot_event_lead_stage, pc.stage),
      creative_source = COALESCE(exact_slot_event_creative_source, pc.criativo),
      event_date = v_event_date,
      event_time = v_event_time,
      duration_minutes = COALESCE(exact_slot_event_duration_minutes, 60),
      meeting_link = exact_slot_event_meeting_link,
      color = COALESCE(NULLIF(BTRIM(exact_slot_event_color), ''), v_color),
      reminder_2h_sent = COALESCE(exact_slot_event_reminder_2h_sent, false),
      reminder_30min_sent = COALESCE(exact_slot_event_reminder_30min_sent, false),
      created_by_user_id = COALESCE(exact_slot_event_created_by_user_id, pc.created_by_user_id),
      updated_at = now()
    WHERE id = exact_slot_event_id;
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
      v_description,
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

  SELECT *
  INTO existing_lead
  FROM public.agendamento_leads al
  WHERE al.pipeline_client_id = pc.id
  ORDER BY al.updated_at DESC, al.created_at DESC, al.id DESC
  LIMIT 1;

  IF existing_lead.id IS NULL THEN
    SELECT *
    INTO exact_slot_lead
    FROM public.agendamento_leads al
    WHERE regexp_replace(COALESCE(al.telefone, ''), '\D', '', 'g') = v_phone
      AND COALESCE(al.data, '') = TO_CHAR(v_event_date, 'DD/MM/YYYY')
      AND COALESCE(al.horario_especifico, '') = LEFT(TO_CHAR(v_event_time, 'HH24:MI:SS'), 5)
    ORDER BY al.updated_at DESC, al.created_at DESC, al.id DESC
    LIMIT 1;
  END IF;

  IF existing_lead.id IS NOT NULL THEN
    UPDATE public.agendamento_leads
    SET
      pipeline_client_id = pc.id,
      agenda_event_id = COALESCE(existing_lead.agenda_event_id, exact_slot_event_id, existing_event.id),
      agenda_event_date = TO_CHAR(v_event_date, 'YYYY-MM-DD'),
      agenda_event_time = LEFT(TO_CHAR(v_event_time, 'HH24:MI:SS'), 5),
      agenda_event_title = COALESCE(NULLIF(BTRIM(existing_lead.agenda_event_title), ''), COALESCE(NULLIF(BTRIM(existing_event.title), ''), NULLIF(BTRIM(exact_slot_event_title), ''), v_title)),
      data = TO_CHAR(v_event_date, 'DD/MM/YYYY'),
      nome = COALESCE(NULLIF(BTRIM(existing_lead.nome), ''), pc.client_name),
      telefone = COALESCE(NULLIF(BTRIM(existing_lead.telefone), ''), v_phone),
      horario = COALESCE(NULLIF(existing_lead.horario, ''), CASE
        WHEN EXTRACT(HOUR FROM v_event_time) < 12 THEN 'MANHA'
        WHEN EXTRACT(HOUR FROM v_event_time) < 18 THEN 'TARDE'
        ELSE 'NOITE'
      END),
      horario_especifico = COALESCE(NULLIF(existing_lead.horario_especifico, ''), LEFT(TO_CHAR(v_event_time, 'HH24:MI:SS'), 5)),
      tem_socio = COALESCE(NULLIF(existing_lead.tem_socio, ''), COALESCE(NULLIF(pc.tem_socio, ''), 'NAO')),
      tem_mkt = COALESCE(NULLIF(existing_lead.tem_mkt, ''), COALESCE(NULLIF(pc.tem_mkt, ''), 'NAO')),
      tem_secretaria = COALESCE(NULLIF(existing_lead.tem_secretaria, ''), COALESCE(NULLIF(pc.tem_secretaria, ''), 'NAO_SEI')),
      salao_ou_clinica = COALESCE(NULLIF(existing_lead.salao_ou_clinica, ''), COALESCE(NULLIF(pc.salao_ou_clinica, ''), 'NAO_INFORMADO')),
      faturamento = COALESCE(NULLIF(existing_lead.faturamento, ''), COALESCE(NULLIF(pc.faturamento, ''), 'NAO_INFORMADO')),
      pode_investir = COALESCE(existing_lead.pode_investir, pc.pode_investir),
      agendado_via = COALESCE(existing_lead.agendado_via, pc.agendado_via),
      funil = COALESCE(NULLIF(BTRIM(existing_lead.funil), ''), COALESCE(NULLIF(pc.criativo, ''), 'NAO IDENTIFICADO')),
      status = COALESCE(NULLIF(existing_lead.status, ''), v_status),
      created_by_user_id = COALESCE(existing_lead.created_by_user_id, pc.created_by_user_id),
      updated_at = now()
    WHERE id = existing_lead.id;
  ELSIF exact_slot_lead.id IS NOT NULL THEN
    UPDATE public.agendamento_leads
    SET
      pipeline_client_id = pc.id,
      agenda_event_id = COALESCE(exact_slot_lead.agenda_event_id, exact_slot_event_id, existing_event.id),
      agenda_event_date = TO_CHAR(v_event_date, 'YYYY-MM-DD'),
      agenda_event_time = LEFT(TO_CHAR(v_event_time, 'HH24:MI:SS'), 5),
      agenda_event_title = COALESCE(NULLIF(BTRIM(exact_slot_lead.agenda_event_title), ''), COALESCE(NULLIF(BTRIM(existing_event.title), ''), NULLIF(BTRIM(exact_slot_event_title), ''), v_title)),
      data = TO_CHAR(v_event_date, 'DD/MM/YYYY'),
      nome = COALESCE(NULLIF(BTRIM(exact_slot_lead.nome), ''), pc.client_name),
      telefone = COALESCE(NULLIF(BTRIM(exact_slot_lead.telefone), ''), v_phone),
      horario = COALESCE(NULLIF(exact_slot_lead.horario, ''), CASE
        WHEN EXTRACT(HOUR FROM v_event_time) < 12 THEN 'MANHA'
        WHEN EXTRACT(HOUR FROM v_event_time) < 18 THEN 'TARDE'
        ELSE 'NOITE'
      END),
      horario_especifico = COALESCE(NULLIF(exact_slot_lead.horario_especifico, ''), LEFT(TO_CHAR(v_event_time, 'HH24:MI:SS'), 5)),
      tem_socio = COALESCE(NULLIF(exact_slot_lead.tem_socio, ''), COALESCE(NULLIF(pc.tem_socio, ''), 'NAO')),
      tem_mkt = COALESCE(NULLIF(exact_slot_lead.tem_mkt, ''), COALESCE(NULLIF(pc.tem_mkt, ''), 'NAO')),
      tem_secretaria = COALESCE(NULLIF(exact_slot_lead.tem_secretaria, ''), COALESCE(NULLIF(pc.tem_secretaria, ''), 'NAO_SEI')),
      salao_ou_clinica = COALESCE(NULLIF(exact_slot_lead.salao_ou_clinica, ''), COALESCE(NULLIF(pc.salao_ou_clinica, ''), 'NAO_INFORMADO')),
      faturamento = COALESCE(NULLIF(exact_slot_lead.faturamento, ''), COALESCE(NULLIF(pc.faturamento, ''), 'NAO_INFORMADO')),
      pode_investir = COALESCE(exact_slot_lead.pode_investir, pc.pode_investir),
      agendado_via = COALESCE(exact_slot_lead.agendado_via, pc.agendado_via),
      funil = COALESCE(NULLIF(BTRIM(exact_slot_lead.funil), ''), COALESCE(NULLIF(pc.criativo, ''), 'NAO IDENTIFICADO')),
      status = COALESCE(NULLIF(exact_slot_lead.status, ''), v_status),
      created_by_user_id = COALESCE(exact_slot_lead.created_by_user_id, pc.created_by_user_id),
      updated_at = now()
    WHERE id = exact_slot_lead.id;
  ELSE
    INSERT INTO public.agendamento_leads (
      pipeline_client_id,
      agenda_event_id,
      agenda_event_date,
      agenda_event_time,
      agenda_event_title,
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
      existing_event.id,
      TO_CHAR(v_event_date, 'YYYY-MM-DD'),
      LEFT(TO_CHAR(v_event_time, 'HH24:MI:SS'), 5),
      v_title,
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
      v_status,
      pc.created_by_user_id,
      now()
    )
    ON CONFLICT (pipeline_client_id)
    WHERE pipeline_client_id IS NOT NULL
    DO UPDATE SET
      agenda_event_id = EXCLUDED.agenda_event_id,
      agenda_event_date = EXCLUDED.agenda_event_date,
      agenda_event_time = EXCLUDED.agenda_event_time,
      agenda_event_title = EXCLUDED.agenda_event_title,
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
