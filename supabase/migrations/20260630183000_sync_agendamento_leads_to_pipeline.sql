-- Ensure agendamento leads are mirrored into the commercial pipeline
-- so a lead created in scheduling also appears for every CRM user/device.

CREATE OR REPLACE FUNCTION public.commercial_agendamento_status_to_stage(status_value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE COALESCE(status_value, 'NOVO_LEAD')
    WHEN 'NO_SHOW' THEN 'NO_SHOW'
    WHEN 'TAXA_INTERESSE' THEN 'TAXA_INTERESSE'
    WHEN 'NEGOCIACAO' THEN 'NEGOCIACAO'
    WHEN 'PERDIDO' THEN 'PERDIDO'
    WHEN 'FECHADO' THEN 'FECHADO'
    ELSE 'NOVO'
  END;
$$;

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
  -- Avoid recursive work when this trigger updates the same row again.
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
    public.commercial_agendamento_status_to_stage(NEW.status),
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
AFTER INSERT OR UPDATE OF
  nome,
  telefone,
  data,
  horario,
  horario_especifico,
  tem_socio,
  tem_mkt,
  tem_secretaria,
  salao_ou_clinica,
  faturamento,
  funil,
  status,
  agendado_via,
  created_by_user_id,
  pipeline_client_id
ON public.agendamento_leads
FOR EACH ROW
EXECUTE FUNCTION public.sync_agendamento_lead_to_pipeline();
