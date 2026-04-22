-- Add renewal and churn tracking fields to operational_clients
ALTER TABLE public.operational_clients
ADD COLUMN IF NOT EXISTS churn_status text,
ADD COLUMN IF NOT EXISTS churn_reason text,
ADD COLUMN IF NOT EXISTS churn_responsible_team_id uuid REFERENCES public.teams(id),
ADD COLUMN IF NOT EXISTS churn_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS renewal_status text,
ADD COLUMN IF NOT EXISTS renewal_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS renewal_responsible_team_id uuid REFERENCES public.teams(id);

-- Add comment to explain the columns
COMMENT ON COLUMN public.operational_clients.churn_status IS 'Status de perda: PENDING, CONFIRMED, RECOVERED';
COMMENT ON COLUMN public.operational_clients.churn_reason IS 'Motivo do cancelamento informado pelo cliente';
COMMENT ON COLUMN public.operational_clients.churn_responsible_team_id IS 'Equipe responsável pelo cliente que foi perdido';
COMMENT ON COLUMN public.operational_clients.churn_date IS 'Data em que o cliente foi marcado como perda';
COMMENT ON COLUMN public.operational_clients.renewal_status IS 'Status de renovação: PENDING, RENEWED, EXPIRED';
COMMENT ON COLUMN public.operational_clients.renewal_date IS 'Data da renovação ou data prevista';
COMMENT ON COLUMN public.operational_clients.renewal_responsible_team_id IS 'Equipe responsável pela renovação';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_operational_clients_churn_status ON public.operational_clients(churn_status);
CREATE INDEX IF NOT EXISTS idx_operational_clients_renewal_status ON public.operational_clients(renewal_status);