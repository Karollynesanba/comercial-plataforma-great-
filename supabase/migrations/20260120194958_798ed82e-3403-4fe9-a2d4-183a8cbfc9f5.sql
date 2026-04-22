-- Drop existing storage policies for exec-attachments bucket
DROP POLICY IF EXISTS "Exec attachments viewable by authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Exec attachments uploadable by authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Exec attachments deletable by uploader" ON storage.objects;

-- SELECT: All authenticated users can view ALL attachments in exec-attachments bucket
CREATE POLICY "Exec attachments viewable by all authenticated users"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'exec-attachments');

-- INSERT: Any authenticated user can upload attachments
CREATE POLICY "Exec attachments uploadable by authenticated users"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'exec-attachments' AND auth.uid() IS NOT NULL);

-- UPDATE: Any authenticated user can update attachments
CREATE POLICY "Exec attachments updatable by authenticated users"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'exec-attachments');

-- DELETE: Any authenticated user can delete attachments (for collaborative workflows)
CREATE POLICY "Exec attachments deletable by authenticated users"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'exec-attachments');