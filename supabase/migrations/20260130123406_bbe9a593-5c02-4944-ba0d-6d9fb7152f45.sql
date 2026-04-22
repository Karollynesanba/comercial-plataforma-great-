-- Add column for multiple owners
ALTER TABLE public.projects
ADD COLUMN owner_user_ids UUID[] DEFAULT '{}';

-- Migrate existing owner_user_id to the new array
UPDATE public.projects
SET owner_user_ids = ARRAY[owner_user_id]
WHERE owner_user_id IS NOT NULL;