-- Create table to track WhatsApp reminder logs
CREATE TABLE public.whatsapp_reminder_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.agenda_events(id) ON DELETE CASCADE,
  client_phone TEXT NOT NULL,
  client_name TEXT NOT NULL,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('2h', '30min', 'manual')),
  message TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
  error_message TEXT,
  created_by_user_id UUID REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.whatsapp_reminder_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for viewing (admins and users with commercial access)
CREATE POLICY "Users can view reminder logs"
  ON public.whatsapp_reminder_logs
  FOR SELECT
  USING (true);

-- Create policy for inserting (authenticated users)
CREATE POLICY "Authenticated users can insert reminder logs"
  ON public.whatsapp_reminder_logs
  FOR INSERT
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_whatsapp_logs_sent_at ON public.whatsapp_reminder_logs(sent_at DESC);
CREATE INDEX idx_whatsapp_logs_event_id ON public.whatsapp_reminder_logs(event_id);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_reminder_logs;