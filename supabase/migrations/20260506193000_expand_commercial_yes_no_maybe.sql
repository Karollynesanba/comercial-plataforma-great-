-- Allow "Nao sei" as a first-class value in commercial lead fields.
-- Keep legacy values compatible while standardizing new writes to NAO_SEI.

UPDATE public.pipeline_clients
SET
  tem_socio = CASE
    WHEN tem_socio IN ('NAO_PERGUNTADO', 'NAO PERGUNTADO', 'NAO_SEI') THEN 'NAO_SEI'
    ELSE tem_socio
  END,
  tem_mkt = CASE
    WHEN tem_mkt IN ('NAO_PERGUNTADO', 'NAO PERGUNTADO', 'NAO_SEI') THEN 'NAO_SEI'
    ELSE tem_mkt
  END,
  tem_secretaria = CASE
    WHEN tem_secretaria IN ('NAO_PERGUNTADO', 'NAO PERGUNTADO', 'NAO_SEI') THEN 'NAO_SEI'
    ELSE tem_secretaria
  END
WHERE
  tem_socio IN ('NAO_PERGUNTADO', 'NAO PERGUNTADO', 'NAO_SEI')
  OR tem_mkt IN ('NAO_PERGUNTADO', 'NAO PERGUNTADO', 'NAO_SEI')
  OR tem_secretaria IN ('NAO_PERGUNTADO', 'NAO PERGUNTADO', 'NAO_SEI');

UPDATE public.agendamento_leads
SET
  tem_socio = CASE
    WHEN tem_socio IN ('NAO_PERGUNTADO', 'NAO PERGUNTADO', 'NAO_SEI') THEN 'NAO_SEI'
    ELSE tem_socio
  END,
  tem_mkt = CASE
    WHEN tem_mkt IN ('NAO_PERGUNTADO', 'NAO PERGUNTADO', 'NAO_SEI') THEN 'NAO_SEI'
    ELSE tem_mkt
  END,
  tem_secretaria = CASE
    WHEN tem_secretaria IN ('NAO_PERGUNTADO', 'NAO PERGUNTADO', 'NAO_SEI') THEN 'NAO_SEI'
    ELSE tem_secretaria
  END
WHERE
  tem_socio IN ('NAO_PERGUNTADO', 'NAO PERGUNTADO', 'NAO_SEI')
  OR tem_mkt IN ('NAO_PERGUNTADO', 'NAO PERGUNTADO', 'NAO_SEI')
  OR tem_secretaria IN ('NAO_PERGUNTADO', 'NAO PERGUNTADO', 'NAO_SEI');

ALTER TABLE public.pipeline_clients
  DROP CONSTRAINT IF EXISTS pipeline_clients_tem_socio_check;
ALTER TABLE public.pipeline_clients
  DROP CONSTRAINT IF EXISTS pipeline_clients_tem_mkt_check;
ALTER TABLE public.pipeline_clients
  DROP CONSTRAINT IF EXISTS pipeline_clients_tem_secretaria_check;

ALTER TABLE public.pipeline_clients
  ADD CONSTRAINT pipeline_clients_tem_socio_check
    CHECK (tem_socio IN ('SIM', 'NAO', 'NAO_SEI'));
ALTER TABLE public.pipeline_clients
  ADD CONSTRAINT pipeline_clients_tem_mkt_check
    CHECK (tem_mkt IN ('SIM', 'NAO', 'NAO_SEI'));
ALTER TABLE public.pipeline_clients
  ADD CONSTRAINT pipeline_clients_tem_secretaria_check
    CHECK (tem_secretaria IN ('SIM', 'NAO', 'NAO_SEI'));

ALTER TABLE public.agendamento_leads
  DROP CONSTRAINT IF EXISTS agendamento_leads_tem_socio_check;
ALTER TABLE public.agendamento_leads
  DROP CONSTRAINT IF EXISTS agendamento_leads_tem_mkt_check;
ALTER TABLE public.agendamento_leads
  DROP CONSTRAINT IF EXISTS agendamento_leads_tem_secretaria_check;

ALTER TABLE public.agendamento_leads
  ADD CONSTRAINT agendamento_leads_tem_socio_check
    CHECK (tem_socio IN ('SIM', 'NAO', 'NAO_SEI'));
ALTER TABLE public.agendamento_leads
  ADD CONSTRAINT agendamento_leads_tem_mkt_check
    CHECK (tem_mkt IN ('SIM', 'NAO', 'NAO_SEI'));
ALTER TABLE public.agendamento_leads
  ADD CONSTRAINT agendamento_leads_tem_secretaria_check
    CHECK (tem_secretaria IN ('SIM', 'NAO', 'NAO_SEI'));
