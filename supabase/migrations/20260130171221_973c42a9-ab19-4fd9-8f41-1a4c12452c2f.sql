-- Create project_goals table for tracking project goals/checkpoints
CREATE TABLE public.project_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_goals ENABLE ROW LEVEL SECURITY;

-- Create policies for project goals
CREATE POLICY "Users can view project goals" 
ON public.project_goals 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create project goals" 
ON public.project_goals 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update project goals" 
ON public.project_goals 
FOR UPDATE 
USING (true);

CREATE POLICY "Users can delete project goals" 
ON public.project_goals 
FOR DELETE 
USING (true);

-- Create trigger for updating timestamps
CREATE TRIGGER update_project_goals_updated_at
BEFORE UPDATE ON public.project_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for project_goals
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_goals;

-- Create function to auto-update project progress based on goals
CREATE OR REPLACE FUNCTION public.update_project_progress()
RETURNS TRIGGER AS $$
DECLARE
  total_goals INTEGER;
  completed_goals INTEGER;
  new_progress INTEGER;
BEGIN
  -- Get count of all goals and completed goals for this project
  SELECT COUNT(*), COUNT(*) FILTER (WHERE completed = true)
  INTO total_goals, completed_goals
  FROM public.project_goals
  WHERE project_id = COALESCE(NEW.project_id, OLD.project_id);
  
  -- Calculate progress percentage
  IF total_goals > 0 THEN
    new_progress := ROUND((completed_goals::NUMERIC / total_goals::NUMERIC) * 100);
  ELSE
    new_progress := 0;
  END IF;
  
  -- Update the project's progress_pct
  UPDATE public.projects
  SET progress_pct = new_progress, updated_at = now()
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers to auto-update progress when goals change
CREATE TRIGGER update_project_progress_on_insert
AFTER INSERT ON public.project_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_project_progress();

CREATE TRIGGER update_project_progress_on_update
AFTER UPDATE ON public.project_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_project_progress();

CREATE TRIGGER update_project_progress_on_delete
AFTER DELETE ON public.project_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_project_progress();