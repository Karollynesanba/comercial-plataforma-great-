-- Add position column to track card order within columns
ALTER TABLE public.tech_deployments 
ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- Update existing records with sequential positions based on created_at
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY status ORDER BY created_at) - 1 as new_position
  FROM public.tech_deployments
)
UPDATE public.tech_deployments d
SET position = r.new_position
FROM ranked r
WHERE d.id = r.id;