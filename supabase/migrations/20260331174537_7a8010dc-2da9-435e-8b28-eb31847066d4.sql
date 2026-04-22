ALTER TABLE public.operational_clients
ADD COLUMN ad_account_name TEXT,
ADD COLUMN has_recharge BOOLEAN DEFAULT false,
ADD COLUMN recharge_value NUMERIC DEFAULT 0;