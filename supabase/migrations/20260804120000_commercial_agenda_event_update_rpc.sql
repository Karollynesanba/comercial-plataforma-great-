CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.commercial_update_agenda_event_secure(
  table_name text,
  event_id uuid,
  payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidate_table text;
  other_table text;
  updated_row record;
  retry_row record;
  phone_digits text;
  event_date_value date;
  event_time_value time;
BEGIN
  candidate_table := NULLIF(BTRIM(table_name), '');
  IF candidate_table IS NULL THEN
    RAISE EXCEPTION 'table_name is required';
  END IF;

  other_table := CASE
    WHEN candidate_table = 'nova_agenda' THEN 'agenda_events'
    ELSE 'nova_agenda'
  END;

  FOREACH candidate_table IN ARRAY ARRAY[candidate_table, other_table] LOOP
    IF candidate_table IS NULL OR to_regclass('public.' || candidate_table) IS NULL THEN
      CONTINUE;
    END IF;

    BEGIN
      EXECUTE format($sql$
        UPDATE public.%I AS t
        SET
          title = COALESCE(NULLIF(($1)->>'title', ''), t.title),
          description = CASE WHEN $1 ? 'description' THEN NULLIF(($1)->>'description', '') ELSE t.description END,
          notes = CASE WHEN $1 ? 'notes' THEN NULLIF(($1)->>'notes', '') ELSE t.notes END,
          client_name = COALESCE(NULLIF(($1)->>'client_name', ''), t.client_name),
          client_phone = COALESCE(NULLIF(($1)->>'client_phone', ''), t.client_phone),
          clinic_name = CASE WHEN $1 ? 'clinic_name' THEN NULLIF(($1)->>'clinic_name', '') ELSE t.clinic_name END,
          event_date = COALESCE(NULLIF(($1)->>'event_date', '')::date, t.event_date),
          event_time = COALESCE(NULLIF(($1)->>'event_time', '')::time, t.event_time),
          duration_minutes = CASE
            WHEN $1 ? 'duration_minutes' THEN COALESCE(NULLIF(($1)->>'duration_minutes', '')::int, t.duration_minutes)
            ELSE t.duration_minutes
          END,
          meeting_link = CASE WHEN $1 ? 'meeting_link' THEN NULLIF(($1)->>'meeting_link', '') ELSE t.meeting_link END,
          scheduled_by = CASE WHEN $1 ? 'scheduled_by' THEN NULLIF(($1)->>'scheduled_by', '') ELSE t.scheduled_by END,
          lead_stage = CASE WHEN $1 ? 'lead_stage' THEN NULLIF(($1)->>'lead_stage', '') ELSE t.lead_stage END,
          creative_source = CASE WHEN $1 ? 'creative_source' THEN NULLIF(($1)->>'creative_source', '') ELSE t.creative_source END,
          color = CASE WHEN $1 ? 'color' THEN NULLIF(($1)->>'color', '') ELSE t.color END,
          reminder_2h_sent = CASE
            WHEN $1 ? 'reminder_2h_sent' THEN COALESCE(NULLIF(($1)->>'reminder_2h_sent', '')::boolean, false)
            ELSE t.reminder_2h_sent
          END,
          reminder_30min_sent = CASE
            WHEN $1 ? 'reminder_30min_sent' THEN COALESCE(NULLIF(($1)->>'reminder_30min_sent', '')::boolean, false)
            ELSE t.reminder_30min_sent
          END,
          created_by_user_id = COALESCE(NULLIF(($1)->>'created_by_user_id', '')::uuid, t.created_by_user_id),
          assigned_closer_id = CASE
            WHEN $1 ? 'assigned_closer_id' THEN NULLIF(($1)->>'assigned_closer_id', '')::uuid
            ELSE t.assigned_closer_id
          END,
          team_id = CASE
            WHEN $1 ? 'team_id' THEN NULLIF(($1)->>'team_id', '')::uuid
            ELSE t.team_id
          END,
          pipeline_client_id = CASE
            WHEN $1 ? 'pipeline_client_id' THEN NULLIF(($1)->>'pipeline_client_id', '')::uuid
            ELSE t.pipeline_client_id
          END,
          updated_at = now()
        WHERE t.id = $2
        RETURNING *
      $sql$)
      INTO updated_row
      USING payload, event_id;

      IF FOUND AND updated_row IS NOT NULL THEN
        RETURN to_jsonb(updated_row);
      END IF;
    EXCEPTION
      WHEN unique_violation THEN
        phone_digits := regexp_replace(COALESCE(payload->>'client_phone', ''), '\D', '', 'g');
        event_date_value := NULLIF(payload->>'event_date', '')::date;
        event_time_value := NULLIF(payload->>'event_time', '')::time;

        IF phone_digits <> '' AND event_date_value IS NOT NULL AND event_time_value IS NOT NULL THEN
          EXECUTE format($sql$
            DELETE FROM public.%I
            WHERE id <> $1
              AND regexp_replace(COALESCE(client_phone, ''), '\D', '', 'g') = $2
              AND event_date = $3
              AND event_time = $4
          $sql$, candidate_table)
          USING event_id, phone_digits, event_date_value, event_time_value;

          EXECUTE format($sql$
            UPDATE public.%I AS t
            SET
              title = COALESCE(NULLIF(($1)->>'title', ''), t.title),
              description = CASE WHEN $1 ? 'description' THEN NULLIF(($1)->>'description', '') ELSE t.description END,
              notes = CASE WHEN $1 ? 'notes' THEN NULLIF(($1)->>'notes', '') ELSE t.notes END,
              client_name = COALESCE(NULLIF(($1)->>'client_name', ''), t.client_name),
              client_phone = COALESCE(NULLIF(($1)->>'client_phone', ''), t.client_phone),
              clinic_name = CASE WHEN $1 ? 'clinic_name' THEN NULLIF(($1)->>'clinic_name', '') ELSE t.clinic_name END,
              event_date = COALESCE(NULLIF(($1)->>'event_date', '')::date, t.event_date),
              event_time = COALESCE(NULLIF(($1)->>'event_time', '')::time, t.event_time),
              duration_minutes = CASE
                WHEN $1 ? 'duration_minutes' THEN COALESCE(NULLIF(($1)->>'duration_minutes', '')::int, t.duration_minutes)
                ELSE t.duration_minutes
              END,
              meeting_link = CASE WHEN $1 ? 'meeting_link' THEN NULLIF(($1)->>'meeting_link', '') ELSE t.meeting_link END,
              scheduled_by = CASE WHEN $1 ? 'scheduled_by' THEN NULLIF(($1)->>'scheduled_by', '') ELSE t.scheduled_by END,
              lead_stage = CASE WHEN $1 ? 'lead_stage' THEN NULLIF(($1)->>'lead_stage', '') ELSE t.lead_stage END,
              creative_source = CASE WHEN $1 ? 'creative_source' THEN NULLIF(($1)->>'creative_source', '') ELSE t.creative_source END,
              color = CASE WHEN $1 ? 'color' THEN NULLIF(($1)->>'color', '') ELSE t.color END,
              reminder_2h_sent = CASE
                WHEN $1 ? 'reminder_2h_sent' THEN COALESCE(NULLIF(($1)->>'reminder_2h_sent', '')::boolean, false)
                ELSE t.reminder_2h_sent
              END,
              reminder_30min_sent = CASE
                WHEN $1 ? 'reminder_30min_sent' THEN COALESCE(NULLIF(($1)->>'reminder_30min_sent', '')::boolean, false)
                ELSE t.reminder_30min_sent
              END,
              created_by_user_id = COALESCE(NULLIF(($1)->>'created_by_user_id', '')::uuid, t.created_by_user_id),
              assigned_closer_id = CASE
                WHEN $1 ? 'assigned_closer_id' THEN NULLIF(($1)->>'assigned_closer_id', '')::uuid
                ELSE t.assigned_closer_id
              END,
              team_id = CASE
                WHEN $1 ? 'team_id' THEN NULLIF(($1)->>'team_id', '')::uuid
                ELSE t.team_id
              END,
              pipeline_client_id = CASE
                WHEN $1 ? 'pipeline_client_id' THEN NULLIF(($1)->>'pipeline_client_id', '')::uuid
                ELSE t.pipeline_client_id
              END,
              updated_at = now()
            WHERE t.id = $2
            RETURNING *
          $sql$)
          INTO retry_row
          USING payload, event_id;

          IF FOUND AND retry_row IS NOT NULL THEN
            RETURN to_jsonb(retry_row);
          END IF;
        END IF;
        RAISE;
    END;
  END LOOP;

  RAISE EXCEPTION 'Agenda event not found for update';
END;
$$;

GRANT EXECUTE ON FUNCTION public.commercial_update_agenda_event_secure(text, uuid, jsonb) TO anon, authenticated;
