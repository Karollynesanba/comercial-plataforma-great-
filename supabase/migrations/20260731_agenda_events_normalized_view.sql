-- Safe normalization layer for agenda reads.
-- This does not modify the underlying agenda_events table.

create or replace view public.agenda_events_normalized as
select
  ae.*,
  to_char(ae.event_date::date, 'YYYY-MM-DD') as event_date_key,
  to_char(ae.event_date::date, 'DD/MM/YYYY') as event_date_br
from public.agenda_events ae;

comment on view public.agenda_events_normalized is
  'Read-only normalized projection of agenda_events for agenda rendering and testing.';
