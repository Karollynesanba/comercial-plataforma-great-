ALTER TABLE project_goals 
ADD COLUMN estimated_hours numeric DEFAULT NULL,
ADD COLUMN sort_order integer DEFAULT 0;