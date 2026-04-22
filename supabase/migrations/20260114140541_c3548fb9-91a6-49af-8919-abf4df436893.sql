-- Create table for client activity tracking (artes por semana)
CREATE TABLE public.client_activity_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.operational_clients(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  week INTEGER NOT NULL CHECK (week >= 1 AND week <= 5),
  artes_count INTEGER NOT NULL DEFAULT 0,
  created_by_user_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, year, month, week)
);

-- Enable RLS
ALTER TABLE public.client_activity_tracking ENABLE ROW LEVEL SECURITY;

-- Create policies for all authenticated users to read
CREATE POLICY "Authenticated users can view all activity tracking"
ON public.client_activity_tracking
FOR SELECT
TO authenticated
USING (true);

-- Create policies for authenticated users to insert
CREATE POLICY "Authenticated users can insert activity tracking"
ON public.client_activity_tracking
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create policies for authenticated users to update
CREATE POLICY "Authenticated users can update activity tracking"
ON public.client_activity_tracking
FOR UPDATE
TO authenticated
USING (true);

-- Create policies for authenticated users to delete
CREATE POLICY "Authenticated users can delete activity tracking"
ON public.client_activity_tracking
FOR DELETE
TO authenticated
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_client_activity_tracking_updated_at
BEFORE UPDATE ON public.client_activity_tracking
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_client_activity_tracking_client_id ON public.client_activity_tracking(client_id);
CREATE INDEX idx_client_activity_tracking_year_month ON public.client_activity_tracking(year, month);