-- Sync existing agendamento_leads to pipeline_clients
INSERT INTO public.pipeline_clients (
  client_name,
  clinic_name,
  telefone,
  criativo,
  equipe,
  faturamento,
  pacote,
  periodo,
  stage,
  data_entrada,
  ativo,
  tem_socio,
  tem_mkt,
  created_by_user_id,
  created_at
)
SELECT
  al.nome as client_name,
  al.nome as clinic_name,
  al.telefone,
  al.funil as criativo,
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY al.created_at) % 2 = 1 THEN 'LIRA'
    ELSE 'KAUAN'
  END as equipe,
  CASE 
    WHEN al.faturamento = '0_A_15K' THEN '0_10K'
    WHEN al.faturamento = '15K_A_30K' THEN '15K_MAIS'
    WHEN al.faturamento = '30K_A_50K' THEN '15K_MAIS'
    WHEN al.faturamento = '50K_A_100K' THEN '15K_MAIS'
    WHEN al.faturamento = '100K_PLUS' THEN '15K_MAIS'
    ELSE '0_10K'
  END as faturamento,
  'COMPLETO' as pacote,
  'MENSAL' as periodo,
  CASE 
    WHEN al.status = 'NOSHOW' THEN 'NO_SHOW'
    WHEN al.status IN ('VENDA PERDIDA', 'LEAD DESQUALIFICADO', 'REEMBOLSO', 'ARROGANTE', 'FECHOU COM OUTRO', 'NÃO FECHOU') THEN 'PERDIDO'
    WHEN al.status IN ('FOLLOW UP', 'INTERESSEIRO', 'FUP - ONE LEVEL', 'OUTRA PROPOSTA', 'FICOU DE DAR RESP', 'VIU CNPJ', 'PAGOU TAXA DE INT') THEN 'NEGOCIACAO'
    WHEN al.status = 'SEM RESPOSTA - PÓS' THEN 'NO_SHOW'
    ELSE 'NOVO'
  END as stage,
  al.created_at as data_entrada,
  true as ativo,
  CASE WHEN al.tem_socio = 'SIM' THEN 'SIM' ELSE 'NAO' END as tem_socio,
  CASE WHEN al.tem_mkt = 'SIM' THEN 'SIM' ELSE 'NAO' END as tem_mkt,
  al.created_by_user_id,
  al.created_at
FROM public.agendamento_leads al
LEFT JOIN public.pipeline_clients pc ON pc.telefone = al.telefone OR pc.client_name = al.nome
WHERE pc.id IS NULL;