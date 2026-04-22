-- Add team_id column to agenda_events for team filtering
ALTER TABLE public.agenda_events
ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;

-- Create index for better performance on team filtering
CREATE INDEX idx_agenda_events_team_id ON public.agenda_events(team_id);