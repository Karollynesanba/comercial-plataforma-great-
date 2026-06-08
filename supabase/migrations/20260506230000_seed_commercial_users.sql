-- Seed the standard commercial users in the database so permissions stay shared
-- across local and deployed environments.

with seeded_users(email, full_name, commercial_role) as (
  values
    ('pedro.henrique.56789@gmail.com', 'Pedro Henrique', 'CLOSER'::commercial_role),
    ('joseherbert103@gmail.com', 'Jose Herbert', 'SDR'::commercial_role),
    ('pedroojuann1@gmail.com', 'Pedro Juan', 'CLOSER'::commercial_role),
    ('brunogomrdtjf@gmail.com', 'Bruno', 'CLOSER'::commercial_role),
    ('cledinhosport10@gmail.com', 'Cled', 'CLOSER'::commercial_role)
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
    ('pedro.henrique.56789@gmail.com', 'Pedro Henrique', 'CLOSER'::commercial_role),
    ('joseherbert103@gmail.com', 'Jose Herbert', 'SDR'::commercial_role),
    ('pedroojuann1@gmail.com', 'Pedro Juan', 'CLOSER'::commercial_role),
    ('brunogomrdtjf@gmail.com', 'Bruno', 'CLOSER'::commercial_role),
    ('cledinhosport10@gmail.com', 'Cled', 'CLOSER'::commercial_role)
)
insert into public.user_roles (user_id, role)
select p.id, 'user'::app_role
from public.profiles p
join seeded_users su on lower(p.email) = lower(su.email)
on conflict do nothing;
