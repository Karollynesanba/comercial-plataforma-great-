ALTER TABLE project_goals ADD COLUMN scrum_status text NOT NULL DEFAULT 'TODO';
-- Migrate existing data: completed goals become DONE
UPDATE project_goals SET scrum_status = 'DONE' WHERE completed = true;