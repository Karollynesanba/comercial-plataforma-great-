-- Remove duplicated CRM leads and prevent new exact-slot duplicates.
-- This keeps one lead per normalized phone + meeting date + meeting time,
-- preferring the row that is already linked to agenda data.

BEGIN;

WITH ranked_pipeline_clients AS (
  SELECT
    pc.id,
    row_number() OVER (
      PARTITION BY
        regexp_replace(COALESCE(pc.telefone, ''), '\D', '', 'g'),
        COALESCE(pc.meeting_date, ''),
        COALESCE(pc.meeting_time, '')
      ORDER BY
        (
          EXISTS (
            SELECT 1
            FROM public.agenda_events ae
            WHERE ae.pipeline_client_id = pc.id
          )
          OR EXISTS (
            SELECT 1
            FROM public.agendamento_leads al
            WHERE al.pipeline_client_id = pc.id
          )
        ) DESC,
        pc.ativo DESC,
        COALESCE(pc.updated_at, pc.created_at) DESC,
        COALESCE(pc.created_at, now()) ASC,
        pc.id ASC
    ) AS rn,
    first_value(pc.id) OVER (
      PARTITION BY
        regexp_replace(COALESCE(pc.telefone, ''), '\D', '', 'g'),
        COALESCE(pc.meeting_date, ''),
        COALESCE(pc.meeting_time, '')
      ORDER BY
        (
          EXISTS (
            SELECT 1
            FROM public.agenda_events ae
            WHERE ae.pipeline_client_id = pc.id
          )
          OR EXISTS (
            SELECT 1
            FROM public.agendamento_leads al
            WHERE al.pipeline_client_id = pc.id
          )
        ) DESC,
        pc.ativo DESC,
        COALESCE(pc.updated_at, pc.created_at) DESC,
        COALESCE(pc.created_at, now()) ASC,
        pc.id ASC
    ) AS survivor_id
  FROM public.pipeline_clients pc
  WHERE
    NULLIF(BTRIM(COALESCE(pc.telefone, '')), '') IS NOT NULL
    AND NULLIF(BTRIM(COALESCE(pc.meeting_date, '')), '') IS NOT NULL
    AND NULLIF(BTRIM(COALESCE(pc.meeting_time, '')), '') IS NOT NULL
),
duplicates AS (
  SELECT id AS duplicate_id, survivor_id
  FROM ranked_pipeline_clients
  WHERE rn > 1
)
UPDATE public.agenda_events ae
SET
  pipeline_client_id = d.survivor_id,
  updated_at = now()
FROM duplicates d
WHERE ae.pipeline_client_id = d.duplicate_id;

WITH ranked_pipeline_clients AS (
  SELECT
    pc.id,
    row_number() OVER (
      PARTITION BY
        regexp_replace(COALESCE(pc.telefone, ''), '\D', '', 'g'),
        COALESCE(pc.meeting_date, ''),
        COALESCE(pc.meeting_time, '')
      ORDER BY
        (
          EXISTS (
            SELECT 1
            FROM public.agenda_events ae
            WHERE ae.pipeline_client_id = pc.id
          )
          OR EXISTS (
            SELECT 1
            FROM public.agendamento_leads al
            WHERE al.pipeline_client_id = pc.id
          )
        ) DESC,
        pc.ativo DESC,
        COALESCE(pc.updated_at, pc.created_at) DESC,
        COALESCE(pc.created_at, now()) ASC,
        pc.id ASC
    ) AS rn,
    first_value(pc.id) OVER (
      PARTITION BY
        regexp_replace(COALESCE(pc.telefone, ''), '\D', '', 'g'),
        COALESCE(pc.meeting_date, ''),
        COALESCE(pc.meeting_time, '')
      ORDER BY
        (
          EXISTS (
            SELECT 1
            FROM public.agenda_events ae
            WHERE ae.pipeline_client_id = pc.id
          )
          OR EXISTS (
            SELECT 1
            FROM public.agendamento_leads al
            WHERE al.pipeline_client_id = pc.id
          )
        ) DESC,
        pc.ativo DESC,
        COALESCE(pc.updated_at, pc.created_at) DESC,
        COALESCE(pc.created_at, now()) ASC,
        pc.id ASC
    ) AS survivor_id
  FROM public.pipeline_clients pc
  WHERE
    NULLIF(BTRIM(COALESCE(pc.telefone, '')), '') IS NOT NULL
    AND NULLIF(BTRIM(COALESCE(pc.meeting_date, '')), '') IS NOT NULL
    AND NULLIF(BTRIM(COALESCE(pc.meeting_time, '')), '') IS NOT NULL
),
duplicates AS (
  SELECT id AS duplicate_id, survivor_id
  FROM ranked_pipeline_clients
  WHERE rn > 1
)
UPDATE public.agendamento_leads al
SET
  pipeline_client_id = d.survivor_id,
  updated_at = now()
FROM duplicates d
WHERE al.pipeline_client_id = d.duplicate_id;

WITH ranked_pipeline_clients AS (
  SELECT
    pc.ctid,
    pc.id,
    row_number() OVER (
      PARTITION BY
        regexp_replace(COALESCE(pc.telefone, ''), '\D', '', 'g'),
        COALESCE(pc.meeting_date, ''),
        COALESCE(pc.meeting_time, '')
      ORDER BY
        (
          EXISTS (
            SELECT 1
            FROM public.agenda_events ae
            WHERE ae.pipeline_client_id = pc.id
          )
          OR EXISTS (
            SELECT 1
            FROM public.agendamento_leads al
            WHERE al.pipeline_client_id = pc.id
          )
        ) DESC,
        pc.ativo DESC,
        COALESCE(pc.updated_at, pc.created_at) DESC,
        COALESCE(pc.created_at, now()) ASC,
        pc.id ASC
    ) AS rn
  FROM public.pipeline_clients pc
  WHERE
    NULLIF(BTRIM(COALESCE(pc.telefone, '')), '') IS NOT NULL
    AND NULLIF(BTRIM(COALESCE(pc.meeting_date, '')), '') IS NOT NULL
    AND NULLIF(BTRIM(COALESCE(pc.meeting_time, '')), '') IS NOT NULL
)
DELETE FROM public.pipeline_clients pc
USING ranked_pipeline_clients ranked
WHERE pc.ctid = ranked.ctid
  AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS pipeline_clients_exact_slot_uidx
  ON public.pipeline_clients (
    regexp_replace(COALESCE(telefone, ''), '\D', '', 'g'),
    meeting_date,
    meeting_time
  )
  WHERE telefone IS NOT NULL
    AND btrim(telefone) <> ''
    AND meeting_date IS NOT NULL
    AND btrim(meeting_date) <> ''
    AND meeting_time IS NOT NULL
    AND btrim(meeting_time) <> '';

COMMIT;
