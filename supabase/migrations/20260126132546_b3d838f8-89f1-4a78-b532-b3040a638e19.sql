-- Add faturamento_personalizado column to pipeline_clients table
ALTER TABLE public.pipeline_clients
ADD COLUMN IF NOT EXISTS faturamento_personalizado TEXT;