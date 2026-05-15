-- Repair agenda titles that lost the lead name and keep future updates safe.
-- This migration backfills blank/default titles and guarantees that agenda
-- events never persist with an empty title again.

CREATE OR REPLACE FUNCTION public.ensure_agenda_event_title()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fallback_name TEXT;
  default_title TEXT;
  old_default_title TEXT;
BEGIN
  fallback_name := COALESCE(NULLIF(btrim(NEW.client_name), ''), 'Lead sem nome');
  NEW.client_name := fallback_name;
  default_title := 'Reuniao com ' || fallback_name;
  IF TG_OP = 'UPDATE' THEN
    old_default_title := 'Reuniao com ' || COALESCE(NULLIF(btrim(OLD.client_name), ''), 'Lead sem nome');
  ELSE
    old_default_title := default_title;
  END IF;

  IF NEW.title IS NULL OR btrim(NEW.title) = '' THEN
    IF TG_OP = 'UPDATE' AND OLD.title IS NOT NULL AND btrim(OLD.title) <> '' AND OLD.title <> old_default_title THEN
      NEW.title := OLD.title;
    ELSE
      NEW.title := default_title;
    END IF;
  ELSIF TG_OP = 'UPDATE'
    AND OLD.title IS NOT NULL
    AND btrim(OLD.title) <> ''
    AND OLD.title <> old_default_title
    AND NEW.title = old_default_title
  THEN
    NEW.title := OLD.title;
  ELSIF TG_OP = 'UPDATE' AND OLD.title = old_default_title AND (
    NEW.title IS NULL
    OR btrim(NEW.title) = ''
    OR NEW.title = OLD.title
  ) THEN
    NEW.title := default_title;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_agenda_event_title ON public.agenda_events;
CREATE TRIGGER trg_ensure_agenda_event_title
BEFORE INSERT OR UPDATE OF title, client_name, pipeline_client_id
ON public.agenda_events
FOR EACH ROW
EXECUTE FUNCTION public.ensure_agenda_event_title();

WITH agenda_sources AS (
  SELECT
    ae.id,
    COALESCE(
      NULLIF(btrim(pc.client_name), ''),
      NULLIF(btrim(al.nome), ''),
      NULLIF(btrim(ae.client_name), '')
    ) AS resolved_name
  FROM public.agenda_events ae
  LEFT JOIN public.pipeline_clients pc
    ON pc.id = ae.pipeline_client_id
  LEFT JOIN public.agendamento_leads al
    ON al.pipeline_client_id = ae.pipeline_client_id
)
UPDATE public.agenda_events ae
SET
  client_name = COALESCE(
    NULLIF(btrim(ae.client_name), ''),
    COALESCE(NULLIF(btrim(agenda_sources.resolved_name), ''), 'Lead sem nome')
  ),
  title = CASE
    WHEN ae.title IS NULL
      OR btrim(ae.title) = ''
      OR ae.title ILIKE 'Lead sem nome%'
      OR ae.title ~* '^reuniao com\\s*$'
      OR ae.title = 'Reuniao com ' || COALESCE(NULLIF(btrim(ae.client_name), ''), 'Lead sem nome')
    THEN 'Reuniao com ' || COALESCE(
      NULLIF(btrim(agenda_sources.resolved_name), ''),
      COALESCE(NULLIF(btrim(ae.client_name), ''), 'Lead sem nome')
    )
    ELSE ae.title
  END,
  updated_at = now()
FROM agenda_sources
WHERE ae.id = agenda_sources.id
  AND (
    ae.title IS NULL
    OR btrim(ae.title) = ''
    OR ae.title ILIKE 'Lead sem nome%'
    OR ae.title ~* '^reuniao com\\s*$'
    OR ae.title ~* '^reuniao com\\s+lead sem nome$'
  );
