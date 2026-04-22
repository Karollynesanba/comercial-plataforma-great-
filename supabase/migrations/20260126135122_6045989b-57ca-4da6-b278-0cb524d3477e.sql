-- Add tem_secretaria column to agendamento_leads table
ALTER TABLE public.agendamento_leads 
ADD COLUMN tem_secretaria TEXT NOT NULL DEFAULT 'NAO' 
CHECK (tem_secretaria IN ('SIM', 'NAO'));

-- Add tem_secretaria column to pipeline_clients table for sync
ALTER TABLE public.pipeline_clients 
ADD COLUMN tem_secretaria TEXT DEFAULT 'NAO' 
CHECK (tem_secretaria IN ('SIM', 'NAO', 'NAO_PERGUNTADO'));