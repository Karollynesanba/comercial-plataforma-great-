-- Fix the log_exec_card_completion function to use correct field name
CREATE OR REPLACE FUNCTION public.log_exec_card_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_name TEXT;
  v_user_email TEXT;
  v_user_id UUID;
BEGIN
  -- Only log when card is completed
  IF OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL THEN
    v_user_id := COALESCE(NEW.assigned_to_user_id, auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
    
    SELECT full_name, email INTO v_user_name, v_user_email
    FROM public.profiles WHERE id = v_user_id;
    
    v_user_name := COALESCE(v_user_name, 'Sistema');
    v_user_email := COALESCE(v_user_email, 'sistema@great.com');
    
    INSERT INTO public.activity_logs (action, entity, entity_id, details, user_id, user_name, user_email)
    VALUES (
      'TASK_COMPLETED',
      'exec_cards',
      NEW.id,
      'Tarefa "' || NEW.title || '" concluída',
      v_user_id,
      v_user_name,
      v_user_email
    );
  END IF;

  RETURN NEW;
END;
$function$;