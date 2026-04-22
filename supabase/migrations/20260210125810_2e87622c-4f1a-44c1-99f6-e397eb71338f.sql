
-- Create table for CRM client files
CREATE TABLE public.client_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.operational_clients(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  uploaded_by_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_files ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view client files
CREATE POLICY "Authenticated users can view client files"
  ON public.client_files FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- All authenticated users can upload files
CREATE POLICY "Authenticated users can insert client files"
  ON public.client_files FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can delete files they uploaded, or admins
CREATE POLICY "Users can delete their own files"
  ON public.client_files FOR DELETE
  USING (auth.uid() = uploaded_by_user_id);

-- Create storage bucket for client files
INSERT INTO storage.buckets (id, name, public) VALUES ('client-files', 'client-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for client files bucket
CREATE POLICY "Authenticated users can upload client files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'client-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view client files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'client-files');

CREATE POLICY "Authenticated users can delete client files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'client-files' AND auth.uid() IS NOT NULL);
