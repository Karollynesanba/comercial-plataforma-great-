-- Add designer_name column to track which designer worked on the arts
ALTER TABLE public.client_activity_tracking
ADD COLUMN designer_name TEXT DEFAULT NULL;

-- Add index for better query performance when filtering by designer
CREATE INDEX idx_client_activity_tracking_designer ON public.client_activity_tracking(designer_name);

-- Update unique constraint to include designer_name
ALTER TABLE public.client_activity_tracking 
DROP CONSTRAINT IF EXISTS client_activity_tracking_client_id_year_month_week_key;

ALTER TABLE public.client_activity_tracking
ADD CONSTRAINT client_activity_tracking_client_designer_key 
UNIQUE (client_id, year, month, week, designer_name);