-- Adds Alan Ribeiro to the commercial database mapping.
-- This keeps his profile and application role aligned with the existing SDR users.
-- Note: the auth user must already exist in Supabase Auth for the profile sync below to match.

with seeded_users(email, full_name, commercial_role) as (
  values
    ('alanribeiropessoal@gmail.com', 'Alan Ribeiro', 'SDR'::commercial_role)
)
insert into public.profiles (
  id,
  email,
  full_name,
  commercial_role,
  is_active,
  created_at,
  updated_at
)
select
  au.id,
  su.email,
  su.full_name,
  su.commercial_role,
  true,
  now(),
  now()
from seeded_users su
join auth.users au
  on lower(au.email) = lower(su.email)
on conflict (id) do update set
  email = excluded.email,
  full_name = excluded.full_name,
  commercial_role = excluded.commercial_role,
  is_active = true,
  updated_at = now();

with seeded_users(email, full_name, commercial_role) as (
  values
    ('alanribeiropessoal@gmail.com', 'Alan Ribeiro', 'SDR'::commercial_role)
)
insert into public.user_roles (user_id, role)
select p.id, 'user'::app_role
from public.profiles p
join seeded_users su on lower(p.email) = lower(su.email)
on conflict do nothing;
