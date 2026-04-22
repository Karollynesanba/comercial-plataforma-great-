-- Security fix: set immutable search_path on the newly added trigger function
CREATE OR REPLACE FUNCTION public.sync_agendamento_status_from_pipeline()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_status text;
  v_digits text;
  v_no55 text;
  v_with55 text;
BEGIN
  IF NEW.stage IS NULL THEN
    RETURN NEW;
  END IF;

  v_status := CASE NEW.stage
    WHEN 'NOVO' THEN 'NOVO_LEAD'
    WHEN 'NO_SHOW' THEN 'NO_SHOW'
    WHEN 'TAXA_INTERESSE' THEN 'TAXA_INTERESSE'
    WHEN 'NEGOCIACAO' THEN 'NEGOCIACAO'
    WHEN 'PERDIDO' THEN 'PERDIDO'
    WHEN 'FECHADO' THEN 'FECHADO'
    ELSE NULL
  END;

  IF v_status IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.telefone IS NULL OR NEW.telefone = '' THEN
    RETURN NEW;
  END IF;

  v_digits := regexp_replace(NEW.telefone, '\\D', '', 'g');
  v_no55 := CASE WHEN v_digits LIKE '55%' THEN substr(v_digits, 3) ELSE v_digits END;
  v_with55 := CASE WHEN v_no55 IS NOT NULL AND v_no55 <> '' THEN '55' || v_no55 ELSE NULL END;

  UPDATE public.agendamento_leads
  SET status = v_status,
      updated_at = now()
  WHERE telefone IN (v_digits, v_no55, v_with55);

  RETURN NEW;
END;
$$;