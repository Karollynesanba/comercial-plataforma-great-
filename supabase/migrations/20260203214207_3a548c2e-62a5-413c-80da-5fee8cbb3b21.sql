-- Sincroniza status do Controle de Agendamento a partir da coluna do Pipeline
-- Regras: stage NOVO/NO_SHOW/TAXA_INTERESSE/NEGOCIACAO/PERDIDO/FECHADO -> status NOVO_LEAD/NO_SHOW/TAXA_INTERESSE/NEGOCIACAO/PERDIDO/FECHADO

CREATE OR REPLACE FUNCTION public.sync_agendamento_status_from_pipeline()
RETURNS trigger
LANGUAGE plpgsql
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

DROP TRIGGER IF EXISTS trg_sync_agendamento_status_from_pipeline ON public.pipeline_clients;

CREATE TRIGGER trg_sync_agendamento_status_from_pipeline
AFTER INSERT OR UPDATE OF stage, telefone ON public.pipeline_clients
FOR EACH ROW
EXECUTE FUNCTION public.sync_agendamento_status_from_pipeline();

-- Realtime: garante que mudanças em agendamento/pipeline disparem eventos para a UI invalidar cache
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'agendamento_leads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agendamento_leads;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'pipeline_clients'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pipeline_clients;
  END IF;
END
$$;