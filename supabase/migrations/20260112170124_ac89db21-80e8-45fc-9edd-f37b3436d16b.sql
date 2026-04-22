-- Add onboarding stage field to track the activation flow
ALTER TABLE public.operational_clients 
ADD COLUMN IF NOT EXISTS onboarding_stage text NOT NULL DEFAULT 'CONTRATO';

-- Add briefing fields
ALTER TABLE public.operational_clients 
ADD COLUMN IF NOT EXISTS briefing_completed_at timestamp with time zone DEFAULT NULL;

-- Create check constraint for valid onboarding stages
-- Stages: CONTRATO -> BRIEFING -> ONBOARDING -> MARKETING -> TRAFEGO -> ATENDIMENTO -> CONCLUIDO
COMMENT ON COLUMN public.operational_clients.onboarding_stage IS 'Stages: CONTRATO, BRIEFING, ONBOARDING, MARKETING, TRAFEGO, ATENDIMENTO, CONCLUIDO';