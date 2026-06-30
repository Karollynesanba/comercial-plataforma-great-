-- Re-apply the commercial pipeline -> agendamento contract so lead creation
-- never fails because of stale trigger logic on the scheduling projection.

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
BEGIN
  event_date := COALESCE(NULLIF(trim(NEW.meeting_date), ''), to_char(COALESCE(NEW.created_at, now()), 'YYYY-MM-DD'))::DATE;
  event_time := COALESCE(NULLIF(trim(NEW.meeting_time), ''), '09:00')::TIME;
  normalized_phone := regexp_replace(COALESCE(NEW.telefone, ''), '\D', '', 'g');
  agenda_color := CASE
    WHEN NEW.stage IN ('NO_SHOW', 'PERDIDO') THEN '#FF0000'
    WHEN NEW.stage IN ('TAXA_INTERESSE', 'NEGOCIACAO', 'FECHADO') THEN '#66FF00'
    ELSE '#3B82F6'
  END;
  -- Convert the pipeline text team key into the UUID expected by agenda_events.team_id.

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
    event_date,
    event_time,
    60,
    NULL,
    agenda_color,
    false,
    false,
    NULL,
    CASE
      WHEN NEW.equipe = 'team-equipe-7' THEN 'ac2c282a-54a6-491e-b133-90890e2d299d'::uuid
      WHEN NEW.equipe = 'team-tropa-de-elite' THEN '5090ad67-315d-45f5-b4b2-5a1a73ae201d'::uuid
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
    NEW.id,
    to_char(event_date, 'DD/MM/YYYY'),
    NEW.client_name,
    normalized_phone,
    public.commercial_time_to_period(NEW.meeting_time),
    substring(NEW.meeting_time from 1 for 5),
    COALESCE(NULLIF(NEW.tem_socio, ''), 'NAO'),
    COALESCE(NULLIF(NEW.tem_mkt, ''), 'NAO'),
    COALESCE(NULLIF(NEW.tem_secretaria, ''), 'NAO_SEI'),
    COALESCE(NULLIF(NEW.salao_ou_clinica, ''), 'NAO_INFORMADO'),
    public.commercial_pipeline_faturamento_to_agendamento(NEW.faturamento),
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

DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  FOR constraint_record IN
    SELECT conrelid::regclass AS table_name, conname
    FROM pg_constraint
    WHERE conrelid IN (
      'public.pipeline_clients'::regclass,
      'public.agendamento_leads'::regclass
    )
    AND contype = 'c'
    AND (
      conname ILIKE '%tem_socio%' OR
      conname ILIKE '%tem_mkt%' OR
      conname ILIKE '%tem_secretaria%' OR
      conname ILIKE '%faturamento%'
    )
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', constraint_record.table_name, constraint_record.conname);
  END LOOP;
END $$;

ALTER TABLE public.pipeline_clients
  ADD CONSTRAINT pipeline_clients_tem_socio_check
    CHECK (tem_socio IN ('SIM', 'NAO', 'NAO_SEI')) NOT VALID;
ALTER TABLE public.pipeline_clients
  ADD CONSTRAINT pipeline_clients_tem_mkt_check
    CHECK (tem_mkt IN ('SIM', 'NAO', 'NAO_SEI')) NOT VALID;
ALTER TABLE public.pipeline_clients
  ADD CONSTRAINT pipeline_clients_tem_secretaria_check
    CHECK (tem_secretaria IN ('SIM', 'NAO', 'NAO_SEI')) NOT VALID;
ALTER TABLE public.pipeline_clients
  ADD CONSTRAINT pipeline_clients_faturamento_check
  CHECK (faturamento IN (
    '0_A_10K',
    '10K_A_20K',
    '20K_A_30K',
    '30K_A_50K',
    '50K_A_80K',
    '80K_A_100K',
    '100K_A_150K',
    '150K_A_250K',
    '250K_A_400K',
    '400K_A_600K',
    '600K_A_1M',
    '1M_PLUS',
    '0_A_15K',
    '15K_A_30K',
    '50K_A_100K',
    '100K_PLUS',
    'NAO_INFORMADO',
    'PERSONALIZADO'
  ));

ALTER TABLE public.agendamento_leads
  ADD CONSTRAINT agendamento_leads_tem_socio_check
    CHECK (tem_socio IN ('SIM', 'NAO', 'NAO_SEI')) NOT VALID;
ALTER TABLE public.agendamento_leads
  ADD CONSTRAINT agendamento_leads_tem_mkt_check
    CHECK (tem_mkt IN ('SIM', 'NAO', 'NAO_SEI')) NOT VALID;
ALTER TABLE public.agendamento_leads
  ADD CONSTRAINT agendamento_leads_tem_secretaria_check
    CHECK (tem_secretaria IN ('SIM', 'NAO', 'NAO_SEI')) NOT VALID;
ALTER TABLE public.agendamento_leads
  ADD CONSTRAINT agendamento_leads_faturamento_check
  CHECK (faturamento IN (
    '0_A_10K',
    '10K_A_20K',
    '20K_A_30K',
    '30K_A_50K',
    '50K_A_80K',
    '80K_A_100K',
    '100K_A_150K',
    '150K_A_250K',
    '250K_A_400K',
    '400K_A_600K',
    '600K_A_1M',
    '1M_PLUS',
    '0_A_15K',
    '15K_A_30K',
    '50K_A_100K',
    '100K_PLUS',
    'NAO_INFORMADO',
    'PERSONALIZADO'
  ));
