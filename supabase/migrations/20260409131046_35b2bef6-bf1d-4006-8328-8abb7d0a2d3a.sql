
ALTER TABLE public.my_day_items ADD COLUMN IF NOT EXISTS deadline_date date;

-- Remove existing duplicates before adding constraint (keep oldest)
DELETE FROM my_day_items WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, title, date, source ORDER BY created_at ASC) as rn
    FROM my_day_items
    WHERE source = 'PERMANENT'
  ) sub WHERE rn > 1
);

-- Add unique constraint to prevent duplicate permanent tasks
CREATE UNIQUE INDEX IF NOT EXISTS unique_permanent_task_per_user_day 
ON my_day_items (user_id, title, date) 
WHERE source = 'PERMANENT';
