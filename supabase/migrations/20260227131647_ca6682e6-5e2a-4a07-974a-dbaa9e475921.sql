-- Add column to store multiple file URLs as JSON array
ALTER TABLE public.ad_creatives ADD COLUMN image_urls jsonb DEFAULT '[]'::jsonb;

-- Migrate existing single image_url data to image_urls array
UPDATE public.ad_creatives SET image_urls = jsonb_build_array(image_url) WHERE image_url IS NOT NULL AND image_url != '';