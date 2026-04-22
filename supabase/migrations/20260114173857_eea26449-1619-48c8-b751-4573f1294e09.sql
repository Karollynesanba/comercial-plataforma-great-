-- Add assigned_closer_id column to agenda_events
ALTER TABLE public.agenda_events
ADD COLUMN assigned_closer_id UUID REFERENCES public.profiles(id);

-- Create index for better query performance
CREATE INDEX idx_agenda_events_assigned_closer ON public.agenda_events(assigned_closer_id);