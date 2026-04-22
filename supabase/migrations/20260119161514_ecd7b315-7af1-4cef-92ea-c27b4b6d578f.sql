-- Add sector column to challenges table
ALTER TABLE public.challenges ADD COLUMN sector TEXT NOT NULL DEFAULT 'operacional';

-- Create index for faster filtering by sector
CREATE INDEX idx_challenges_sector ON public.challenges(sector);