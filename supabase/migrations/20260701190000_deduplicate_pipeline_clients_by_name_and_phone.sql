-- Deduplicate CRM pipeline leads by normalized client name + normalized phone.
-- This keeps one row per person and re-links agenda projections to the survivor.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.commercial_normalize_lead_name(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(
    regexp_replace(
      regexp_replace(
        btrim(COALESCE(value, '')),
        '^\s*reuni[aã]o\s+com\s+',
        '',
        'i'
      ),
      '\s+',
      ' ',
      'g'
    )
  );
$$;

WITH ranked_pipeline_clients AS (
  SELECT
    pc.ctid,
    pc.id,
    NULLIF(regexp_replace(COALESCE(pc.telefone, ''), '\D', '', 'g'), '') AS normalized_phone,
    NULLIF(public.commercial_normalize_lead_name(pc.client_name), '') AS normalized_name,
    row_number() OVER (
      PARTITION BY
        NULLIF(regexp_replace(COALESCE(pc.telefone, ''), '\D', '', 'g'), ''),
        NULLIF(public.commercial_normalize_lead_name(pc.client_name), '')
      ORDER BY
        EXISTS (
          SELECT 1
          FROM public.agenda_events ae
          WHERE ae.pipeline_client_id = pc.id
        ) DESC,
        EXISTS (
          SELECT 1
          FROM public.agendamento_leads al
          WHERE al.pipeline_client_id = pc.id
        ) DESC,
        pc.ativo DESC,
        COALESCE(pc.updated_at, pc.created_at) DESC,
        COALESCE(pc.created_at, now()) ASC,
        pc.id ASC
    ) AS rn,
    first_value(pc.id) OVER (
      PARTITION BY
        NULLIF(regexp_replace(COALESCE(pc.telefone, ''), '\D', '', 'g'), ''),
        NULLIF(public.commercial_normalize_lead_name(pc.client_name), '')
      ORDER BY
        EXISTS (
          SELECT 1
          FROM public.agenda_events ae
          WHERE ae.pipeline_client_id = pc.id
        ) DESC,
        EXISTS (
          SELECT 1
          FROM public.agendamento_leads al
          WHERE al.pipeline_client_id = pc.id
        ) DESC,
        pc.ativo DESC,
        COALESCE(pc.updated_at, pc.created_at) DESC,
        COALESCE(pc.created_at, now()) ASC,
        pc.id ASC
    ) AS survivor_id
  FROM public.pipeline_clients pc
  WHERE
    NULLIF(regexp_replace(COALESCE(pc.telefone, ''), '\D', '', 'g'), '') IS NOT NULL
    AND NULLIF(public.commercial_normalize_lead_name(pc.client_name), '') IS NOT NULL
),
duplicates AS (
  SELECT id AS duplicate_id, survivor_id
  FROM ranked_pipeline_clients
  WHERE rn > 1
)
UPDATE public.agenda_events ae
SET
  pipeline_client_id = d.survivor_id,
  updated_at = now()
FROM duplicates d
WHERE ae.pipeline_client_id = d.duplicate_id;

WITH ranked_pipeline_clients AS (
  SELECT
    pc.ctid,
    pc.id,
    NULLIF(regexp_replace(COALESCE(pc.telefone, ''), '\D', '', 'g'), '') AS normalized_phone,
    NULLIF(public.commercial_normalize_lead_name(pc.client_name), '') AS normalized_name,
    row_number() OVER (
      PARTITION BY
        NULLIF(regexp_replace(COALESCE(pc.telefone, ''), '\D', '', 'g'), ''),
        NULLIF(public.commercial_normalize_lead_name(pc.client_name), '')
      ORDER BY
        EXISTS (
          SELECT 1
          FROM public.agenda_events ae
          WHERE ae.pipeline_client_id = pc.id
        ) DESC,
        EXISTS (
          SELECT 1
          FROM public.agendamento_leads al
          WHERE al.pipeline_client_id = pc.id
        ) DESC,
        pc.ativo DESC,
        COALESCE(pc.updated_at, pc.created_at) DESC,
        COALESCE(pc.created_at, now()) ASC,
        pc.id ASC
    ) AS rn,
    first_value(pc.id) OVER (
      PARTITION BY
        NULLIF(regexp_replace(COALESCE(pc.telefone, ''), '\D', '', 'g'), ''),
        NULLIF(public.commercial_normalize_lead_name(pc.client_name), '')
      ORDER BY
        EXISTS (
          SELECT 1
          FROM public.agenda_events ae
          WHERE ae.pipeline_client_id = pc.id
        ) DESC,
        EXISTS (
          SELECT 1
          FROM public.agendamento_leads al
          WHERE al.pipeline_client_id = pc.id
        ) DESC,
        pc.ativo DESC,
        COALESCE(pc.updated_at, pc.created_at) DESC,
        COALESCE(pc.created_at, now()) ASC,
        pc.id ASC
    ) AS survivor_id
  FROM public.pipeline_clients pc
  WHERE
    NULLIF(regexp_replace(COALESCE(pc.telefone, ''), '\D', '', 'g'), '') IS NOT NULL
    AND NULLIF(public.commercial_normalize_lead_name(pc.client_name), '') IS NOT NULL
),
duplicates AS (
  SELECT id AS duplicate_id, survivor_id
  FROM ranked_pipeline_clients
  WHERE rn > 1
)
UPDATE public.agendamento_leads al
SET
  pipeline_client_id = d.survivor_id,
  updated_at = now()
FROM duplicates d
WHERE al.pipeline_client_id = d.duplicate_id;

WITH ranked_pipeline_clients AS (
  SELECT
    pc.ctid,
    pc.id,
    row_number() OVER (
      PARTITION BY
        NULLIF(regexp_replace(COALESCE(pc.telefone, ''), '\D', '', 'g'), ''),
        NULLIF(public.commercial_normalize_lead_name(pc.client_name), '')
      ORDER BY
        EXISTS (
          SELECT 1
          FROM public.agenda_events ae
          WHERE ae.pipeline_client_id = pc.id
        ) DESC,
        EXISTS (
          SELECT 1
          FROM public.agendamento_leads al
          WHERE al.pipeline_client_id = pc.id
        ) DESC,
        pc.ativo DESC,
        COALESCE(pc.updated_at, pc.created_at) DESC,
        COALESCE(pc.created_at, now()) ASC,
        pc.id ASC
    ) AS rn
  FROM public.pipeline_clients pc
  WHERE
    NULLIF(regexp_replace(COALESCE(pc.telefone, ''), '\D', '', 'g'), '') IS NOT NULL
    AND NULLIF(public.commercial_normalize_lead_name(pc.client_name), '') IS NOT NULL
)
DELETE FROM public.pipeline_clients pc
USING ranked_pipeline_clients ranked
WHERE pc.ctid = ranked.ctid
  AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS pipeline_clients_identity_uidx
  ON public.pipeline_clients (
    NULLIF(regexp_replace(COALESCE(telefone, ''), '\D', '', 'g'), ''),
    NULLIF(public.commercial_normalize_lead_name(client_name), '')
  )
  WHERE NULLIF(regexp_replace(COALESCE(telefone, ''), '\D', '', 'g'), '') IS NOT NULL
    AND NULLIF(public.commercial_normalize_lead_name(client_name), '') IS NOT NULL;

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
  normalized_phone text;
  normalized_name text;
  existing_identity_id uuid;
BEGIN
  input_id := NULLIF(BTRIM(COALESCE(payload->>'id', '')), '');
  normalized_phone := NULLIF(regexp_replace(COALESCE(payload->>'telefone', ''), '\D', '', 'g'), '');
  normalized_name := NULLIF(public.commercial_normalize_lead_name(payload->>'client_name'), '');

  IF input_id IS NOT NULL AND input_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    requested_id := input_id::uuid;
  ELSE
    requested_id := gen_random_uuid();
  END IF;

  IF normalized_phone IS NOT NULL AND normalized_name IS NOT NULL THEN
    SELECT pc.id
    INTO existing_identity_id
    FROM public.pipeline_clients pc
    WHERE NULLIF(regexp_replace(COALESCE(pc.telefone, ''), '\D', '', 'g'), '') = normalized_phone
      AND NULLIF(public.commercial_normalize_lead_name(pc.client_name), '') = normalized_name
    ORDER BY
      pc.ativo DESC,
      COALESCE(pc.updated_at, pc.created_at) DESC,
      COALESCE(pc.created_at, now()) ASC,
      pc.id ASC
    LIMIT 1;

    requested_id := COALESCE(existing_identity_id, requested_id);
  END IF;

  INSERT INTO public.pipeline_clients (
    id,
    ativo,
    client_name,
    clinic_name,
    telefone,
    vendedor,
    criativo,
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
    funil,
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
    NULLIF(payload->>'funil', ''),
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
    funil = EXCLUDED.funil,
    meeting_date = EXCLUDED.meeting_date,
    meeting_time = EXCLUDED.meeting_time,
    followup_done = EXCLUDED.followup_done,
    created_by_user_id = COALESCE(EXCLUDED.created_by_user_id, public.pipeline_clients.created_by_user_id),
    updated_at = now()
  RETURNING * INTO saved_row;

  PERFORM public.sync_pipeline_client_to_agenda_by_id(saved_row.id);
  RETURN saved_row;
END;
$$;

COMMIT;
