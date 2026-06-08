-- Fix Meu Dia persistence:
-- 1) Remove duplicate WORK_ITEM rows already created by overlapping triggers.
-- 2) Make WORK_ITEM projection idempotent with a unique key.
-- 3) Keep only one source of truth for My Day projection: work_items trigger.

DELETE FROM public.my_day_items
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, source, source_id
        ORDER BY created_at ASC, id ASC
      ) AS rn
    FROM public.my_day_items
    WHERE source = 'WORK_ITEM'
      AND source_id IS NOT NULL
  ) duplicates
  WHERE duplicates.rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS my_day_items_user_source_source_id_key
  ON public.my_day_items (user_id, source, source_id);

CREATE OR REPLACE FUNCTION public.handle_task_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reporter_name TEXT;
  task_priority TEXT;
BEGIN
  IF NEW.assignee_user_id IS NOT NULL AND
     (TG_OP = 'INSERT' OR OLD.assignee_user_id IS DISTINCT FROM NEW.assignee_user_id) THEN
    SELECT full_name INTO reporter_name
    FROM public.profiles
    WHERE id = NEW.reporter_user_id;

    task_priority := COALESCE(NEW.priority, 'MEDIA');

    INSERT INTO public.notifications (user_id, title, message, type, related_entity, related_entity_id)
    VALUES (
      NEW.assignee_user_id,
      'Nova tarefa atribuída',
      'A tarefa "' || NEW.title || '" foi atribuída a você por ' || COALESCE(reporter_name, 'alguém'),
      'TASK_ASSIGNED',
      'work_items',
      NEW.id
    );

    INSERT INTO public.my_day_items (user_id, title, source, source_id, priority, status, date)
    VALUES (
      NEW.assignee_user_id,
      NEW.title,
      'WORK_ITEM',
      NEW.id,
      task_priority,
      'PENDENTE',
      CURRENT_DATE
    )
    ON CONFLICT (user_id, source, source_id)
    DO UPDATE SET
      title = EXCLUDED.title,
      priority = EXCLUDED.priority,
      status = EXCLUDED.status,
      date = EXCLUDED.date,
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_action_item_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meeting_title TEXT;
  new_workitem_id UUID;
  reporter_id UUID;
BEGIN
  SELECT title, created_by_user_id INTO meeting_title, reporter_id
  FROM public.meetings
  WHERE id = NEW.meeting_id;

  INSERT INTO public.work_items (
    title,
    description,
    status,
    priority,
    type,
    due_date,
    assignee_user_id,
    reporter_user_id
  ) VALUES (
    NEW.title,
    'Ação da reunião: ' || COALESCE(meeting_title, 'Sem título'),
    'TODO',
    'ALTA',
    'TASK',
    NEW.due_date,
    NEW.assignee_user_id,
    reporter_id
  )
  RETURNING id INTO new_workitem_id;

  NEW.workitem_id := new_workitem_id;

  IF NEW.assignee_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, related_entity, related_entity_id)
    VALUES (
      NEW.assignee_user_id,
      'Nova ação de reunião atribuída',
      'A ação "' || NEW.title || '" da reunião "' || COALESCE(meeting_title, 'Sem título') || '" foi atribuída a você.',
      'ACTION_ITEM_ASSIGNED',
      'meeting_action_items',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;
