-- Fix my_day_items source constraint to accept WORK_ITEM (used by trigger)
ALTER TABLE public.my_day_items DROP CONSTRAINT IF EXISTS my_day_items_source_check;

ALTER TABLE public.my_day_items 
ADD CONSTRAINT my_day_items_source_check 
CHECK (source = ANY (ARRAY['WORKITEM'::text, 'WORK_ITEM'::text, 'MEETING'::text, 'MANUAL'::text]));

-- Also add URGENTE to priority constraint since work_items uses it
ALTER TABLE public.my_day_items DROP CONSTRAINT IF EXISTS my_day_items_priority_check;

ALTER TABLE public.my_day_items 
ADD CONSTRAINT my_day_items_priority_check 
CHECK (priority = ANY (ARRAY['BAIXA'::text, 'MEDIA'::text, 'ALTA'::text, 'URGENTE'::text]));