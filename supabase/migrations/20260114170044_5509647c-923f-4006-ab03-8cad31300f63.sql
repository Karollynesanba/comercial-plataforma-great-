-- Create table for agenda events
CREATE TABLE public.agenda_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  meeting_link TEXT,
  color TEXT DEFAULT '#3b82f6',
  reminder_2h_sent BOOLEAN DEFAULT false,
  reminder_30min_sent BOOLEAN DEFAULT false,
  created_by_user_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agenda_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all agenda events" 
ON public.agenda_events 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create agenda events" 
ON public.agenda_events 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update agenda events" 
ON public.agenda_events 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete agenda events" 
ON public.agenda_events 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_agenda_events_updated_at
BEFORE UPDATE ON public.agenda_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.agenda_events;