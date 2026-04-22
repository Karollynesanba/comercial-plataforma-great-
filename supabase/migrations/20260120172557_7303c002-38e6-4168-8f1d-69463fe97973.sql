CREATE OR REPLACE FUNCTION public.notify_all_users_on_announcement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert a notification for each active user
  INSERT INTO public.notifications (user_id, title, message, type, related_entity, related_entity_id)
  SELECT 
    p.id,
    '📢 Novo Aviso: ' || NEW.title,
    LEFT(NEW.content, 100) || CASE WHEN LENGTH(NEW.content) > 100 THEN '...' ELSE '' END,
    'announcement',
    'announcements',
    NEW.id
  FROM public.profiles p
  WHERE p.is_active = true;
  
  RETURN NEW;
END;
$function$;