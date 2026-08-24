CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.sync_agenda_event_to_agendamento_lead_secure()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lead_row public.agendamento_leads%ROWTYPE;
  lead_id UUID;
  lead_date TEXT;
  lead_time TEXT;
  lead_period TEXT;
  lead_status TEXT;
  event_phone_digits TEXT;
  lead_phone_digits TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  lead_date := COALESCE(NULLIF(NEW.event_date::text, ''), to_char(now(), 'YYYY-MM-DD'));
  lead_time := COALESCE(NULLIF(LEFT(NEW.event_time::text, 5), ''), '09:00');

  lead_period := CASE
    WHEN COALESCE(NULLIF(LEFT(lead_time, 2), ''), '09')::int < 12 THEN 'MANHA'
    WHEN COALESCE(NULLIF(LEFT(lead_time, 2), ''), '09')::int < 18 THEN 'TARDE'
    ELSE 'NOITE'
  END;

  lead_status := CASE
    WHEN NEW.lead_stage = 'NO_SHOW' THEN 'NO_SHOW'
    WHEN NEW.lead_stage = 'TAXA_INTERESSE' THEN 'TAXA_INTERESSE'
    WHEN NEW.lead_stage = 'NEGOCIACAO' THEN 'NEGOCIACAO'
    WHEN NEW.lead_stage = 'PERDIDO' THEN 'PERDIDO'
    WHEN NEW.lead_stage = 'FECHADO' THEN 'FECHADO'
    ELSE 'NOVO_LEAD'
  END;

  event_phone_digits := regexp_replace(COALESCE(NEW.client_phone, ''), '\D', '', 'g');

  SELECT *
  INTO lead_row
  FROM public.agendamento_leads al
  WHERE
    (NEW.pipeline_client_id IS NOT NULL AND al.pipeline_client_id = NEW.pipeline_client_id)
    OR al.agenda_event_id = NEW.id
    OR (
      event_phone_digits <> ''
      AND regexp_replace(COALESCE(al.telefone, ''), '\D', '', 'g') = event_phone_digits
      AND COALESCE(al.agenda_event_date, al.data) = lead_date
    )
    OR (
      event_phone_digits <> ''
      AND regexp_replace(COALESCE(al.telefone, ''), '\D', '', 'g') = event_phone_digits
    )
  ORDER BY al.updated_at DESC NULLS LAST, al.created_at DESC NULLS LAST, al.id DESC
  LIMIT 1;

  lead_id := COALESCE(lead_row.id, gen_random_uuid());
  lead_phone_digits := regexp_replace(COALESCE(lead_row.telefone, ''), '\D', '', 'g');

  INSERT INTO public.agendamento_leads (
    id,
    data,
    nome,
    telefone,
    horario,
    tem_socio,
    tem_mkt,
    tem_secretaria,
    salao_ou_clinica,
    faturamento,
    pode_investir,
    agendado_via,
    funil,
    profession,
    status,
    created_by_user_id,
    created_at,
    updated_at,
    pipeline_client_id,
    agenda_event_id,
    agenda_event_date,
    agenda_event_time,
    agenda_event_title
  )
  VALUES (
    lead_id,
    COALESCE(NULLIF(lead_row.data, ''), lead_date),
    COALESCE(NULLIF(lead_row.nome, ''), NULLIF(NEW.client_name, ''), 'Lead sem nome'),
    COALESCE(NULLIF(lead_row.telefone, ''), NULLIF(NEW.client_phone, ''), ''),
    COALESCE(NULLIF(lead_row.horario, ''), lead_period),
    COALESCE(NULLIF(lead_row.tem_socio, ''), 'NAO'),
    COALESCE(NULLIF(lead_row.tem_mkt, ''), 'NAO'),
    COALESCE(NULLIF(lead_row.tem_secretaria, ''), 'NAO_SEI'),
    COALESCE(NULLIF(lead_row.salao_ou_clinica, ''), NULLIF(NEW.clinic_name, ''), 'NAO_INFORMADO'),
    COALESCE(NULLIF(lead_row.faturamento, ''), 'NAO_INFORMADO'),
    COALESCE(NULLIF(lead_row.pode_investir, ''), NULL),
    COALESCE(NULLIF(lead_row.agendado_via, ''), NULL),
    COALESCE(NULLIF(lead_row.funil, ''), NULLIF(NEW.creative_source, ''), 'NAO IDENTIFICADO'),
    COALESCE(NULLIF(lead_row.profession, ''), NULL),
    COALESCE(NULLIF(lead_row.status, ''), lead_status),
    COALESCE(NEW.created_by_user_id, lead_row.created_by_user_id),
    COALESCE(lead_row.created_at, NEW.created_at, now()),
    now(),
    COALESCE(NEW.pipeline_client_id, lead_row.pipeline_client_id),
    NEW.id,
    lead_date,
    lead_time,
    COALESCE(NULLIF(NEW.title, ''), lead_row.agenda_event_title, 'Reuniao com ' || COALESCE(NULLIF(NEW.client_name, ''), 'Lead sem nome'))
  )
  ON CONFLICT (id) DO UPDATE SET
    data = EXCLUDED.data,
    nome = EXCLUDED.nome,
    telefone = EXCLUDED.telefone,
    horario = EXCLUDED.horario,
    tem_socio = EXCLUDED.tem_socio,
    tem_mkt = EXCLUDED.tem_mkt,
    tem_secretaria = EXCLUDED.tem_secretaria,
    salao_ou_clinica = EXCLUDED.salao_ou_clinica,
    faturamento = EXCLUDED.faturamento,
    pode_investir = EXCLUDED.pode_investir,
    agendado_via = EXCLUDED.agendado_via,
    funil = EXCLUDED.funil,
    profession = EXCLUDED.profession,
    status = EXCLUDED.status,
    created_by_user_id = COALESCE(EXCLUDED.created_by_user_id, public.agendamento_leads.created_by_user_id),
    updated_at = now(),
    pipeline_client_id = COALESCE(EXCLUDED.pipeline_client_id, public.agendamento_leads.pipeline_client_id),
    agenda_event_id = EXCLUDED.agenda_event_id,
    agenda_event_date = EXCLUDED.agenda_event_date,
    agenda_event_time = EXCLUDED.agenda_event_time,
    agenda_event_title = EXCLUDED.agenda_event_title;

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'sync_agenda_event_to_agendamento_lead_secure failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_agendamento_lead_to_agenda_event_secure()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_row public.agenda_events%ROWTYPE;
  event_id UUID;
  event_date TEXT;
  event_time TEXT;
  event_title TEXT;
  event_status TEXT;
  lead_phone_digits TEXT;
  event_phone_digits TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  event_date := CASE
    WHEN NULLIF(NEW.agenda_event_date, '') IS NOT NULL THEN NEW.agenda_event_date
    WHEN NEW.data ~ '^\d{4}-\d{2}-\d{2}$' THEN NEW.data
    WHEN NEW.data ~ '^\d{2}/\d{2}/\d{4}$' THEN to_char(to_date(NEW.data, 'DD/MM/YYYY'), 'YYYY-MM-DD')
    ELSE to_char(now(), 'YYYY-MM-DD')
  END;

  event_time := COALESCE(NULLIF(NEW.agenda_event_time, ''), '09:00:00');
  event_title := COALESCE(NULLIF(NEW.agenda_event_title, ''), 'Reuniao com ' || COALESCE(NULLIF(NEW.nome, ''), 'Lead sem nome'));

  event_status := CASE
    WHEN NEW.status = 'NO_SHOW' THEN 'NO_SHOW'
    WHEN NEW.status = 'TAXA_INTERESSE' THEN 'TAXA_INTERESSE'
    WHEN NEW.status = 'NEGOCIACAO' THEN 'NEGOCIACAO'
    WHEN NEW.status = 'PERDIDO' THEN 'PERDIDO'
    WHEN NEW.status = 'FECHADO' THEN 'FECHADO'
    ELSE 'NOVO'
  END;

  lead_phone_digits := regexp_replace(COALESCE(NEW.telefone, ''), '\D', '', 'g');

  SELECT *
  INTO event_row
  FROM public.agenda_events ae
  WHERE
    (NEW.pipeline_client_id IS NOT NULL AND ae.pipeline_client_id = NEW.pipeline_client_id)
    OR ae.id = NEW.agenda_event_id
    OR (
      lead_phone_digits <> ''
      AND regexp_replace(COALESCE(ae.client_phone, ''), '\D', '', 'g') = lead_phone_digits
      AND ae.event_date::text = event_date
      AND LEFT(ae.event_time::text, 5) = LEFT(event_time, 5)
    )
    OR (
      lead_phone_digits <> ''
      AND regexp_replace(COALESCE(ae.client_phone, ''), '\D', '', 'g') = lead_phone_digits
    )
  ORDER BY ae.updated_at DESC NULLS LAST, ae.created_at DESC NULLS LAST, ae.id DESC
  LIMIT 1;

  event_id := COALESCE(event_row.id, gen_random_uuid());
  event_phone_digits := regexp_replace(COALESCE(event_row.client_phone, ''), '\D', '', 'g');

  INSERT INTO public.agenda_events (
    id,
    title,
    description,
    notes,
    client_name,
    client_phone,
    clinic_name,
    event_date,
    event_time,
    duration_minutes,
    meeting_link,
    scheduled_by,
    lead_stage,
    creative_source,
    color,
    reminder_2h_sent,
    reminder_30min_sent,
    created_by_user_id,
    assigned_closer_id,
    team_id,
    pipeline_client_id,
    updated_at
  )
  VALUES (
    event_id,
    event_title,
    COALESCE(event_row.description, CASE WHEN NEW.funil IS NOT NULL THEN 'Lead de Agendamento - ' || NEW.funil ELSE 'Lead de Agendamento' END),
    COALESCE(event_row.notes, NEW.notes, NULL),
    COALESCE(NULLIF(NEW.nome, ''), event_row.client_name, 'Lead sem nome'),
    COALESCE(NULLIF(NEW.telefone, ''), event_row.client_phone, ''),
    COALESCE(NULLIF(NEW.salao_ou_clinica, ''), event_row.clinic_name, NULLIF(NEW.nome, ''), 'Lead sem nome'),
    event_date::date,
    event_time::time,
    COALESCE(event_row.duration_minutes, 60),
    COALESCE(event_row.meeting_link, NULL),
    COALESCE(NULLIF(NEW.agendado_via, ''), event_row.scheduled_by, NULL),
    COALESCE(event_row.lead_stage, event_status),
    COALESCE(NULLIF(NEW.funil, ''), event_row.creative_source, NULL),
    COALESCE(event_row.color, '#3B82F6'),
    COALESCE(event_row.reminder_2h_sent, false),
    COALESCE(event_row.reminder_30min_sent, false),
    COALESCE(NEW.created_by_user_id, event_row.created_by_user_id, NULL),
    COALESCE(event_row.assigned_closer_id, NULL),
    COALESCE(event_row.team_id, NULL),
    COALESCE(NEW.pipeline_client_id, event_row.pipeline_client_id, NULL),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    notes = EXCLUDED.notes,
    client_name = EXCLUDED.client_name,
    client_phone = EXCLUDED.client_phone,
    clinic_name = EXCLUDED.clinic_name,
    event_date = EXCLUDED.event_date,
    event_time = EXCLUDED.event_time,
    duration_minutes = EXCLUDED.duration_minutes,
    meeting_link = EXCLUDED.meeting_link,
    scheduled_by = EXCLUDED.scheduled_by,
    lead_stage = EXCLUDED.lead_stage,
    creative_source = EXCLUDED.creative_source,
    color = EXCLUDED.color,
    reminder_2h_sent = EXCLUDED.reminder_2h_sent,
    reminder_30min_sent = EXCLUDED.reminder_30min_sent,
    created_by_user_id = COALESCE(EXCLUDED.created_by_user_id, public.agenda_events.created_by_user_id),
    assigned_closer_id = COALESCE(EXCLUDED.assigned_closer_id, public.agenda_events.assigned_closer_id),
    team_id = COALESCE(EXCLUDED.team_id, public.agenda_events.team_id),
    pipeline_client_id = COALESCE(EXCLUDED.pipeline_client_id, public.agenda_events.pipeline_client_id),
    updated_at = now();

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'sync_agendamento_lead_to_agenda_event_secure failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_agenda_event_to_agendamento_lead_secure ON public.agenda_events;
CREATE TRIGGER trg_sync_agenda_event_to_agendamento_lead_secure
AFTER INSERT OR UPDATE ON public.agenda_events
FOR EACH ROW
EXECUTE FUNCTION public.sync_agenda_event_to_agendamento_lead_secure();

DROP TRIGGER IF EXISTS trg_sync_agendamento_lead_to_agenda_event_secure ON public.agendamento_leads;
CREATE TRIGGER trg_sync_agendamento_lead_to_agenda_event_secure
AFTER INSERT OR UPDATE ON public.agendamento_leads
FOR EACH ROW
EXECUTE FUNCTION public.sync_agendamento_lead_to_agenda_event_secure();

GRANT EXECUTE ON FUNCTION public.sync_agenda_event_to_agendamento_lead_secure() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_agendamento_lead_to_agenda_event_secure() TO anon, authenticated;
