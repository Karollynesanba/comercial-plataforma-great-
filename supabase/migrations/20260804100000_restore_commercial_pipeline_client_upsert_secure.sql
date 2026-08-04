CREATE OR REPLACE FUNCTION public.commercial_pipeline_client_upsert_secure(payload jsonb)
RETURNS public.pipeline_clients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    WITH saved AS (
      INSERT INTO public.pipeline_clients (
        client_name,
        clinic_name,
        telefone,
        profession,
        criativo,
        funil,
        faturamento,
        agendado_por,
        agendado_via,
        tem_socio,
        tem_mkt,
        tem_secretaria,
        meeting_date,
        meeting_time,
        stage,
        ativo,
        created_by_user_id,
        updated_at
      )
      VALUES (
        COALESCE(NULLIF(payload->>'client_name', ''), 'Lead sem nome'),
        NULLIF(payload->>'clinic_name', ''),
        NULLIF(payload->>'telefone', ''),
        NULLIF(payload->>'profession', ''),
        NULLIF(payload->>'criativo', ''),
        NULLIF(payload->>'funil', ''),
        NULLIF(payload->>'faturamento', ''),
        NULLIF(payload->>'agendado_por', ''),
        NULLIF(payload->>'agendado_via', ''),
        NULLIF(payload->>'tem_socio', ''),
        NULLIF(payload->>'tem_mkt', ''),
        NULLIF(payload->>'tem_secretaria', ''),
        NULLIF(payload->>'meeting_date', ''),
        NULLIF(payload->>'meeting_time', ''),
        COALESCE(NULLIF(payload->>'stage', ''), 'NOVO'),
        COALESCE(NULLIF(payload->>'ativo', '')::boolean, true),
        CASE
          WHEN NULLIF(payload->>'created_by_user_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
            THEN NULLIF(payload->>'created_by_user_id', '')::uuid
          ELSE NULL
        END,
        now()
      )
      ON CONFLICT (id) DO UPDATE SET
        profession = EXCLUDED.profession,
        updated_at = now()
      RETURNING *
    )
    SELECT saved FROM saved
  );
END;
$$;
