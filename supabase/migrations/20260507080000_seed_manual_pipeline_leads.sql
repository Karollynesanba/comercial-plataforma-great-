-- Seed the requested manual pipeline leads in the shared production database.
-- This block is idempotent: it updates an existing lead if the name or phone
-- already matches, otherwise it inserts a new record.

do $$
declare
  lead_rec record;
  existing_id uuid;
  normalized_phone text;
  meeting_ts timestamp;
  vendedor_value text;
begin
  for lead_rec in
    select *
    from (
      values
        ('VITOR', 'VITOR', '+55 48 8875-9071', 'FORMS/CAIXINHA EVENTO 04', null, '0_A_15K', 'COMPLETO', 'MENSAL', 'NAO', 0, 'NOVO', 'HERBERT', null, 'NAO', 'NAO', 'NAO', '2026-05-06', '19:30'),
        ('BRUNO ABRANTES', 'BRUNO ABRANTES', '+55 21 98883-7477', 'FORMS/ADVENTO 03', null, '0_A_15K', 'COMPLETO', 'MENSAL', 'NAO', 0, 'NOVO', 'HERBERT', null, 'NAO', 'NAO', 'NAO', '2026-05-11', '16:00'),
        ('REUNIÃO - JOANA', 'REUNIÃO - JOANA', '+55 86 9953-3896', 'BOTOX', null, '0_A_15K', 'COMPLETO', 'MENSAL', 'NAO', 0, 'NO_SHOW', 'HERBERT', null, 'NAO', 'NAO', 'NAO', '2026-05-06', '14:00'),
        ('LARISSA', 'LARISSA', '+55 81 9613-5830', 'NAO IDENTIFICADO', null, '0_A_15K', 'COMPLETO', 'MENSAL', 'NAO', 0, 'NO_SHOW', 'HERBERT', null, 'NAO', 'NAO', 'NAO', '2026-05-04', '17:00'),
        ('ELIANE', 'ELIANE', null, 'FORMS/CAIXINHA', null, '0_A_15K', 'COMPLETO', 'MENSAL', 'NAO', 200, 'TAXA_INTERESSE', 'HERBERT', null, 'NAO', 'NAO', 'NAO', '2026-04-08', '17:00'),
        ('FABIO', 'FABIO', null, 'CAIXA DE PERGUNTAS', null, '0_A_15K', 'COMPLETO', 'MENSAL', 'NAO', 200, 'TAXA_INTERESSE', 'HERBERT', null, 'NAO', 'NAO', 'NAO', '2026-04-29', '10:00'),
        ('LV HARMONIZAÇÃO', 'LV HARMONIZAÇÃO', '+55 98 8489-6389', 'NAO IDENTIFICADO', null, '0_A_15K', 'COMPLETO', 'MENSAL', 'NAO', 6000, 'NEGOCIACAO', 'CLED', null, 'NAO', 'NAO', 'NAO', '2026-05-04', '18:00'),
        ('DIEGO RIBEIRO FARIA', 'DIEGO RIBEIRO FARIA', '+55 35 9765-0498', 'FORMS/CAIXINHA OFICIAL 01', null, '0_A_15K', 'COMPLETO', 'MENSAL', 'NAO', 6000, 'NEGOCIACAO', 'PEDRO_H', null, 'NAO', 'NAO', 'NAO', '2026-05-04', '17:30'),
        ('Reunião - PATRICIA PEDRO H', 'Reunião - PATRICIA PEDRO H', '+55 61 9914-0545', 'BOTOX', null, '0_A_15K', 'COMPLETO', 'MENSAL', 'NAO', 2000, 'NOVO', 'PEDRO_H', null, 'NAO', 'NAO', 'NAO', '2026-05-03', '14:00')
    ) as t(
      client_name,
      clinic_name,
      telefone,
      criativo,
      equipe,
      faturamento,
      pacote,
      periodo,
      indicacao,
      entrada,
      stage,
      agendado_por,
      pagador_anuncio,
      tem_socio,
      tem_mkt,
      tem_secretaria,
      meeting_date,
      meeting_time
    )
  loop
    normalized_phone := nullif(regexp_replace(coalesce(lead_rec.telefone, ''), '\D', '', 'g'), '');
    meeting_ts := (lead_rec.meeting_date || ' ' || lead_rec.meeting_time)::timestamp;
    vendedor_value := case
      when lead_rec.client_name in ('VITOR', 'BRUNO ABRANTES', 'REUNIÃO - JOANA', 'LARISSA', 'ELIANE', 'FABIO') then 'HERBERT'
      when lead_rec.client_name = 'LV HARMONIZAÇÃO' then 'CLED'
      when lead_rec.client_name in ('DIEGO RIBEIRO FARIA', 'Reunião - PATRICIA PEDRO H') then 'PEDRO_H'
      else lead_rec.agendado_por
    end;

    select id
      into existing_id
    from public.pipeline_clients
    where lower(trim(client_name)) = lower(trim(lead_rec.client_name))
       or (normalized_phone is not null and regexp_replace(coalesce(telefone, ''), '\D', '', 'g') = normalized_phone)
    order by updated_at desc nulls last, created_at desc nulls last
    limit 1;

    if existing_id is null then
      insert into public.pipeline_clients (
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
        pacote,
        periodo,
        indicacao,
        entrada,
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
        meeting_date,
        meeting_time,
        created_by_user_id,
        followup_done,
        created_at,
        updated_at
      ) values (
        gen_random_uuid(),
        true,
        lead_rec.client_name,
        lead_rec.clinic_name,
        normalized_phone,
        vendedor_value,
        lead_rec.criativo,
        lead_rec.criativo,
        lead_rec.equipe,
        lead_rec.faturamento,
        lead_rec.pacote,
        lead_rec.periodo,
        lead_rec.indicacao,
        lead_rec.entrada,
        lead_rec.meeting_date::date,
        lead_rec.stage,
        meeting_ts,
        null,
        null,
        null,
        lead_rec.agendado_por,
        null,
        lead_rec.pagador_anuncio,
        lead_rec.tem_socio,
        lead_rec.tem_mkt,
        lead_rec.tem_secretaria,
        null,
        lead_rec.meeting_date,
        lead_rec.meeting_time,
        null,
        false,
        now(),
        now()
      );
    else
      update public.pipeline_clients
      set
        ativo = true,
        client_name = lead_rec.client_name,
        clinic_name = lead_rec.clinic_name,
        telefone = normalized_phone,
        vendedor = vendedor_value,
        criativo = lead_rec.criativo,
        funil = lead_rec.criativo,
        equipe = lead_rec.equipe,
        faturamento = lead_rec.faturamento,
        pacote = lead_rec.pacote,
        periodo = lead_rec.periodo,
        indicacao = lead_rec.indicacao,
        entrada = lead_rec.entrada,
        data_entrada = lead_rec.meeting_date::date,
        stage = lead_rec.stage,
        last_stage_change = meeting_ts,
        lost_reason = null,
        no_show_reason = null,
        notes = null,
        agendado_por = lead_rec.agendado_por,
        agendado_via = null,
        pagador_anuncio = lead_rec.pagador_anuncio,
        tem_socio = lead_rec.tem_socio,
        tem_mkt = lead_rec.tem_mkt,
        tem_secretaria = lead_rec.tem_secretaria,
        salao_ou_clinica = null,
        meeting_date = lead_rec.meeting_date,
        meeting_time = lead_rec.meeting_time,
        followup_done = false,
        updated_at = now()
      where id = existing_id;
    end if;
  end loop;
end $$;
