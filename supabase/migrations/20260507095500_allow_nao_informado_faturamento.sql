-- Let the commercial forms accept "NAO_INFORMADO" as a valid faturamento value.
-- The UI already uses this as the explicit "Não Informado" choice, so the
-- database must allow it as well.

DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  FOR constraint_record IN
    SELECT c.conrelid::regclass AS table_name, c.conname
    FROM pg_constraint c
    WHERE c.conrelid IN (
      'public.pipeline_clients'::regclass,
      'public.agendamento_leads'::regclass
    )
    AND c.contype = 'c'
    AND (
      c.conname ILIKE '%faturamento%'
      OR pg_get_constraintdef(c.oid) ILIKE '%faturamento%'
    )
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', constraint_record.table_name, constraint_record.conname);
  END LOOP;
END $$;

ALTER TABLE public.pipeline_clients
  ADD CONSTRAINT pipeline_clients_faturamento_check
  CHECK (faturamento IN (
    '0_A_10K',
    '10K_A_20K',
    '20K_A_30K',
    '30K_A_50K',
    '50K_A_80K',
    '80K_A_100K',
    '100K_A_150K',
    '150K_A_250K',
    '250K_A_400K',
    '400K_A_600K',
    '600K_A_1M',
    '1M_PLUS',
    '0_A_15K',
    '15K_A_30K',
    '50K_A_100K',
    '100K_PLUS',
    'NAO_INFORMADO',
    'PERSONALIZADO'
  ));

ALTER TABLE public.agendamento_leads
  ADD CONSTRAINT agendamento_leads_faturamento_check
  CHECK (faturamento IN (
    '0_A_10K',
    '10K_A_20K',
    '20K_A_30K',
    '30K_A_50K',
    '50K_A_80K',
    '80K_A_100K',
    '100K_A_150K',
    '150K_A_250K',
    '250K_A_400K',
    '400K_A_600K',
    '600K_A_1M',
    '1M_PLUS',
    '0_A_15K',
    '15K_A_30K',
    '50K_A_100K',
    '100K_PLUS',
    'NAO_INFORMADO',
    'PERSONALIZADO'
  ));
