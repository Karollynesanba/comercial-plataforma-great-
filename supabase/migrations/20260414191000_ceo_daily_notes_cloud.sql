-- CEO daily notes must be shared by authenticated session, not browser localStorage.

CREATE TABLE IF NOT EXISTS public.ceo_daily_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note_date date NOT NULL,
  notes text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ceo_daily_notes_unique_user_day UNIQUE (user_id, note_date)
);

ALTER TABLE public.ceo_daily_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own ceo daily notes" ON public.ceo_daily_notes;
CREATE POLICY "Users can view own ceo daily notes"
ON public.ceo_daily_notes FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own ceo daily notes" ON public.ceo_daily_notes;
CREATE POLICY "Users can insert own ceo daily notes"
ON public.ceo_daily_notes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own ceo daily notes" ON public.ceo_daily_notes;
CREATE POLICY "Users can update own ceo daily notes"
ON public.ceo_daily_notes FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_ceo_daily_notes_updated_at ON public.ceo_daily_notes;
CREATE TRIGGER update_ceo_daily_notes_updated_at
BEFORE UPDATE ON public.ceo_daily_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
