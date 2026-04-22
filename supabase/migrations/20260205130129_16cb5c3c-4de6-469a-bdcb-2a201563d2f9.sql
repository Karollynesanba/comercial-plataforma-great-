
-- Create function to sync faturamento from pipeline to agendamento
CREATE OR REPLACE FUNCTION sync_faturamento_to_agendamento()
RETURNS TRIGGER AS $$
DECLARE
  normalized_phone TEXT;
  mapped_faturamento TEXT;
BEGIN
  -- Normalize phone number (remove non-digits and handle 55 prefix)
  normalized_phone := regexp_replace(NEW.telefone, '[^0-9]', '', 'g');
  IF length(normalized_phone) > 11 AND left(normalized_phone, 2) = '55' THEN
    normalized_phone := substring(normalized_phone from 3);
  END IF;
  
  -- Only proceed if phone is valid
  IF normalized_phone IS NULL OR normalized_phone = '' THEN
    RETURN NEW;
  END IF;
  
  -- Map pipeline faturamento to agendamento format
  mapped_faturamento := CASE NEW.faturamento
    WHEN '0_A_15K' THEN '0_A_15K'
    WHEN '15K_A_30K' THEN '15K_A_30K'
    WHEN '30K_A_50K' THEN '30K_A_50K'
    WHEN '50K_A_100K' THEN '50K_A_100K'
    WHEN '100K_PLUS' THEN '100K_PLUS'
    WHEN 'NAO_INFORMADO' THEN '0_A_15K'
    WHEN 'PERSONALIZADO' THEN '30K_A_50K'
    ELSE '0_A_15K'
  END;
  
  -- Update matching agendamento_leads
  UPDATE agendamento_leads
  SET faturamento = mapped_faturamento,
      updated_at = now()
  WHERE (
    regexp_replace(telefone, '[^0-9]', '', 'g') = normalized_phone
    OR regexp_replace(telefone, '[^0-9]', '', 'g') = '55' || normalized_phone
    OR regexp_replace(replace(telefone, '+', ''), '[^0-9]', '', 'g') = normalized_phone
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to sync faturamento from agendamento to pipeline
CREATE OR REPLACE FUNCTION sync_faturamento_to_pipeline()
RETURNS TRIGGER AS $$
DECLARE
  normalized_phone TEXT;
  mapped_faturamento TEXT;
BEGIN
  -- Normalize phone number
  normalized_phone := regexp_replace(NEW.telefone, '[^0-9]', '', 'g');
  IF length(normalized_phone) > 11 AND left(normalized_phone, 2) = '55' THEN
    normalized_phone := substring(normalized_phone from 3);
  END IF;
  
  -- Only proceed if phone is valid
  IF normalized_phone IS NULL OR normalized_phone = '' THEN
    RETURN NEW;
  END IF;
  
  -- Map agendamento faturamento to pipeline format (1:1 mapping)
  mapped_faturamento := NEW.faturamento;
  
  -- Update matching pipeline_clients
  UPDATE pipeline_clients
  SET faturamento = mapped_faturamento,
      updated_at = now()
  WHERE (
    regexp_replace(telefone, '[^0-9]', '', 'g') = normalized_phone
    OR regexp_replace(telefone, '[^0-9]', '', 'g') = '55' || normalized_phone
    OR regexp_replace(replace(telefone, '+', ''), '[^0-9]', '', 'g') = normalized_phone
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for pipeline → agendamento sync
DROP TRIGGER IF EXISTS trg_sync_faturamento_to_agendamento ON pipeline_clients;
CREATE TRIGGER trg_sync_faturamento_to_agendamento
  AFTER UPDATE OF faturamento ON pipeline_clients
  FOR EACH ROW
  WHEN (OLD.faturamento IS DISTINCT FROM NEW.faturamento)
  EXECUTE FUNCTION sync_faturamento_to_agendamento();

-- Create trigger for agendamento → pipeline sync
DROP TRIGGER IF EXISTS trg_sync_faturamento_to_pipeline ON agendamento_leads;
CREATE TRIGGER trg_sync_faturamento_to_pipeline
  AFTER UPDATE OF faturamento ON agendamento_leads
  FOR EACH ROW
  WHEN (OLD.faturamento IS DISTINCT FROM NEW.faturamento)
  EXECUTE FUNCTION sync_faturamento_to_pipeline();
