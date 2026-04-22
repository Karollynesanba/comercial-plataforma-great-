-- Drop and recreate SELECT policy to allow coordinators to see all announcements
DROP POLICY IF EXISTS "Everyone can view active announcements" ON announcements;

-- Regular users can only see active, non-expired announcements
CREATE POLICY "Everyone can view active announcements"
ON announcements
FOR SELECT
USING (
  -- Coordinators and admins can see ALL announcements (including inactive)
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND (
      p.operational_role = 'COORDENADOR_RED'
      OR EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
      )
    )
  )
  OR
  -- Regular users can only see active, non-expired announcements
  (
    is_active = true 
    AND (expires_at IS NULL OR expires_at > now())
  )
);