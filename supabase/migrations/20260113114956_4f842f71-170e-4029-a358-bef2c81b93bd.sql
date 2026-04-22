-- Create a function to check if user is a coordinator
CREATE OR REPLACE FUNCTION public.is_coordinator(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND (
        operational_role = 'COORDENADOR_RED'
        OR commercial_role = 'COORDENADOR_COMERCIAL'
      )
  )
$$;

-- Drop existing policies on work_items
DROP POLICY IF EXISTS "Work items insertable by authenticated users" ON public.work_items;
DROP POLICY IF EXISTS "Work items updatable by assignee or reporter or admin" ON public.work_items;
DROP POLICY IF EXISTS "Work items deletable by owner or admin" ON public.work_items;

-- Create new INSERT policy: reporter, admin, or coordinator can insert
CREATE POLICY "Work items insertable by reporter or coordinator or admin"
ON public.work_items
FOR INSERT
WITH CHECK (
  reporter_user_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR is_coordinator(auth.uid())
);

-- Create new UPDATE policy: assignee, reporter, admin, or coordinator can update
CREATE POLICY "Work items updatable by assignee or reporter or coordinator or admin"
ON public.work_items
FOR UPDATE
USING (
  assignee_user_id = auth.uid()
  OR reporter_user_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR is_coordinator(auth.uid())
);

-- Create new DELETE policy: reporter, admin, or coordinator can delete
CREATE POLICY "Work items deletable by reporter or coordinator or admin"
ON public.work_items
FOR DELETE
USING (
  reporter_user_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR is_coordinator(auth.uid())
);