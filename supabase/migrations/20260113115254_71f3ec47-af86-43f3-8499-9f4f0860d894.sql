-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT NOT NULL DEFAULT 'INFO',
  read BOOLEAN NOT NULL DEFAULT false,
  related_entity TEXT,
  related_entity_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications
FOR DELETE
USING (user_id = auth.uid());

-- System can insert notifications (via trigger with security definer)
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Create function to handle task assignment
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
  -- Only proceed if there's an assignee and it's either a new assignment or changed assignee
  IF NEW.assignee_user_id IS NOT NULL AND 
     (TG_OP = 'INSERT' OR OLD.assignee_user_id IS DISTINCT FROM NEW.assignee_user_id) THEN
    
    -- Get reporter name
    SELECT full_name INTO reporter_name 
    FROM public.profiles 
    WHERE id = NEW.reporter_user_id;
    
    -- Map priority
    task_priority := COALESCE(NEW.priority, 'MEDIA');
    
    -- Create notification for the assignee
    INSERT INTO public.notifications (user_id, title, message, type, related_entity, related_entity_id)
    VALUES (
      NEW.assignee_user_id,
      'Nova tarefa atribuída',
      'A tarefa "' || NEW.title || '" foi atribuída a você por ' || COALESCE(reporter_name, 'alguém'),
      'TASK_ASSIGNED',
      'work_items',
      NEW.id
    );
    
    -- Add to My Day for the assignee (only if not already there)
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
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for task assignment
CREATE TRIGGER on_task_assigned
  AFTER INSERT OR UPDATE ON public.work_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_task_assignment();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;