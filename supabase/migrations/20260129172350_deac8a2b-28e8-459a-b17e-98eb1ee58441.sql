-- Add followup_done column to pipeline_clients for tracking recontato follow-ups
ALTER TABLE public.pipeline_clients 
ADD COLUMN IF NOT EXISTS followup_done boolean DEFAULT false;