-- Fix runtime errors in agenda title trigger.
-- The trigger must not call frontend-only helpers like normalizeMeetingTitle().

CREATE OR REPLACE FUNCTION public.ensure_agenda_event_title()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fallback_name TEXT;
  default_title TEXT;
BEGIN
  fallback_name := COALESCE(NULLIF(btrim(NEW.client_name), ''), 'Lead sem nome');
  NEW.client_name := fallback_name;
  default_title := 'Reuniao com ' || fallback_name;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.title IS NULL OR btrim(NEW.title) = '' THEN
      NEW.title := COALESCE(NULLIF(btrim(OLD.title), ''), default_title);
    ELSE
      NEW.title := btrim(NEW.title);
    END IF;

    NEW.title_locked := COALESCE(OLD.title_locked, false) OR NEW.title <> default_title;
  ELSE
    IF NEW.title IS NULL OR btrim(NEW.title) = '' THEN
      NEW.title := default_title;
    ELSE
      NEW.title := btrim(NEW.title);
    END IF;

    NEW.title_locked := COALESCE(NEW.title_locked, false) OR NEW.title <> default_title;
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
