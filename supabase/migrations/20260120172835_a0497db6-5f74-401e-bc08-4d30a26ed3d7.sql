-- Drop and recreate UPDATE policy with WITH CHECK clause
DROP POLICY IF EXISTS "Coordinators can update announcements" ON announcements;

CREATE POLICY "Coordinators can update announcements"
ON announcements
FOR UPDATE
USING (
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
)
WITH CHECK (
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
);