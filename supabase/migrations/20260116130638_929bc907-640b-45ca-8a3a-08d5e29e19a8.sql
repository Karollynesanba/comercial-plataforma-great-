-- Create function to log operational client changes
CREATE OR REPLACE FUNCTION public.log_operational_client_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_action TEXT;
  v_details TEXT;
  v_user_id UUID;
  v_user_name TEXT;
  v_user_email TEXT;
BEGIN
  -- Get current user info (from auth context or fallback)
  v_user_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  
  SELECT full_name, email INTO v_user_name, v_user_email
  FROM public.profiles WHERE id = v_user_id;
  
  v_user_name := COALESCE(v_user_name, 'Sistema');
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
$$;

-- Create trigger for operational clients
DROP TRIGGER IF EXISTS log_operational_client_changes_trigger ON public.operational_clients;
CREATE TRIGGER log_operational_client_changes_trigger
  AFTER INSERT OR UPDATE ON public.operational_clients
  FOR EACH ROW
  EXECUTE FUNCTION public.log_operational_client_changes();

-- Create function to log CRM events (sales)
CREATE OR REPLACE FUNCTION public.log_crm_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_name TEXT;
  v_user_email TEXT;
  v_client_name TEXT;
BEGIN
  SELECT full_name, email INTO v_user_name, v_user_email
  FROM public.profiles WHERE id = NEW.user_id;
  
  v_user_name := COALESCE(v_user_name, 'Sistema');
  v_user_email := COALESCE(v_user_email, 'sistema@great.com');
  
  -- Get client name
  SELECT client_name INTO v_client_name
  FROM public.operational_clients WHERE id = NEW.client_id;
  
  IF NEW.event_type = 'VENDA_OPERACIONAL' THEN
    INSERT INTO public.activity_logs (action, entity, entity_id, details, user_id, user_name, user_email)
    VALUES (
      'SALE_REGISTERED',
      'crm_events',
      NEW.id,
      'Venda de R$ ' || COALESCE(NEW.sale_value::text, '0') || ' registrada para "' || COALESCE(v_client_name, 'Cliente') || '"',
      NEW.user_id,
      v_user_name,
      v_user_email
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for CRM events
DROP TRIGGER IF EXISTS log_crm_events_trigger ON public.crm_events;
CREATE TRIGGER log_crm_events_trigger
  AFTER INSERT ON public.crm_events
  FOR EACH ROW
  EXECUTE FUNCTION public.log_crm_events();

-- Create function to log exec cards completion
CREATE OR REPLACE FUNCTION public.log_exec_card_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_name TEXT;
  v_user_email TEXT;
  v_user_id UUID;
BEGIN
  -- Only log when card is completed
  IF OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL THEN
    v_user_id := COALESCE(NEW.assigned_to, auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
    
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
$$;

-- Create trigger for exec cards
DROP TRIGGER IF EXISTS log_exec_card_completion_trigger ON public.exec_cards;
CREATE TRIGGER log_exec_card_completion_trigger
  AFTER UPDATE ON public.exec_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.log_exec_card_completion();

-- Create function to log championship events
CREATE OR REPLACE FUNCTION public.log_championship_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_name TEXT;
  v_user_email TEXT;
  v_team_label TEXT;
BEGIN
  SELECT full_name, email INTO v_user_name, v_user_email
  FROM public.profiles WHERE id = NEW.created_by::uuid;
  
  v_user_name := COALESCE(v_user_name, 'Sistema');
  v_user_email := COALESCE(v_user_email, 'sistema@great.com');
  
  -- Get team label
  SELECT label INTO v_team_label
  FROM public.championship_teams WHERE team_id = NEW.team_id;
  
  INSERT INTO public.activity_logs (action, entity, entity_id, details, user_id, user_name, user_email)
  VALUES (
    'CHAMPIONSHIP_EVENT',
    'championship_events',
    NEW.id,
    NEW.event_type || ': ' || COALESCE(NEW.description, NEW.item_label, '') || ' (' || COALESCE(v_team_label, NEW.team_id) || ', +' || NEW.points || ' pts)',
    COALESCE(NEW.created_by::uuid, '00000000-0000-0000-0000-000000000000'::uuid),
    v_user_name,
    v_user_email
  );

  RETURN NEW;
END;
$$;

-- Create trigger for championship events
DROP TRIGGER IF EXISTS log_championship_events_trigger ON public.championship_events;
CREATE TRIGGER log_championship_events_trigger
  AFTER INSERT ON public.championship_events
  FOR EACH ROW
  EXECUTE FUNCTION public.log_championship_events();