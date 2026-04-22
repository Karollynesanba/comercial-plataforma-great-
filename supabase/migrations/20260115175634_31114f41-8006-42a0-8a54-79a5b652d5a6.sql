-- Create expense categories enum-like table for flexibility
CREATE TABLE public.expense_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  icon text,
  color text DEFAULT '#6b7280',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create expenses table for tracking all company expenses
CREATE TABLE public.expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid REFERENCES public.expense_categories(id),
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  recurrence text DEFAULT 'UNICO', -- UNICO, MENSAL, TRIMESTRAL, ANUAL
  notes text,
  created_by_user_id uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for expense_categories
CREATE POLICY "Admins can manage expense categories"
  ON public.expense_categories
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view expense categories"
  ON public.expense_categories
  FOR SELECT
  USING (true);

-- RLS Policies for expenses
CREATE POLICY "Admins can manage expenses"
  ON public.expenses
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default expense categories
INSERT INTO public.expense_categories (name, icon, color) VALUES
  ('Água', 'Droplets', '#3b82f6'),
  ('Energia', 'Zap', '#eab308'),
  ('Internet', 'Wifi', '#8b5cf6'),
  ('Assinaturas', 'CreditCard', '#ec4899'),
  ('Investimento em Tráfego', 'TrendingUp', '#22c55e'),
  ('Aluguel', 'Home', '#f97316'),
  ('Salários', 'Users', '#06b6d4'),
  ('Equipamentos', 'Monitor', '#64748b'),
  ('Marketing', 'Megaphone', '#a855f7'),
  ('Outros', 'MoreHorizontal', '#6b7280');