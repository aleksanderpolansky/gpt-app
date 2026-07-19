-- Public personal profiles and future avatar profiles.
-- Additive, hidden-by-default and safe for repeated first-login synchronization.

create table if not exists public.actor_public_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.app_users(id) on delete cascade,
  actor_id uuid not null references public.actors(id) on delete cascade,
  profile_kind text not null default 'personal',
  public_slug text not null,
  display_name text not null,
  bio text null,
  image_url text null,
  image_source text not null default 'auth',
  category_label text null,
  public_phone text null,
  website_url text null,
  messenger_url text null,
  is_public boolean not null default false,
  published_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint actor_public_profiles_kind_allowed
    check (profile_kind in ('personal', 'avatar')),
  constraint actor_public_profiles_image_source_allowed
    check (image_source in ('auth', 'custom')),
  constraint actor_public_profiles_slug_format
    check (public_slug ~ '^[a-z0-9][a-z0-9-]{2,127}$'),
  constraint actor_public_profiles_display_name_not_blank
    check (length(btrim(display_name)) > 0)
);

create unique index if not exists actor_public_profiles_actor_id_uidx
  on public.actor_public_profiles(actor_id);

create unique index if not exists actor_public_profiles_public_slug_uidx
  on public.actor_public_profiles(public_slug);

create unique index if not exists actor_public_profiles_one_personal_per_owner_uidx
  on public.actor_public_profiles(owner_user_id)
  where profile_kind = 'personal';

create index if not exists actor_public_profiles_owner_updated_idx
  on public.actor_public_profiles(owner_user_id, updated_at desc);

create index if not exists actor_public_profiles_public_directory_idx
  on public.actor_public_profiles(is_public, updated_at desc)
  where is_public = true;

alter table public.actor_public_profiles enable row level security;

revoke all on table public.actor_public_profiles from anon, authenticated;
grant all on table public.actor_public_profiles to service_role;

comment on table public.actor_public_profiles is
  'Owner-controlled public presentation for a primary person actor or a future avatar actor. API routes enforce Auth0-to-app_users ownership.';

comment on column public.actor_public_profiles.is_public is
  'False by default. Hidden profiles are visible through public routes only to their owner.';

comment on column public.actor_public_profiles.image_source is
  'auth for the initial Google/Auth0 image; custom after an owner uploads or replaces it.';

-- Backfill one independent hidden primary profile for every existing account
-- that already has the canonical app_user -> person -> person actor mapping.
with ranked_person_actors as (
  select
    au.id as owner_user_id,
    au.name as auth_name,
    au.picture as auth_picture,
    p.full_name,
    p.short_name,
    a.id as actor_id,
    a.display_name as actor_display_name,
    row_number() over (
      partition by au.id
      order by a.id
    ) as actor_rank
  from public.app_users as au
  join public.persons as p
    on p.user_id = au.id
  join public.actors as a
    on a.person_id = p.id
   and a.actor_type = 'person'
)
insert into public.actor_public_profiles (
  owner_user_id,
  actor_id,
  profile_kind,
  public_slug,
  display_name,
  image_url,
  image_source,
  is_public
)
select
  mapping.owner_user_id,
  mapping.actor_id,
  'personal',
  'person-' || replace(mapping.actor_id::text, '-', ''),
  coalesce(
    nullif(btrim(mapping.auth_name), ''),
    nullif(btrim(mapping.full_name), ''),
    nullif(btrim(mapping.short_name), ''),
    nullif(btrim(mapping.actor_display_name), ''),
    'User'
  ),
  nullif(btrim(mapping.auth_picture), ''),
  'auth',
  false
from ranked_person_actors as mapping
where mapping.actor_rank = 1
on conflict do nothing;
