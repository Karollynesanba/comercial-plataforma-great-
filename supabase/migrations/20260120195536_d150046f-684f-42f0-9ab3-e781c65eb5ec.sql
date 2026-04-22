-- Drop existing source check constraint and add PERMANENT as valid option
ALTER TABLE public.my_day_items DROP CONSTRAINT IF EXISTS my_day_items_source_check;

ALTER TABLE public.my_day_items ADD CONSTRAINT my_day_items_source_check 
  CHECK (source = ANY (ARRAY['WORKITEM'::text, 'WORK_ITEM'::text, 'MEETING'::text, 'MANUAL'::text, 'PERMANENT'::text]));

-- Add deadline column for task deadline time
ALTER TABLE public.my_day_items ADD COLUMN IF NOT EXISTS deadline_time TIME;

-- Add notification_sent column to track if 1h warning was already sent
ALTER TABLE public.my_day_items ADD COLUMN IF NOT EXISTS deadline_notified BOOLEAN DEFAULT FALSE;