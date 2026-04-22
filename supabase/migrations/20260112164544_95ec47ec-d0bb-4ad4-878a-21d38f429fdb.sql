-- Add foreign key from crm_events to profiles
ALTER TABLE public.crm_events
ADD CONSTRAINT crm_events_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;