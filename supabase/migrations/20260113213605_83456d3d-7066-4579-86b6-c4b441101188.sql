-- Create agendamento_leads table for Commercial scheduling control
CREATE TABLE public.agendamento_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data TEXT NOT NULL,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  horario TEXT NOT NULL CHECK (horario IN ('MANHA', 'TARDE', 'NOITE')),
  tem_socio TEXT NOT NULL CHECK (tem_socio IN ('SIM', 'NAO')),
  tem_mkt TEXT NOT NULL CHECK (tem_mkt IN ('SIM', 'NAO')),
  faturamento TEXT NOT NULL CHECK (faturamento IN ('0_A_15K', '15K_A_30K', '30K_A_50K', '50K_A_100K', '100K_PLUS')),
  funil TEXT NOT NULL,
  status TEXT NOT NULL,
  created_by_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agendamento_leads ENABLE ROW LEVEL SECURITY;

-- Create policies for commercial users
CREATE POLICY "Users can view all agendamento leads"
ON public.agendamento_leads
FOR SELECT
USING (true);

CREATE POLICY "Users can create agendamento leads"
ON public.agendamento_leads
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update agendamento leads"
ON public.agendamento_leads
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete agendamento leads"
ON public.agendamento_leads
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Create trigger for updated_at
CREATE TRIGGER update_agendamento_leads_updated_at
BEFORE UPDATE ON public.agendamento_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();