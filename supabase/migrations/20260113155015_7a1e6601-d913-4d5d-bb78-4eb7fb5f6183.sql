-- Create championship_teams table
CREATE TABLE public.championship_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    badge_color TEXT NOT NULL DEFAULT '#2563EB',
    total_points INTEGER NOT NULL DEFAULT 0,
    renewals INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    items_sold INTEGER NOT NULL DEFAULT 0,
    previous_rank INTEGER,
    current_rank INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create championship_events table for tracking all events
CREATE TABLE public.championship_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'RENEWAL', 'LOSS', 'ITEM_SOLD'
    points INTEGER NOT NULL,
    description TEXT,
    item_label TEXT, -- For ITEM_SOLD events
    client_name TEXT, -- Optional client reference
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create championship_monthly_history for tracking evolution
CREATE TABLE public.championship_monthly_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id TEXT NOT NULL,
    month TEXT NOT NULL, -- Format: '2026-01'
    total_points INTEGER NOT NULL DEFAULT 0,
    renewals INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    items_sold INTEGER NOT NULL DEFAULT 0,
    rank INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(team_id, month)
);

-- Enable RLS
ALTER TABLE public.championship_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.championship_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.championship_monthly_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for championship_teams (everyone can view)
CREATE POLICY "Everyone can view championship teams"
ON public.championship_teams
FOR SELECT
TO authenticated
USING (true);

-- Only coordinators and admins can modify teams
CREATE POLICY "Coordinators can manage championship teams"
ON public.championship_teams
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.is_coordinator(auth.uid()));

-- RLS Policies for championship_events
CREATE POLICY "Everyone can view championship events"
ON public.championship_events
FOR SELECT
TO authenticated
USING (true);

-- Everyone authenticated can create events
CREATE POLICY "Authenticated users can create events"
ON public.championship_events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Only coordinators can update/delete events
CREATE POLICY "Coordinators can manage events"
ON public.championship_events
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.is_coordinator(auth.uid()));

CREATE POLICY "Coordinators can delete events"
ON public.championship_events
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.is_coordinator(auth.uid()));

-- RLS Policies for monthly history
CREATE POLICY "Everyone can view monthly history"
ON public.championship_monthly_history
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Coordinators can manage monthly history"
ON public.championship_monthly_history
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.is_coordinator(auth.uid()));

-- Insert initial teams
INSERT INTO public.championship_teams (team_id, label, badge_color, current_rank)
VALUES 
    ('TIME_7', 'Time 7', '#2563EB', 1),
    ('TROPA_DE_ELITE', 'Tropa de Elite', '#DC2626', 2);

-- Trigger for updating timestamps
CREATE TRIGGER update_championship_teams_updated_at
BEFORE UPDATE ON public.championship_teams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();