-- Add pacote column to operational_clients to store the client's package type
ALTER TABLE public.operational_clients 
ADD COLUMN IF NOT EXISTS pacote text;

-- Add comment for clarity
COMMENT ON COLUMN public.operational_clients.pacote IS 'Package type: COMPLETO, TRAFEGO_E_CRIATIVOS, ATENDIMENTO, TRAFEGO';