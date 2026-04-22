
-- Table for managing ad creatives (anúncios para subir / ativos)
CREATE TABLE public.ad_creatives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.operational_clients(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PARA_SUBIR' CHECK (status IN ('PARA_SUBIR', 'ATIVO')),
  created_by_user_id UUID NOT NULL,
  created_by_name TEXT NOT NULL,
  completed_by_user_id UUID,
  completed_by_name TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ad_creatives ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view ad creatives"
ON public.ad_creatives FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert ad creatives"
ON public.ad_creatives FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update ad creatives"
ON public.ad_creatives FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Creators and admins can delete ad creatives"
ON public.ad_creatives FOR DELETE
USING (created_by_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR is_coordinator(auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ad_creatives;

-- Storage bucket for ad images
INSERT INTO storage.buckets (id, name, public) VALUES ('ad-creatives', 'ad-creatives', true);

-- Storage policies
CREATE POLICY "Anyone can view ad creative images"
ON storage.objects FOR SELECT
USING (bucket_id = 'ad-creatives');

CREATE POLICY "Authenticated users can upload ad creative images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ad-creatives' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete ad creative images"
ON storage.objects FOR DELETE
USING (bucket_id = 'ad-creatives' AND auth.uid() IS NOT NULL);
