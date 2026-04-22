-- Fix the log_operational_client_changes function to handle missing user gracefully
CREATE OR REPLACE FUNCTION public.log_operational_client_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_action TEXT;
  v_details TEXT;
  v_user_id UUID;
  v_user_name TEXT;
  v_user_email TEXT;
BEGIN
  -- Get current user info (from auth context)
  v_user_id := auth.uid();
  
  -- Skip logging if no authenticated user (avoid FK violation)
  IF v_user_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  SELECT full_name, email INTO v_user_name, v_user_email
  FROM public.profiles WHERE id = v_user_id;
  
  -- If no profile found, skip logging
  IF v_user_name IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  v_user_email := COALESCE(v_user_email, 'sistema@great.com');

  IF TG_OP = 'INSERT' THEN
    v_action := 'CLIENT_CREATED';
    v_details := 'Cliente "' || NEW.client_name || '" criado com valor ' || 
                 COALESCE(NEW.deal_value::text, '0') || ' (' || COALESCE(NEW.status_operacional, 'NOVO') || ')';
    
    INSERT INTO public.activity_logs (action, entity, entity_id, details, user_id, user_name, user_email)
    VALUES (v_action, 'operational_clients', NEW.id, v_details, v_user_id, v_user_name, v_user_email);
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check for status changes
    IF OLD.status_operacional IS DISTINCT FROM NEW.status_operacional THEN
      IF NEW.status_operacional = 'ATIVO' THEN
        v_action := 'CLIENT_CLOSED';
        v_details := 'Cliente "' || NEW.client_name || '" fechado com valor R$ ' || COALESCE(NEW.deal_value::text, '0');
      ELSIF NEW.status_operacional = 'ENCERRADO' THEN
        v_action := 'CLIENT_LOST';
        v_details := 'Cliente "' || NEW.client_name || '" encerrado';
      ELSE
        v_action := 'CLIENT_UPDATED';
        v_details := 'Cliente "' || NEW.client_name || '" atualizado: ' || OLD.status_operacional || ' → ' || NEW.status_operacional;
      END IF;
      
      INSERT INTO public.activity_logs (action, entity, entity_id, details, user_id, user_name, user_email)
      VALUES (v_action, 'operational_clients', NEW.id, v_details, v_user_id, v_user_name, v_user_email);
    END IF;
    
    -- Check for renewal status changes
    IF OLD.renewal_status IS DISTINCT FROM NEW.renewal_status AND NEW.renewal_status = 'RENEWED' THEN
      v_action := 'RENEWAL';
      v_details := 'Cliente "' || NEW.client_name || '" renovou o contrato';
      
      INSERT INTO public.activity_logs (action, entity, entity_id, details, user_id, user_name, user_email)
      VALUES (v_action, 'operational_clients', NEW.id, v_details, v_user_id, v_user_name, v_user_email);
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;