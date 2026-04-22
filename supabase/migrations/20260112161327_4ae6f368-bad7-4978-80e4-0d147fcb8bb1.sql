-- Create CRM events table for timeline
CREATE TABLE public.crm_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.operational_clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'OBSERVACAO',
  title TEXT NOT NULL,
  description TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add comment for event_type options
COMMENT ON COLUMN public.crm_events.event_type IS 'DECISAO, ENTREGA, BLOQUEIO, ATIVACAO, OBSERVACAO, ALERTA';

-- Enable RLS
ALTER TABLE public.crm_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "CRM events viewable by authenticated users"
ON public.crm_events FOR SELECT
USING (true);

CREATE POLICY "CRM events insertable by authenticated users"
ON public.crm_events FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "CRM events updatable by creator or admin"
ON public.crm_events FOR UPDATE
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "CRM events deletable by creator or admin"
ON public.crm_events FOR DELETE
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_crm_events_updated_at
BEFORE UPDATE ON public.crm_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add activation fields to operational_clients
ALTER TABLE public.operational_clients 
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS activated_by UUID;

-- Enable realtime for CRM events
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_events;