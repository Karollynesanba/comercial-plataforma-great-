-- Allow the commercial app to read shared data and persist pipeline clients
-- through server-side database functions, so the shared password login keeps
-- working even when the browser session is not a Supabase auth session.

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

  RETURN saved_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.commercial_pipeline_client_delete_secure(client_id_input text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parsed_id uuid;
BEGIN
  IF client_id_input IS NULL THEN
    RETURN;
  END IF;

  IF client_id_input ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    parsed_id := client_id_input::uuid;
  ELSE
    RETURN;
  END IF;

  DELETE FROM public.pipeline_clients WHERE id = parsed_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.commercial_pipeline_client_upsert_secure(jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commercial_pipeline_client_delete_secure(text) TO anon, authenticated;

DROP POLICY IF EXISTS "Pipeline clients viewable by authenticated users" ON public.pipeline_clients;
DROP POLICY IF EXISTS "All authenticated users can view pipeline clients" ON public.pipeline_clients;
CREATE POLICY "Pipeline clients viewable by everyone"
ON public.pipeline_clients
FOR SELECT
TO public
USING (true);
CREATE POLICY "Pipeline clients insertable by everyone"
ON public.pipeline_clients
FOR INSERT
TO public
WITH CHECK (true);
CREATE POLICY "Pipeline clients updatable by everyone"
ON public.pipeline_clients
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);
CREATE POLICY "Pipeline clients deletable by everyone"
ON public.pipeline_clients
FOR DELETE
TO public
USING (true);

DROP POLICY IF EXISTS "Agenda events viewable by authenticated users" ON public.agenda_events;
DROP POLICY IF EXISTS "Users can view all agenda events" ON public.agenda_events;
CREATE POLICY "Agenda events viewable by everyone"
ON public.agenda_events
FOR SELECT
TO public
USING (true);
CREATE POLICY "Agenda events insertable by everyone"
ON public.agenda_events
FOR INSERT
TO public
WITH CHECK (true);
CREATE POLICY "Agenda events updatable by everyone"
ON public.agenda_events
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);
CREATE POLICY "Agenda events deletable by everyone"
ON public.agenda_events
FOR DELETE
TO public
USING (true);

DROP POLICY IF EXISTS "Agendamento leads viewable by authenticated users" ON public.agendamento_leads;
CREATE POLICY "Agendamento leads viewable by everyone"
ON public.agendamento_leads
FOR SELECT
TO public
USING (true);
CREATE POLICY "Agendamento leads insertable by everyone"
ON public.agendamento_leads
FOR INSERT
TO public
WITH CHECK (true);
CREATE POLICY "Agendamento leads updatable by everyone"
ON public.agendamento_leads
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);
CREATE POLICY "Agendamento leads deletable by everyone"
ON public.agendamento_leads
FOR DELETE
TO public
USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage commercial goals" ON public.commercial_goals;
CREATE POLICY "Commercial goals viewable by everyone"
ON public.commercial_goals
FOR SELECT
TO public
USING (true);
CREATE POLICY "Commercial goals insertable by everyone"
ON public.commercial_goals
FOR INSERT
TO public
WITH CHECK (true);
CREATE POLICY "Commercial goals updatable by everyone"
ON public.commercial_goals
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);
CREATE POLICY "Commercial goals deletable by everyone"
ON public.commercial_goals
FOR DELETE
TO public
USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage SDR goals" ON public.sdr_goals;
CREATE POLICY "SDR goals viewable by everyone"
ON public.sdr_goals
FOR SELECT
TO public
USING (true);
CREATE POLICY "SDR goals insertable by everyone"
ON public.sdr_goals
FOR INSERT
TO public
WITH CHECK (true);
CREATE POLICY "SDR goals updatable by everyone"
ON public.sdr_goals
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);
CREATE POLICY "SDR goals deletable by everyone"
ON public.sdr_goals
FOR DELETE
TO public
USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage commercial settings" ON public.commercial_settings;
CREATE POLICY "Commercial settings viewable by everyone"
ON public.commercial_settings
FOR SELECT
TO public
USING (true);
CREATE POLICY "Commercial settings insertable by everyone"
ON public.commercial_settings
FOR INSERT
TO public
WITH CHECK (true);
CREATE POLICY "Commercial settings updatable by everyone"
ON public.commercial_settings
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);
CREATE POLICY "Commercial settings deletable by everyone"
ON public.commercial_settings
FOR DELETE
TO public
USING (true);

DROP POLICY IF EXISTS "Authenticated users can view criativos" ON public.criativos;
CREATE POLICY "Criativos viewable by everyone"
ON public.criativos
FOR SELECT
TO public
USING (true);
CREATE POLICY "Criativos insertable by everyone"
ON public.criativos
FOR INSERT
TO public
WITH CHECK (true);
CREATE POLICY "Criativos updatable by everyone"
ON public.criativos
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);
CREATE POLICY "Criativos deletable by everyone"
ON public.criativos
FOR DELETE
TO public
USING (true);

DROP POLICY IF EXISTS "Payment reminders viewable by authenticated users" ON public.payment_reminders;
CREATE POLICY "Payment reminders viewable by everyone"
ON public.payment_reminders
FOR SELECT
TO public
USING (true);
CREATE POLICY "Payment reminders insertable by everyone"
ON public.payment_reminders
FOR INSERT
TO public
WITH CHECK (true);
CREATE POLICY "Payment reminders updatable by everyone"
ON public.payment_reminders
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);
CREATE POLICY "Payment reminders deletable by everyone"
ON public.payment_reminders
FOR DELETE
TO public
USING (true);

DROP POLICY IF EXISTS "Pre sales logs viewable by authenticated users" ON public.pre_sales_daily_logs;
CREATE POLICY "Pre sales logs viewable by everyone"
ON public.pre_sales_daily_logs
FOR SELECT
TO public
USING (true);
CREATE POLICY "Pre sales logs insertable by everyone"
ON public.pre_sales_daily_logs
FOR INSERT
TO public
WITH CHECK (true);
CREATE POLICY "Pre sales logs updatable by everyone"
ON public.pre_sales_daily_logs
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);
CREATE POLICY "Pre sales logs deletable by everyone"
ON public.pre_sales_daily_logs
FOR DELETE
TO public
USING (true);

DROP POLICY IF EXISTS "Closer logs viewable by authenticated users" ON public.closer_daily_logs;
CREATE POLICY "Closer logs viewable by everyone"
ON public.closer_daily_logs
FOR SELECT
TO public
USING (true);
CREATE POLICY "Closer logs insertable by everyone"
ON public.closer_daily_logs
FOR INSERT
TO public
WITH CHECK (true);
CREATE POLICY "Closer logs updatable by everyone"
ON public.closer_daily_logs
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);
CREATE POLICY "Closer logs deletable by everyone"
ON public.closer_daily_logs
FOR DELETE
TO public
USING (true);
