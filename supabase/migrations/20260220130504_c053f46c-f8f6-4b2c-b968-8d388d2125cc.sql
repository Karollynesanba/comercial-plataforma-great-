CREATE POLICY "Meetings deletable by creator or admin"
ON public.meetings
FOR DELETE
USING ((created_by_user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));