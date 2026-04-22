-- Add SDR commission rate configuration to commission_config
INSERT INTO commission_config (config_key, config_value, label, category, description)
VALUES 
  ('SDR_COMMISSION_RATE', 0.005, 'Comissão SDR (%)', 'commercial', 'Percentual de comissão para SDRs (Felipe e Miguel) sobre vendas fechadas'),
  ('SDR_COMMISSION_START_DATE', 20260203, 'Data início comissão SDR', 'commercial', 'Data a partir da qual a comissão SDR passa a valer (formato: YYYYMMDD)')
ON CONFLICT (config_key) DO NOTHING;