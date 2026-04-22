-- Add pode_investir column to pipeline_clients and agendamento_leads tables
ALTER TABLE public.pipeline_clients 
ADD COLUMN IF NOT EXISTS pode_investir TEXT DEFAULT NULL;

ALTER TABLE public.agendamento_leads 
ADD COLUMN IF NOT EXISTS pode_investir TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.pipeline_clients.pode_investir IS 'Whether a low-revenue lead (0-15K) can invest: SIM or NAO';
COMMENT ON COLUMN public.agendamento_leads.pode_investir IS 'Whether a low-revenue lead (0-15K) can invest: SIM or NAO';