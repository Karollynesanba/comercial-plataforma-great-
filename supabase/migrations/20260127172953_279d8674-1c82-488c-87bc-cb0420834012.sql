-- Create table for Tech Deployments (Implantações)
CREATE TABLE public.tech_deployments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'support', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  client_name TEXT,
  assignee TEXT,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by_user_id UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.tech_deployments ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Tech deployments viewable by authenticated users"
ON public.tech_deployments
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Tech deployments can be created by authenticated users"
ON public.tech_deployments
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Tech deployments can be updated by authenticated users"
ON public.tech_deployments
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Tech deployments can be deleted by authenticated users"
ON public.tech_deployments
FOR DELETE
TO authenticated
USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tech_deployments;

-- Create trigger for updated_at
CREATE TRIGGER update_tech_deployments_updated_at
BEFORE UPDATE ON public.tech_deployments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();