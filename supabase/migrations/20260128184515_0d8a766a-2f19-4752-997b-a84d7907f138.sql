-- Add client tier column (PREMIUM or POPULAR)
ALTER TABLE public.operational_clients 
ADD COLUMN client_tier TEXT CHECK (client_tier IN ('PREMIUM', 'POPULAR'));

-- Add comment for documentation
COMMENT ON COLUMN public.operational_clients.client_tier IS 'Client tier classification: PREMIUM or POPULAR. Set during onboarding before Marketing stage.';