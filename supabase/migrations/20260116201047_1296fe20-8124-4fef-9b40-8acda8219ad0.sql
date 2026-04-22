-- Create commission_config table for CEO-editable commission rates
CREATE TABLE public.commission_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value NUMERIC NOT NULL DEFAULT 0,
  label TEXT NOT NULL,
  category TEXT NOT NULL, -- 'commercial', 'operational', 'ia'
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by_user_id UUID REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.commission_config ENABLE ROW LEVEL SECURITY;

-- Everyone can view commission config
CREATE POLICY "Anyone can view commission config"
ON public.commission_config
FOR SELECT
USING (true);

-- Only admins can modify commission config
CREATE POLICY "Admins can manage commission config"
ON public.commission_config
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Insert default commission rates
INSERT INTO public.commission_config (config_key, config_value, label, category, description) VALUES
-- Commercial
('HERBERT_RATE', 0.03, 'Herbert - Taxa Própria', 'commercial', '3% sobre vendas próprias'),
('CLED_DIRECT_RATE', 0.015, 'Cled - Taxa Direta', 'commercial', '1.5% sobre vendas próprias'),
('CLED_BONUS_RATE', 0.03, 'Cled - Bônus sobre Herbert', 'commercial', '3% sobre vendas do Herbert'),
-- Operational
('RENEWAL_RATE', 0.03, 'Taxa de Renovação', 'operational', '3% sobre renovações (clientes mensais 3+ meses)'),
('PRODUCT_SALES_RATE', 0.25, 'Taxa Vendas de Produtos', 'operational', '25% sobre vendas de produtos'),
('GESTOR_COUNT', 4, 'Número de Gestores', 'operational', 'Quantidade de gestores para divisão de comissão'),
-- IA
('IA_AGENDA_SALES_RATE', 0.20, 'IA - Vendas Agenda', 'ia', '20% sobre vendas de agenda'),
('IA_AGENDA_RECURRENCE_RATE', 0.20, 'IA - Recorrência Agenda', 'ia', '20% sobre recorrência de agenda'),
('IA_RENEWAL_RATE', 0.03, 'IA - Renovações Mensais', 'ia', '3% sobre renovações mensais');

-- Create trigger for updated_at
CREATE TRIGGER update_commission_config_updated_at
BEFORE UPDATE ON public.commission_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.commission_config;