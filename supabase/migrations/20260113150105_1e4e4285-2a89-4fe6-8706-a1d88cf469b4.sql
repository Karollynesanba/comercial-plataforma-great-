-- Add renewal_due_date column to track when the renewal is due (before it happens)
ALTER TABLE public.operational_clients
ADD COLUMN renewal_due_date timestamp with time zone;

-- Add a comment for clarity
COMMENT ON COLUMN public.operational_clients.renewal_due_date IS 'Data prevista para renovação do contrato';