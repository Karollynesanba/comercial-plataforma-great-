-- Add salao_ou_clinica column to agendamento_leads table
ALTER TABLE public.agendamento_leads
ADD COLUMN IF NOT EXISTS salao_ou_clinica TEXT DEFAULT 'NAO_INFORMADO';

-- Also add to pipeline_clients for sync
ALTER TABLE public.pipeline_clients
ADD COLUMN IF NOT EXISTS salao_ou_clinica TEXT DEFAULT 'NAO_INFORMADO';