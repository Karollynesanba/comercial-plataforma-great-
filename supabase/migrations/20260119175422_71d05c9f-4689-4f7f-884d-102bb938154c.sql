-- Create tech_tasks table for the Tech ERP
CREATE TABLE public.tech_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'task' CHECK (type IN ('feature', 'bug', 'improvement', 'task')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog', 'todo', 'in_progress', 'review', 'done')),
  assignee TEXT,
  due_date DATE,
  tags JSONB DEFAULT '[]'::jsonb,
  progress INTEGER DEFAULT 0,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tech_tasks ENABLE ROW LEVEL SECURITY;

-- Create policies - all authenticated users can CRUD (collaborative board)
CREATE POLICY "Authenticated users can view all tech tasks"
ON public.tech_tasks FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create tech tasks"
ON public.tech_tasks FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update tech tasks"
ON public.tech_tasks FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete tech tasks"
ON public.tech_tasks FOR DELETE
TO authenticated
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_tech_tasks_updated_at
BEFORE UPDATE ON public.tech_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for tech_tasks table
ALTER PUBLICATION supabase_realtime ADD TABLE public.tech_tasks;