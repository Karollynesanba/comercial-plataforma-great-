ALTER TABLE public.pipeline_clients
ADD COLUMN IF NOT EXISTS is_mrr boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS mrr_entrada numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS mrr_remaining numeric DEFAULT 0;

UPDATE public.pipeline_clients
SET
  is_mrr = COALESCE(is_mrr, false),
  mrr_entrada = COALESCE(mrr_entrada, entrada, 0),
  mrr_remaining = COALESCE(mrr_remaining, 0);
