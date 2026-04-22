-- Create storage bucket for exec card attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('exec-attachments', 'exec-attachments', true);

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'exec-attachments' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to view attachments
CREATE POLICY "Authenticated users can view attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'exec-attachments'
  AND auth.role() = 'authenticated'
);

-- Allow users to delete their own attachments
CREATE POLICY "Users can delete attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'exec-attachments'
  AND auth.role() = 'authenticated'
);