-- Add notes field to agenda_events for client annotations
ALTER TABLE public.agenda_events 
ADD COLUMN notes TEXT;

-- Add comment to clarify purpose
COMMENT ON COLUMN public.agenda_events.notes IS 'Anotações sobre o cliente/reunião';