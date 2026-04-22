-- Remove old check constraint
ALTER TABLE public.work_items DROP CONSTRAINT IF EXISTS work_items_status_check;

-- Add new check constraint with all valid status values used in the app
ALTER TABLE public.work_items 
ADD CONSTRAINT work_items_status_check 
CHECK (status = ANY (ARRAY['BACKLOG'::text, 'TODO'::text, 'DOING'::text, 'EM_ANDAMENTO'::text, 'REVIEW'::text, 'BLOCKED'::text, 'BLOQUEADO'::text, 'DONE'::text, 'CONCLUIDO'::text]));