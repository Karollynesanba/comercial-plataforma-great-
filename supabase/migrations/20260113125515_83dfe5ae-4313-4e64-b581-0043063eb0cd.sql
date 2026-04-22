-- Create meeting_action_items table
CREATE TABLE public.meeting_action_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  assignee_user_id UUID REFERENCES public.profiles(id),
  due_date DATE,
  workitem_id UUID REFERENCES public.work_items(id),
  status TEXT NOT NULL DEFAULT 'ABERTO' CHECK (status IN ('ABERTO', 'EM_ANDAMENTO', 'CONCLUIDO')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meeting_action_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Action items viewable by authenticated users"
ON public.meeting_action_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Action items insertable by authenticated users"
ON public.meeting_action_items FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Action items updatable by assignee or admin"
ON public.meeting_action_items FOR UPDATE
TO authenticated
USING (
  assignee_user_id = auth.uid() 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR is_coordinator(auth.uid())
);

CREATE POLICY "Action items deletable by admin or coordinator"
ON public.meeting_action_items FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR is_coordinator(auth.uid())
);

-- Trigger function to create work_item and my_day_item when action item is created
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
  -- Get meeting title and creator
  SELECT title, created_by_user_id INTO meeting_title, reporter_id
  FROM public.meetings
  WHERE id = NEW.meeting_id;

  -- Create work item
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

  -- Update action item with workitem reference
  NEW.workitem_id := new_workitem_id;

  -- If assignee exists, add to their My Day and notify
  IF NEW.assignee_user_id IS NOT NULL THEN
    -- Add to My Day
    INSERT INTO public.my_day_items (user_id, title, source, source_id, priority, status, date)
    VALUES (
      NEW.assignee_user_id,
      NEW.title,
      'WORK_ITEM',
      new_workitem_id,
      'ALTA',
      'PENDENTE',
      CURRENT_DATE
    )
    ON CONFLICT DO NOTHING;

    -- Create notification
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

-- Create trigger
CREATE TRIGGER on_action_item_created
  BEFORE INSERT ON public.meeting_action_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_action_item_created();

-- Add trigger for updated_at
CREATE TRIGGER update_meeting_action_items_updated_at
  BEFORE UPDATE ON public.meeting_action_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();