-- Drop existing restrictive SELECT policies on exec_boards and exec_columns
DROP POLICY IF EXISTS "Users can view boards they have access to" ON public.exec_boards;
DROP POLICY IF EXISTS "Users can view boards they created or are team members" ON public.exec_boards;
DROP POLICY IF EXISTS "Authenticated users can view boards" ON public.exec_boards;
DROP POLICY IF EXISTS "Users can view columns of accessible boards" ON public.exec_columns;
DROP POLICY IF EXISTS "Authenticated users can view columns" ON public.exec_columns;

-- Create new permissive SELECT policies for all authenticated users
CREATE POLICY "All authenticated users can view all boards"
ON public.exec_boards
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "All authenticated users can view all columns"
ON public.exec_columns
FOR SELECT
TO authenticated
USING (true);