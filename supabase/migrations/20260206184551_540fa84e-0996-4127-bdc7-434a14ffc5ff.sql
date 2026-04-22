-- First drop the existing check constraint
ALTER TABLE public.tech_deployments 
DROP CONSTRAINT IF EXISTS tech_deployments_status_check;

-- Add the new check constraint with 'requested' status
ALTER TABLE public.tech_deployments 
ADD CONSTRAINT tech_deployments_status_check 
CHECK (status IN ('todo', 'in_progress', 'requested', 'support', 'done'));