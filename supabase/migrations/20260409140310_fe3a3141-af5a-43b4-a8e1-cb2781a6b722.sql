
ALTER TABLE public.operational_clients
  ADD COLUMN IF NOT EXISTS nps_sent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS nps_answered boolean DEFAULT null,
  ADD COLUMN IF NOT EXISTS status_updated_at timestamptz DEFAULT now();
