-- Track manually customized agenda titles so later syncs do not overwrite them.

ALTER TABLE public.agenda_events
  ADD COLUMN IF NOT EXISTS title_locked BOOLEAN NOT NULL DEFAULT false;

UPDATE public.agenda_events
SET title_locked = true
WHERE title IS NOT NULL
  AND btrim(title) <> ''
  AND title <> ('Reuniao com ' || COALESCE(NULLIF(btrim(client_name), ''), 'Lead sem nome'));

