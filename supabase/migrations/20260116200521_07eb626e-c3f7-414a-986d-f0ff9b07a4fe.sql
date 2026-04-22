-- Create challenges table
CREATE TABLE public.challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'MEDIA',
  bonus TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by_user_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- Everyone can view challenges
CREATE POLICY "Everyone can view challenges"
ON public.challenges
FOR SELECT
USING (true);

-- Only admins and coordinators can insert challenges
CREATE POLICY "Admins and coordinators can insert challenges"
ON public.challenges
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND operational_role = 'COORDENADOR_RED'
  )
);

-- Only admins and coordinators can update challenges
CREATE POLICY "Admins and coordinators can update challenges"
ON public.challenges
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND operational_role = 'COORDENADOR_RED'
  )
);

-- Only admins and coordinators can delete challenges
CREATE POLICY "Admins and coordinators can delete challenges"
ON public.challenges
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND operational_role = 'COORDENADOR_RED'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_challenges_updated_at
BEFORE UPDATE ON public.challenges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();