-- Keep agenda edits isolated to the scheduling module.
-- CRM records should not be rewritten when a user edits an existing lead
-- from the agenda view. The CRM remains the source of truth only for lead
-- creation and direct CRM edits.

DROP TRIGGER IF EXISTS trg_sync_faturamento_to_pipeline ON public.agendamento_leads;

CREATE OR REPLACE FUNCTION public.sync_faturamento_to_pipeline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Intentionally no-op: agenda updates must not rewrite pipeline clients.
  RETURN NEW;
END;
$$;
