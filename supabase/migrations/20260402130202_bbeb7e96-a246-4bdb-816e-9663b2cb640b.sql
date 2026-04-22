
CREATE OR REPLACE FUNCTION public.notify_new_creative_para_subir()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_name TEXT;
  v_count INTEGER;
  rec RECORD;
BEGIN
  -- Only trigger on new creatives with PARA_SUBIR status
  IF NEW.status <> 'PARA_SUBIR' THEN
    RETURN NEW;
  END IF;

  v_client_name := NEW.client_name;

  -- Count total PARA_SUBIR creatives for this client
  SELECT COUNT(*) INTO v_count
  FROM public.ad_creatives
  WHERE client_id = NEW.client_id
    AND status = 'PARA_SUBIR';

  -- Send notification to GESTOR, COORDENADOR_RED, COORDENADOR_COMERCIAL, and admins
  FOR rec IN
    SELECT p.id
    FROM public.profiles p
    LEFT JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.is_active = true
      AND (
        p.operational_role IN ('GESTOR', 'COORDENADOR_RED')
        OR p.commercial_role = 'COORDENADOR_COMERCIAL'
        OR ur.role = 'admin'
      )
    GROUP BY p.id
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, related_entity, related_entity_id)
    VALUES (
      rec.id,
      '🎨 Novo criativo para subir',
      v_client_name || ' — ' || v_count || ' criativo(s) novo(s) pra subir',
      'NEW_CREATIVE',
      'ad_creatives',
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_creative_para_subir
AFTER INSERT ON public.ad_creatives
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_creative_para_subir();
