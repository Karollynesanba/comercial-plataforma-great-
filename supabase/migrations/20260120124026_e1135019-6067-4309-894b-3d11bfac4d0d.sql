-- Create pipeline_clients table for commercial sector
CREATE TABLE public.pipeline_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ativo BOOLEAN DEFAULT true,
  client_name TEXT NOT NULL,
  clinic_name TEXT,
  telefone TEXT,
  vendedor TEXT,
  criativo TEXT,
  equipe TEXT,
  faturamento TEXT,
  pacote TEXT,
  periodo TEXT,
  indicacao TEXT,
  entrada NUMERIC DEFAULT 0,
  data_entrada TIMESTAMP WITH TIME ZONE DEFAULT now(),
  stage TEXT DEFAULT 'NOVO',
  last_stage_change TIMESTAMP WITH TIME ZONE,
  lost_reason TEXT,
  no_show_reason TEXT,
  notes TEXT,
  agendado_por TEXT,
  pagador_anuncio TEXT,
  tem_socio TEXT,
  tem_mkt TEXT,
  meeting_date TEXT,
  meeting_time TEXT,
  created_by_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.pipeline_clients ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view all pipeline clients (commercial sector needs shared data)
CREATE POLICY "All authenticated users can view pipeline clients" 
ON public.pipeline_clients 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- All authenticated users can insert pipeline clients
CREATE POLICY "All authenticated users can insert pipeline clients" 
ON public.pipeline_clients 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- All authenticated users can update pipeline clients
CREATE POLICY "All authenticated users can update pipeline clients" 
ON public.pipeline_clients 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- All authenticated users can delete pipeline clients
CREATE POLICY "All authenticated users can delete pipeline clients" 
ON public.pipeline_clients 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create trigger to update updated_at
CREATE TRIGGER update_pipeline_clients_updated_at
BEFORE UPDATE ON public.pipeline_clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for pipeline_clients
ALTER PUBLICATION supabase_realtime ADD TABLE public.pipeline_clients;