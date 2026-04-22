-- Add pagador_anuncio column to operational_clients
ALTER TABLE public.operational_clients 
ADD COLUMN IF NOT EXISTS pagador_anuncio text;