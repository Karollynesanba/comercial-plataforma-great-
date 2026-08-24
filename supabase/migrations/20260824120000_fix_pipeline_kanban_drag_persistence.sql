CREATE OR REPLACE FUNCTION public.commercial_pipeline_client_upsert_secure(payload jsonb)
RETURNS public.pipeline_clients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  saved_row public.pipeline_clients;
  requested_id uuid;
  input_id text;
BEGIN
  input_id := NULLIF(BTRIM(COALESCE(payload->>'id', '')), '');
  IF input_id IS NOT NULL AND input_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    requested_id := input_id::uuid;
  ELSE
    requested_id := gen_random_uuid();
  END IF;

  INSERT INTO public.pipeline_clients (
    id,
    ativo,
    client_name,
    clinic_name,
    telefone,
    vendedor,
    criativo,
    funil,
    equipe,
    faturamento,
    faturamento_personalizado,
    pode_investir,
    pacote,
    periodo,
    indicacao,
    entrada,
    is_mrr,
    mrr_entrada,
    mrr_remaining,
    data_entrada,
    stage,
    last_stage_change,
    lost_reason,
    no_show_reason,
    notes,
    agendado_por,
    agendado_via,
    pagador_anuncio,
    tem_socio,
    tem_mkt,
    tem_secretaria,
    salao_ou_clinica,
    profession,
    meeting_date,
    meeting_time,
    followup_done,
    created_by_user_id,
    updated_at
  )
  VALUES (
    requested_id,
    COALESCE(NULLIF(payload->>'ativo', '')::boolean, true),
    COALESCE(NULLIF(payload->>'client_name', ''), 'Lead sem nome'),
    NULLIF(payload->>'clinic_name', ''),
    NULLIF(payload->>'telefone', ''),
    NULLIF(payload->>'vendedor', ''),
    NULLIF(payload->>'criativo', ''),
    NULLIF(payload->>'funil', ''),
    NULLIF(payload->>'equipe', ''),
    NULLIF(payload->>'faturamento', ''),
    NULLIF(payload->>'faturamento_personalizado', ''),
    NULLIF(payload->>'pode_investir', ''),
    NULLIF(payload->>'pacote', ''),
    NULLIF(payload->>'periodo', ''),
    NULLIF(payload->>'indicacao', ''),
    COALESCE(NULLIF(payload->>'entrada', '')::numeric, 0),
    COALESCE(NULLIF(payload->>'is_mrr', '')::boolean, false),
    COALESCE(NULLIF(payload->>'mrr_entrada', '')::numeric, 0),
    COALESCE(NULLIF(payload->>'mrr_remaining', '')::numeric, 0),
    COALESCE(NULLIF(payload->>'data_entrada', '')::timestamptz, now()),
    COALESCE(NULLIF(payload->>'stage', ''), 'NOVO'),
    NULLIF(payload->>'last_stage_change', '')::timestamptz,
    NULLIF(payload->>'lost_reason', ''),
    NULLIF(payload->>'no_show_reason', ''),
    NULLIF(payload->>'notes', ''),
    NULLIF(payload->>'agendado_por', ''),
    NULLIF(payload->>'agendado_via', ''),
    NULLIF(payload->>'pagador_anuncio', ''),
    NULLIF(payload->>'tem_socio', ''),
    NULLIF(payload->>'tem_mkt', ''),
    NULLIF(payload->>'tem_secretaria', ''),
    NULLIF(payload->>'salao_ou_clinica', ''),
    NULLIF(payload->>'profession', ''),
    NULLIF(payload->>'meeting_date', ''),
    NULLIF(payload->>'meeting_time', ''),
    COALESCE(NULLIF(payload->>'followup_done', '')::boolean, false),
    CASE
      WHEN NULLIF(payload->>'created_by_user_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        THEN NULLIF(payload->>'created_by_user_id', '')::uuid
      ELSE NULL
    END,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    ativo = EXCLUDED.ativo,
    client_name = EXCLUDED.client_name,
    clinic_name = EXCLUDED.clinic_name,
    telefone = EXCLUDED.telefone,
    vendedor = EXCLUDED.vendedor,
    criativo = EXCLUDED.criativo,
    funil = EXCLUDED.funil,
    equipe = EXCLUDED.equipe,
    faturamento = EXCLUDED.faturamento,
    faturamento_personalizado = EXCLUDED.faturamento_personalizado,
    pode_investir = EXCLUDED.pode_investir,
    pacote = EXCLUDED.pacote,
    periodo = EXCLUDED.periodo,
    indicacao = EXCLUDED.indicacao,
    entrada = EXCLUDED.entrada,
    is_mrr = EXCLUDED.is_mrr,
    mrr_entrada = EXCLUDED.mrr_entrada,
    mrr_remaining = EXCLUDED.mrr_remaining,
    data_entrada = EXCLUDED.data_entrada,
    stage = EXCLUDED.stage,
    last_stage_change = EXCLUDED.last_stage_change,
    lost_reason = EXCLUDED.lost_reason,
    no_show_reason = EXCLUDED.no_show_reason,
    notes = EXCLUDED.notes,
    agendado_por = EXCLUDED.agendado_por,
    agendado_via = EXCLUDED.agendado_via,
    pagador_anuncio = EXCLUDED.pagador_anuncio,
    tem_socio = EXCLUDED.tem_socio,
    tem_mkt = EXCLUDED.tem_mkt,
    tem_secretaria = EXCLUDED.tem_secretaria,
    salao_ou_clinica = EXCLUDED.salao_ou_clinica,
    profession = EXCLUDED.profession,
    meeting_date = EXCLUDED.meeting_date,
    meeting_time = EXCLUDED.meeting_time,
    followup_done = EXCLUDED.followup_done,
    created_by_user_id = COALESCE(EXCLUDED.created_by_user_id, public.pipeline_clients.created_by_user_id),
    updated_at = now()
  RETURNING * INTO saved_row;

  RETURN saved_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.commercial_pipeline_client_upsert_secure(jsonb) TO anon, authenticated;
