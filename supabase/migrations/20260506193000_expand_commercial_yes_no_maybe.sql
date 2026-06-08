-- Allow "Nao sei" as a first-class value in commercial lead fields.
-- Keep legacy values compatible while standardizing new writes to NAO_SEI.

WITH normalized_pipeline AS (
  SELECT
    id,
    CASE
      WHEN clean_socio = 'sim' THEN 'SIM'
      WHEN clean_socio = 'nao' THEN 'NAO'
      WHEN clean_socio IN ('naosei', 'naoperguntado') THEN 'NAO_SEI'
      ELSE 'NAO_SEI'
    END AS next_tem_socio,
    CASE
      WHEN clean_mkt = 'sim' THEN 'SIM'
      WHEN clean_mkt = 'nao' THEN 'NAO'
      WHEN clean_mkt IN ('naosei', 'naoperguntado') THEN 'NAO_SEI'
      ELSE 'NAO_SEI'
    END AS next_tem_mkt,
    CASE
      WHEN clean_secretaria = 'sim' THEN 'SIM'
      WHEN clean_secretaria = 'nao' THEN 'NAO'
      WHEN clean_secretaria IN ('naosei', 'naoperguntado') THEN 'NAO_SEI'
      ELSE 'NAO_SEI'
    END AS next_tem_secretaria
  FROM (
    SELECT
      id,
      regexp_replace(
        translate(lower(btrim(coalesce(tem_socio, ''))), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
        '[^a-z]+',
        '',
        'g'
      ) AS clean_socio,
      regexp_replace(
        translate(lower(btrim(coalesce(tem_mkt, ''))), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
        '[^a-z]+',
        '',
        'g'
      ) AS clean_mkt,
      regexp_replace(
        translate(lower(btrim(coalesce(tem_secretaria, ''))), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
        '[^a-z]+',
        '',
        'g'
      ) AS clean_secretaria
    FROM public.pipeline_clients
  ) cleaned
)
UPDATE public.pipeline_clients pc
SET
  tem_socio = np.next_tem_socio,
  tem_mkt = np.next_tem_mkt,
  tem_secretaria = np.next_tem_secretaria
FROM normalized_pipeline np
WHERE pc.id = np.id;

WITH normalized_agendamento AS (
  SELECT
    id,
    CASE
      WHEN clean_socio = 'sim' THEN 'SIM'
      WHEN clean_socio = 'nao' THEN 'NAO'
      WHEN clean_socio IN ('naosei', 'naoperguntado') THEN 'NAO_SEI'
      ELSE 'NAO_SEI'
    END AS next_tem_socio,
    CASE
      WHEN clean_mkt = 'sim' THEN 'SIM'
      WHEN clean_mkt = 'nao' THEN 'NAO'
      WHEN clean_mkt IN ('naosei', 'naoperguntado') THEN 'NAO_SEI'
      ELSE 'NAO_SEI'
    END AS next_tem_mkt,
    CASE
      WHEN clean_secretaria = 'sim' THEN 'SIM'
      WHEN clean_secretaria = 'nao' THEN 'NAO'
      WHEN clean_secretaria IN ('naosei', 'naoperguntado') THEN 'NAO_SEI'
      ELSE 'NAO_SEI'
    END AS next_tem_secretaria
  FROM (
    SELECT
      id,
      regexp_replace(
        translate(lower(btrim(coalesce(tem_socio, ''))), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
        '[^a-z]+',
        '',
        'g'
      ) AS clean_socio,
      regexp_replace(
        translate(lower(btrim(coalesce(tem_mkt, ''))), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
        '[^a-z]+',
        '',
        'g'
      ) AS clean_mkt,
      regexp_replace(
        translate(lower(btrim(coalesce(tem_secretaria, ''))), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
        '[^a-z]+',
        '',
        'g'
      ) AS clean_secretaria
    FROM public.agendamento_leads
  ) cleaned
)
UPDATE public.agendamento_leads ag
SET
  tem_socio = na.next_tem_socio,
  tem_mkt = na.next_tem_mkt,
  tem_secretaria = na.next_tem_secretaria
FROM normalized_agendamento na
WHERE ag.id = na.id;

ALTER TABLE public.pipeline_clients
  DROP CONSTRAINT IF EXISTS pipeline_clients_tem_socio_check;
ALTER TABLE public.pipeline_clients
  DROP CONSTRAINT IF EXISTS pipeline_clients_tem_mkt_check;
ALTER TABLE public.pipeline_clients
  DROP CONSTRAINT IF EXISTS pipeline_clients_tem_secretaria_check;

ALTER TABLE public.pipeline_clients
  ADD CONSTRAINT pipeline_clients_tem_socio_check
    CHECK (tem_socio IN ('SIM', 'NAO', 'NAO_SEI')) NOT VALID;
ALTER TABLE public.pipeline_clients
  ADD CONSTRAINT pipeline_clients_tem_mkt_check
    CHECK (tem_mkt IN ('SIM', 'NAO', 'NAO_SEI')) NOT VALID;
ALTER TABLE public.pipeline_clients
  ADD CONSTRAINT pipeline_clients_tem_secretaria_check
    CHECK (tem_secretaria IN ('SIM', 'NAO', 'NAO_SEI')) NOT VALID;

ALTER TABLE public.agendamento_leads
  DROP CONSTRAINT IF EXISTS agendamento_leads_tem_socio_check;
ALTER TABLE public.agendamento_leads
  DROP CONSTRAINT IF EXISTS agendamento_leads_tem_mkt_check;
ALTER TABLE public.agendamento_leads
  DROP CONSTRAINT IF EXISTS agendamento_leads_tem_secretaria_check;

ALTER TABLE public.agendamento_leads
  ADD CONSTRAINT agendamento_leads_tem_socio_check
    CHECK (tem_socio IN ('SIM', 'NAO', 'NAO_SEI')) NOT VALID;
ALTER TABLE public.agendamento_leads
  ADD CONSTRAINT agendamento_leads_tem_mkt_check
    CHECK (tem_mkt IN ('SIM', 'NAO', 'NAO_SEI')) NOT VALID;
ALTER TABLE public.agendamento_leads
  ADD CONSTRAINT agendamento_leads_tem_secretaria_check
    CHECK (tem_secretaria IN ('SIM', 'NAO', 'NAO_SEI')) NOT VALID;
