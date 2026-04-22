
-- Create table for criativos (shared creative sources list)
CREATE TABLE public.criativos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by_user_id UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for criativos
ALTER TABLE public.criativos ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view criativos
CREATE POLICY "All authenticated users can view criativos"
  ON public.criativos FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert criativos
CREATE POLICY "Authenticated users can insert criativos"
  ON public.criativos FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update criativos
CREATE POLICY "Authenticated users can update criativos"
  ON public.criativos FOR UPDATE
  TO authenticated
  USING (true);

-- Authenticated users can delete criativos
CREATE POLICY "Authenticated users can delete criativos"
  ON public.criativos FOR DELETE
  TO authenticated
  USING (true);

-- Create table for payment reminders
CREATE TABLE public.payment_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.pipeline_clients(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  clinic_name TEXT,
  deal_value NUMERIC NOT NULL DEFAULT 0,
  payment_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  dismissed BOOLEAN NOT NULL DEFAULT false,
  dismissed_by_user_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for payment_reminders
ALTER TABLE public.payment_reminders ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view payment_reminders
CREATE POLICY "All authenticated users can view payment_reminders"
  ON public.payment_reminders FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert payment_reminders
CREATE POLICY "Authenticated users can insert payment_reminders"
  ON public.payment_reminders FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update payment_reminders
CREATE POLICY "Authenticated users can update payment_reminders"
  ON public.payment_reminders FOR UPDATE
  TO authenticated
  USING (true);

-- Create table for commercial settings (team pointer, etc)
CREATE TABLE public.commercial_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by_user_id UUID REFERENCES public.profiles(id)
);

-- Enable RLS for commercial_settings
ALTER TABLE public.commercial_settings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view commercial_settings
CREATE POLICY "All authenticated users can view commercial_settings"
  ON public.commercial_settings FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can manage commercial_settings
CREATE POLICY "Authenticated users can insert commercial_settings"
  ON public.commercial_settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update commercial_settings"
  ON public.commercial_settings FOR UPDATE
  TO authenticated
  USING (true);

-- Enable realtime for all new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.criativos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_reminders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.commercial_settings;

-- Insert initial criativos data
INSERT INTO public.criativos (name) VALUES
  ('INSTAGRAM'),
  ('CAIXA DE PERGUNTAS'),
  ('IA'),
  ('PROMOÇÃO'),
  ('ATENÇÃO DONA'),
  ('JALECO'),
  ('NÃO IDENTIFICADO'),
  ('INDICAÇÃO'),
  ('HANNA TRA/ART'),
  ('RUFFO'),
  ('SATIS-EVENTO'),
  ('FERRARI'),
  ('EVENTO WEBNARIO'),
  ('GERI 10 MILHOES'),
  ('1 PROCEDIMENTO'),
  ('CABELINHO + CAIXINHA'),
  ('NOTIFICAÇÃO + CAIXINHA'),
  ('BLACK FRIDAY'),
  ('FORMS'),
  ('BOTOX'),
  ('MECHAS/LUZES'),
  ('15K HARMONIZAÇÃO'),
  ('PROGRESSIVA'),
  ('PREENCHIMENTO LABIAL'),
  ('COBRE R$2500 NA AVALIAÇÃO'),
  ('TIRZEPATIDA'),
  ('LIPO DE PAPADA'),
  ('SECADOR – MECHAS'),
  ('HANNAH – MECHAS')
ON CONFLICT (name) DO NOTHING;

-- Insert initial team pointer setting
INSERT INTO public.commercial_settings (setting_key, setting_value) VALUES
  ('last_team_pointer', 'KAUAN')
ON CONFLICT (setting_key) DO NOTHING;
