-- Remove the old goal policies that blocked normal commercial users from saving goals.
DROP POLICY IF EXISTS "Admin can manage goals" ON public.commercial_goals;
DROP POLICY IF EXISTS "Coordinators can update commercial goals" ON public.commercial_goals;
DROP POLICY IF EXISTS "Coordinators can insert commercial goals" ON public.commercial_goals;
DROP POLICY IF EXISTS "Authenticated users can manage commercial goals" ON public.commercial_goals;

CREATE POLICY "Authenticated users can manage commercial goals"
ON public.commercial_goals
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Admin can manage SDR goals" ON public.sdr_goals;
DROP POLICY IF EXISTS "Coordinators can update sdr_goals" ON public.sdr_goals;
DROP POLICY IF EXISTS "Coordinators can insert sdr_goals" ON public.sdr_goals;
DROP POLICY IF EXISTS "Authenticated users can manage SDR goals" ON public.sdr_goals;

CREATE POLICY "Authenticated users can manage SDR goals"
ON public.sdr_goals
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Seed test leads for validating CRM, operational intelligence, closer/hour/area metrics and MRR.
-- Re-runnable: it removes only this test batch before inserting it again.
DELETE FROM public.pipeline_clients
WHERE notes LIKE '%SEED_TESTE_METRICAS_20260416%';

INSERT INTO public.pipeline_clients (
  ativo,
  client_name,
  clinic_name,
  telefone,
  vendedor,
  criativo,
  equipe,
  faturamento,
  faturamento_personalizado,
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
  pode_investir,
  meeting_date,
  meeting_time,
  followup_done
) VALUES
  (true, 'Seed Ana Estetica', 'Ana Estetica Avancada', '5511991000001', 'CLED', 'TRS', 'team-equipe-7', '50K_A_80K', null, 'COMPLETO', 'MENSAL', null, 1500, false, 1500, 0, '2026-04-01 14:00:00-03', 'FECHADO', '2026-04-01 15:10:00-03', null, null, 'SEED_TESTE_METRICAS_20260416 | Cled fecha estetica as 14h', 'MIGUEL', 'INSTAGRAM', 'CLIENTE', 'SIM', 'SIM', 'SIM', 'ESTETICA_BELEZA', 'SIM', '2026-04-01', '14:00', false),
  (true, 'Seed Bella Clinic', 'Bella Clinic', '5511991000002', 'CLED', 'TRS', 'team-equipe-7', '50K_A_80K', null, 'COMPLETO', 'MENSAL', null, 2200, false, 2200, 0, '2026-04-02 14:00:00-03', 'FECHADO', '2026-04-02 15:20:00-03', null, null, 'SEED_TESTE_METRICAS_20260416 | Cled fecha estetica as 14h', 'MIGUEL', 'INSTAGRAM', 'CLIENTE', 'SIM', 'SIM', 'NAO', 'ESTETICA_BELEZA', 'SIM', '2026-04-02', '14:00', false),
  (true, 'Seed Corpo e Pele', 'Corpo e Pele Estetica', '5511991000003', 'CLED', 'TRS', 'team-equipe-7', '50K_A_80K', null, 'TRAFEGO_E_CRIATIVOS', 'MENSAL', null, 1800, false, 1800, 0, '2026-04-03 14:00:00-03', 'FECHADO', '2026-04-03 15:00:00-03', null, null, 'SEED_TESTE_METRICAS_20260416 | Cled fecha estetica as 14h', 'MIGUEL', 'INSTAGRAM', 'CLIENTE', 'NAO', 'SIM', 'SIM', 'ESTETICA_BELEZA', 'SIM', '2026-04-03', '14:00', false),
  (true, 'Seed Dermato Prime', 'Dermato Prime', '5511991000004', 'CLED', 'TRS', 'team-equipe-7', '30K_A_50K', null, 'COMPLETO', 'MENSAL', null, 0, false, 0, 0, '2026-04-04 14:00:00-03', 'NO_SHOW', '2026-04-04 14:40:00-03', null, 'Nao entrou na call', 'SEED_TESTE_METRICAS_20260416 | No show mesmo funil/hora do Cled', 'MIGUEL', 'INSTAGRAM', 'CLIENTE', 'SIM', 'NAO', 'SIM', 'ESTETICA_BELEZA', 'SIM', '2026-04-04', '14:00', false),
  (true, 'Seed Fisio Vida', 'Fisio Vida', '5511991000005', 'PEDRO_H', 'CAIXINHA 02', 'team-equipe-7', '80K_A_100K', null, 'COMPLETO', 'MENSAL', null, 2500, false, 2500, 0, '2026-04-05 17:00:00-03', 'FECHADO', '2026-04-05 18:15:00-03', null, null, 'SEED_TESTE_METRICAS_20260416 | Pedro H fecha fisio as 17h', 'HEBERT', 'CAIXINHA', 'CLIENTE', 'SIM', 'SIM', 'SIM', 'FISIOTERAPIA', 'SIM', '2026-04-05', '17:00', false),
  (true, 'Seed Fisio Pro', 'Fisio Pro', '5511991000006', 'PEDRO_H', 'CAIXINHA 02', 'team-equipe-7', '80K_A_100K', null, 'COMPLETO', 'TRIMESTRAL', null, 3000, true, 3000, 4500, '2026-04-06 17:00:00-03', 'FECHADO', '2026-04-06 18:00:00-03', null, null, 'SEED_TESTE_METRICAS_20260416 | Pedro H MRR fisio as 17h', 'HEBERT', 'CAIXINHA', 'CLIENTE', 'SIM', 'SIM', 'NAO', 'FISIOTERAPIA', 'SIM', '2026-04-06', '17:00', false),
  (true, 'Seed Reabilita Mais', 'Reabilita Mais', '5511991000007', 'PEDRO_H', 'CAIXINHA 02', 'team-equipe-7', '50K_A_80K', null, 'TRAFEGO_E_CRIATIVOS', 'MENSAL', null, 2100, false, 2100, 0, '2026-04-07 17:00:00-03', 'FECHADO', '2026-04-07 18:05:00-03', null, null, 'SEED_TESTE_METRICAS_20260416 | Pedro H fecha fisio as 17h', 'HEBERT', 'CAIXINHA', 'CLIENTE', 'NAO', 'SIM', 'SIM', 'FISIOTERAPIA', 'SIM', '2026-04-07', '17:00', false),
  (true, 'Seed Fisio Agendada', 'Fisio Agendada', '5511991000008', 'PEDRO_H', 'CAIXINHA 02', 'team-equipe-7', '50K_A_80K', null, 'COMPLETO', 'MENSAL', null, 0, false, 0, 0, '2026-04-08 17:00:00-03', 'NOVO', null, null, null, 'SEED_TESTE_METRICAS_20260416 | Novo lead deve contar como agendamento', 'HEBERT', 'CAIXINHA', 'CLIENTE', 'SIM', 'SIM', 'NAO_PERGUNTADO', 'FISIOTERAPIA', 'SIM', '2026-04-08', '17:00', false),
  (true, 'Seed Psicologia Clara', 'Clara Psicologia', '5511991000009', 'HERBERT', 'META Q2', 'team-equipe-7', '30K_A_50K', null, 'COMPLETO', 'MENSAL', null, 1200, false, 1200, 0, '2026-04-09 10:00:00-03', 'FECHADO', '2026-04-09 11:00:00-03', null, null, 'SEED_TESTE_METRICAS_20260416 | Herbert psicologia manha', 'MIGUEL', 'FORMULARIO', 'CLIENTE', 'SIM', 'NAO', 'SIM', 'PSICOLOGIA', 'SIM', '2026-04-09', '10:00', false),
  (true, 'Seed Mente Plena', 'Mente Plena', '5511991000010', 'HERBERT', 'META Q2', 'team-equipe-7', '30K_A_50K', null, 'TRAFEGO', 'MENSAL', null, 0, false, 0, 0, '2026-04-10 10:00:00-03', 'TAXA_INTERESSE', '2026-04-10 11:10:00-03', null, null, 'SEED_TESTE_METRICAS_20260416 | Herbert taxa interesse psicologia', 'MIGUEL', 'FORMULARIO', 'CLIENTE', 'NAO', 'SIM', 'SIM', 'PSICOLOGIA', 'SIM', '2026-04-10', '10:00', false),
  (true, 'Seed Clinica Psi Norte', 'Clinica Psi Norte', '5511991000011', 'HERBERT', 'META Q2', 'team-equipe-7', '20K_A_30K', null, 'COMPLETO', 'MENSAL', null, 0, false, 0, 0, '2026-04-11 10:00:00-03', 'NEGOCIACAO', '2026-04-11 11:20:00-03', null, null, 'SEED_TESTE_METRICAS_20260416 | Herbert negociacao psicologia', 'MIGUEL', 'FORMULARIO', 'CLIENTE', 'SIM', 'NAO', 'NAO', 'PSICOLOGIA', 'SIM', '2026-04-11', '10:00', false),
  (true, 'Seed Psicologia No Show', 'Psicologia No Show', '5511991000012', 'HERBERT', 'META Q2', 'team-equipe-7', '20K_A_30K', null, 'COMPLETO', 'MENSAL', null, 0, false, 0, 0, '2026-04-12 10:00:00-03', 'NO_SHOW', '2026-04-12 10:40:00-03', null, 'Remarcou e nao apareceu', 'SEED_TESTE_METRICAS_20260416 | Herbert no show psicologia manha', 'MIGUEL', 'FORMULARIO', 'CLIENTE', 'NAO', 'NAO', 'SIM', 'PSICOLOGIA', 'SIM', '2026-04-12', '10:00', false),
  (true, 'Seed Salao Luxo', 'Salao Luxo', '5511991000013', 'PEDRO_JUAN', 'OTO VIDEO', 'team-equipe-7', '100K_A_150K', null, 'COMPLETO', 'SEMESTRAL', null, 4000, true, 4000, 8000, '2026-04-13 19:00:00-03', 'FECHADO', '2026-04-13 20:20:00-03', null, null, 'SEED_TESTE_METRICAS_20260416 | Pedro J salao noite MRR', 'PEDRO', 'OTO VIDEO', 'CLIENTE', 'SIM', 'SIM', 'SIM', 'SALAO_BELEZA', 'SIM', '2026-04-13', '19:00', false),
  (true, 'Seed Studio Hair', 'Studio Hair', '5511991000014', 'PEDRO_JUAN', 'OTO VIDEO', 'team-equipe-7', '80K_A_100K', null, 'TRAFEGO_E_CRIATIVOS', 'MENSAL', null, 1700, false, 1700, 0, '2026-04-14 19:00:00-03', 'FECHADO', '2026-04-14 20:00:00-03', null, null, 'SEED_TESTE_METRICAS_20260416 | Pedro J salao noite', 'PEDRO', 'OTO VIDEO', 'CLIENTE', 'NAO', 'SIM', 'NAO', 'SALAO_BELEZA', 'SIM', '2026-04-14', '19:00', false),
  (true, 'Seed Beauty Perdido', 'Beauty Perdido', '5511991000015', 'PEDRO_JUAN', 'OTO VIDEO', 'team-equipe-7', '50K_A_80K', null, 'COMPLETO', 'MENSAL', null, 0, false, 0, 0, '2026-04-15 19:00:00-03', 'PERDIDO', '2026-04-15 20:10:00-03', 'Sem caixa para entrada', null, 'SEED_TESTE_METRICAS_20260416 | Pedro J perdido salao noite', 'PEDRO', 'OTO VIDEO', 'CLIENTE', 'SIM', 'NAO', 'SIM', 'SALAO_BELEZA', 'NAO', '2026-04-15', '19:00', false),
  (true, 'Seed Nutri Forte', 'Nutri Forte', '5511991000016', 'CAETANO', 'CAIXA DE PERGUNTAS', 'team-equipe-7', '20K_A_30K', null, 'COMPLETO', 'MENSAL', null, 0, false, 0, 0, '2026-04-16 15:00:00-03', 'NEGOCIACAO', '2026-04-16 16:00:00-03', null, null, 'SEED_TESTE_METRICAS_20260416 | Caetano nutricao tarde negociacao', 'CAETANO', 'CAIXA', 'CLIENTE', 'SIM', 'SIM', 'SIM', 'NUTRICIONISTA', 'SIM', '2026-04-16', '15:00', false),
  (true, 'Seed Nutri Lead', 'Nutri Lead', '5511991000017', 'CAETANO', 'CAIXA DE PERGUNTAS', 'team-equipe-7', '20K_A_30K', null, 'COMPLETO', 'MENSAL', null, 0, false, 0, 0, '2026-04-17 15:00:00-03', 'NOVO', null, null, null, 'SEED_TESTE_METRICAS_20260416 | Caetano novo lead nutricao tarde', 'CAETANO', 'CAIXA', 'CLIENTE', 'NAO', 'SIM', 'NAO_PERGUNTADO', 'NUTRICIONISTA', 'SIM', '2026-04-17', '15:00', false),
  (true, 'Seed Nutri Taxa', 'Nutri Taxa', '5511991000018', 'CAETANO', 'CAIXA DE PERGUNTAS', 'team-equipe-7', '30K_A_50K', null, 'COMPLETO', 'TAXA_INTERESSE', null, 200, false, 200, 0, '2026-04-18 15:00:00-03', 'TAXA_INTERESSE', '2026-04-18 16:05:00-03', null, null, 'SEED_TESTE_METRICAS_20260416 | Caetano taxa interesse nutricao', 'CAETANO', 'CAIXA', 'CLIENTE', 'SIM', 'SIM', 'SIM', 'NUTRICIONISTA', 'SIM', '2026-04-18', '15:00', false),
  (true, 'Seed Odonto Alpha', 'Odonto Alpha', '5511991000019', 'CLED', 'EVENTO ESTETICA', 'team-equipe-7', '150K_A_250K', null, 'COMPLETO', 'MENSAL', null, 0, false, 0, 0, '2026-04-19 11:00:00-03', 'PERDIDO', '2026-04-19 12:00:00-03', 'Nao fechou condicao', null, 'SEED_TESTE_METRICAS_20260416 | Odonto perdido Cled manha', 'MIGUEL', 'EVENTO', 'CLIENTE', 'SIM', 'SIM', 'SIM', 'ODONTOLOGIA', 'SIM', '2026-04-19', '11:00', false),
  (true, 'Seed Odonto Beta', 'Odonto Beta', '5511991000020', 'PEDRO_H', 'EVENTO ESTETICA', 'team-equipe-7', '150K_A_250K', null, 'COMPLETO', 'MENSAL', null, 0, false, 0, 0, '2026-04-20 11:00:00-03', 'NOVO', null, null, null, 'SEED_TESTE_METRICAS_20260416 | Odonto novo lead manha', 'HEBERT', 'EVENTO', 'CLIENTE', 'SIM', 'SIM', 'NAO', 'ODONTOLOGIA', 'SIM', '2026-04-20', '11:00', false),
  (true, 'Seed Estetica MRR', 'Estetica MRR', '5511991000021', 'CLED', 'TRS', 'team-equipe-7', '80K_A_100K', null, 'COMPLETO', 'TRIMESTRAL', null, 1500, true, 1500, 3000, '2026-04-21 14:00:00-03', 'NEGOCIACAO', '2026-04-21 15:00:00-03', null, null, 'SEED_TESTE_METRICAS_20260416 | Cled negociacao MRR estetica 14h', 'MIGUEL', 'INSTAGRAM', 'CLIENTE', 'SIM', 'SIM', 'SIM', 'ESTETICA_BELEZA', 'SIM', '2026-04-21', '14:00', false),
  (true, 'Seed Estetica Taxa', 'Estetica Taxa', '5511991000022', 'CLED', 'TRS', 'team-equipe-7', '50K_A_80K', null, 'COMPLETO', 'TAXA_INTERESSE', null, 200, false, 200, 0, '2026-04-22 14:00:00-03', 'TAXA_INTERESSE', '2026-04-22 14:55:00-03', null, null, 'SEED_TESTE_METRICAS_20260416 | Cled taxa interesse estetica 14h', 'MIGUEL', 'INSTAGRAM', 'CLIENTE', 'NAO', 'SIM', 'SIM', 'ESTETICA_BELEZA', 'SIM', '2026-04-22', '14:00', false),
  (true, 'Seed Fisio No Show', 'Fisio No Show', '5511991000023', 'PEDRO_H', 'CAIXINHA 02', 'team-equipe-7', '50K_A_80K', null, 'COMPLETO', 'MENSAL', null, 0, false, 0, 0, '2026-04-23 17:00:00-03', 'NO_SHOW', '2026-04-23 17:35:00-03', null, 'Sem resposta no WhatsApp', 'SEED_TESTE_METRICAS_20260416 | Pedro H no show fisio 17h', 'HEBERT', 'CAIXINHA', 'CLIENTE', 'SIM', 'NAO', 'SIM', 'FISIOTERAPIA', 'SIM', '2026-04-23', '17:00', false),
  (true, 'Seed Salao Novo', 'Salao Novo', '5511991000024', 'PEDRO_JUAN', 'OTO VIDEO', 'team-equipe-7', '30K_A_50K', null, 'TRAFEGO', 'MENSAL', null, 0, false, 0, 0, '2026-04-24 19:00:00-03', 'NOVO', null, null, null, 'SEED_TESTE_METRICAS_20260416 | Pedro J novo lead salao noite', 'PEDRO', 'OTO VIDEO', 'CLIENTE', 'NAO', 'SIM', 'NAO', 'SALAO_BELEZA', 'SIM', '2026-04-24', '19:00', false),
  (true, 'Seed Psi Perdido', 'Psi Perdido', '5511991000025', 'HERBERT', 'META Q2', 'team-equipe-7', '20K_A_30K', null, 'COMPLETO', 'MENSAL', null, 0, false, 0, 0, '2026-04-25 10:00:00-03', 'PERDIDO', '2026-04-25 11:00:00-03', 'Preferiu aguardar proximo mes', null, 'SEED_TESTE_METRICAS_20260416 | Herbert perdido psicologia manha', 'MIGUEL', 'FORMULARIO', 'CLIENTE', 'SIM', 'NAO', 'SIM', 'PSICOLOGIA', 'SIM', '2026-04-25', '10:00', false);
