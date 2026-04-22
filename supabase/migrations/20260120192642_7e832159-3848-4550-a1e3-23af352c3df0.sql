-- Drop existing exec_cards policies and recreate with proper visibility
DROP POLICY IF EXISTS "Exec cards viewable by authenticated users" ON public.exec_cards;
DROP POLICY IF EXISTS "Exec cards insertable by authenticated users" ON public.exec_cards;
DROP POLICY IF EXISTS "Exec cards updatable by assignee or creator or coordinator or admin" ON public.exec_cards;
DROP POLICY IF EXISTS "Exec cards updatable by assignee or creator or coordinator or a" ON public.exec_cards;
DROP POLICY IF EXISTS "Exec cards deletable by creator or coordinator or admin" ON public.exec_cards;

-- SELECT: All authenticated users can view ALL cards (no restrictions)
CREATE POLICY "Exec cards viewable by all authenticated users"
  ON public.exec_cards FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Any authenticated user can create cards
CREATE POLICY "Exec cards insertable by any authenticated user"
  ON public.exec_cards FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Anyone authenticated can update any card (for collaborative workflows)
CREATE POLICY "Exec cards updatable by authenticated users"
  ON public.exec_cards FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- DELETE: Only creator, coordinator, or admin can delete
CREATE POLICY "Exec cards deletable by creator or coordinator or admin"
  ON public.exec_cards FOR DELETE
  TO authenticated
  USING (
    created_by_user_id = auth.uid() 
    OR has_role(auth.uid(), 'admin'::app_role) 
    OR is_coordinator(auth.uid())
  );