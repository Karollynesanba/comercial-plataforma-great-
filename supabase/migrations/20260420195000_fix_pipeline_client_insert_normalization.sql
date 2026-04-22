-- Normalize the commercial pipeline -> agenda projection so new lead inserts
-- never fail because of legacy agenda constraints.

CREATE OR REPLACE FUNCTION public.commercial_yes_no(value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE UPPER(COALESCE(TRIM(value), ''))
    WHEN 'SIM' THEN 'SIM'
    ELSE 'NAO'
  END;
$$;

CREATE OR REPLACE FUNCTION public.commercial_pipeline_faturamento_to_agendamento(faturamento_value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE COALESCE(faturamento_value, 'NAO_INFORMADO')
    WHEN '0_A_10K' THEN '0_A_15K'
    WHEN '10K_A_20K' THEN '15K_A_30K'
    WHEN '20K_A_30K' THEN '30K_A_50K'
    WHEN '30K_A_50K' THEN '30K_A_50K'
    WHEN '50K_A_80K' THEN '50K_A_100K'
    WHEN '80K_A_100K' THEN '50K_A_100K'
    WHEN '100K_A_150K' THEN '100K_PLUS'
    WHEN '150K_A_250K' THEN '100K_PLUS'
    WHEN '250K_A_400K' THEN '100K_PLUS'
    WHEN '400K_A_600K' THEN '100K_PLUS'
    WHEN '600K_A_1M' THEN '100K_PLUS'
    WHEN '1M_PLUS' THEN '100K_PLUS'
    WHEN '0_A_15K' THEN '0_A_15K'
    WHEN '15K_A_30K' THEN '15K_A_30K'
    WHEN '50K_A_100K' THEN '50K_A_100K'
    WHEN '100K_PLUS' THEN '100K_PLUS'
    ELSE '0_A_15K'
  END;
$$;

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
  normalized_faturamento TEXT;
BEGIN
  event_date := COALESCE(NULLIF(trim(NEW.meeting_date), ''), to_char(COALESCE(NEW.created_at, now()), 'YYYY-MM-DD'))::DATE;
  event_time := COALESCE(NULLIF(trim(NEW.meeting_time), ''), '09:00')::TIME;
  normalized_phone := regexp_replace(COALESCE(NEW.telefone, ''), '\D', '', 'g');
  normalized_faturamento := public.commercial_pipeline_faturamento_to_agendamento(NEW.faturamento);
  agenda_color := CASE
    WHEN NEW.stage IN ('NO_SHOW', 'PERDIDO') THEN '#FF0000'
    WHEN NEW.stage IN ('TAXA_INTERESSE', 'NEGOCIACAO', 'FECHADO') THEN '#66FF00'
    ELSE '#3B82F6'
  END;

  INSERT INTO public.agenda_events (
    pipeline_client_id,
    title,
    description,
    notes,
    client_name,
    client_phone,
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
    NEW.id,
    'Reuniao com ' || COALESCE(NULLIF(NEW.client_name, ''), 'Lead sem nome'),
    'Lead do Pipeline - ' || COALESCE(NULLIF(NEW.criativo, ''), 'NAO IDENTIFICADO'),
    NEW.notes,
    NEW.client_name,
    normalized_phone,
    event_date,
    event_time,
    60,
    NULL,
    agenda_color,
    false,
    false,
    NEW.created_by_user_id,
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
    event_date = EXCLUDED.event_date,
    event_time = EXCLUDED.event_time,
    color = EXCLUDED.color,
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
    NEW.id,
    to_char(event_date, 'DD/MM/YYYY'),
    NEW.client_name,
    normalized_phone,
    public.commercial_time_to_period(NEW.meeting_time),
    substring(NEW.meeting_time from 1 for 5),
    public.commercial_yes_no(NEW.tem_socio),
    public.commercial_yes_no(NEW.tem_mkt),
    public.commercial_yes_no(NEW.tem_secretaria),
    COALESCE(NULLIF(NEW.salao_ou_clinica, ''), 'NAO_INFORMADO'),
    normalized_faturamento,
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

  RETURN NEW;
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
