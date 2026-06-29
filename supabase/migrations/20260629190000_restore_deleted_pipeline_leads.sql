-- Restore the ability to re-create deleted pipeline leads without breaking
-- agenda projections.
--
-- Previously, the delete cleanup trigger kept agenda rows linked to the old
-- pipeline_client_id. Re-adding the same client then caused duplicate-slot
-- conflicts because the sync trigger would not reclaim those linked rows.

BEGIN;

-- Detach projections that point to a pipeline client that no longer exists.
-- This preserves the agenda history while allowing the lead to be re-created
-- and re-linked to the existing agenda slot.
UPDATE public.agenda_events ae
SET
  pipeline_client_id = NULL,
  updated_at = now()
WHERE ae.pipeline_client_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.pipeline_clients pc
    WHERE pc.id = ae.pipeline_client_id
  );

UPDATE public.agendamento_leads al
SET
  pipeline_client_id = NULL,
  updated_at = now()
WHERE al.pipeline_client_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.pipeline_clients pc
    WHERE pc.id = al.pipeline_client_id
  );

CREATE OR REPLACE FUNCTION public.cleanup_pipeline_client_projections()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.agenda_events
  SET
    pipeline_client_id = NULL,
    updated_at = now()
  WHERE pipeline_client_id = OLD.id;

  UPDATE public.agendamento_leads
  SET
    pipeline_client_id = NULL,
    updated_at = now()
  WHERE pipeline_client_id = OLD.id;

  RETURN OLD;
END;
$$;

COMMIT;
