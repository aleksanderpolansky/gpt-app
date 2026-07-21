-- Actor-aware organization ownership and atomic organization bootstrap.
-- The account link remains server-side. Public organization data contains no
-- path from an avatar to the avatar owner's personal profile.

alter table public.organizations
  add column if not exists created_by_actor_id uuid,
  add column if not exists owner_actor_id uuid;

alter table public.spaces
  add column if not exists organization_id uuid;

alter table public.organization_locations
  add column if not exists created_by_actor_id uuid;

alter table public.points_reward_rules
  add column if not exists created_by_actor_id uuid;

do $block$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'organizations_created_by_actor_id_fkey'
      and conrelid = 'public.organizations'::regclass
  ) then
    alter table public.organizations
      add constraint organizations_created_by_actor_id_fkey
      foreign key (created_by_actor_id)
      references public.actors(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'organizations_owner_actor_id_fkey'
      and conrelid = 'public.organizations'::regclass
  ) then
    alter table public.organizations
      add constraint organizations_owner_actor_id_fkey
      foreign key (owner_actor_id)
      references public.actors(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'spaces_organization_id_fkey'
      and conrelid = 'public.spaces'::regclass
  ) then
    alter table public.spaces
      add constraint spaces_organization_id_fkey
      foreign key (organization_id)
      references public.organizations(id)
      on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'organization_locations_created_by_actor_id_fkey'
      and conrelid = 'public.organization_locations'::regclass
  ) then
    alter table public.organization_locations
      add constraint organization_locations_created_by_actor_id_fkey
      foreign key (created_by_actor_id)
      references public.actors(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'points_reward_rules_created_by_actor_id_fkey'
      and conrelid = 'public.points_reward_rules'::regclass
  ) then
    alter table public.points_reward_rules
      add constraint points_reward_rules_created_by_actor_id_fkey
      foreign key (created_by_actor_id)
      references public.actors(id)
      on delete set null;
  end if;
end;
$block$;

-- Exact legacy backfill: person_id -> the single active person actor.
-- No name, email or other heuristic is used.
with exact_person_actor as (
  select
    person_id,
    (array_agg(id order by id))[1] as actor_id
  from public.actors
  where actor_type = 'person'
    and status = 'active'
    and person_id is not null
  group by person_id
  having count(*) = 1
)
update public.organizations as organization
set
  owner_actor_id = coalesce(organization.owner_actor_id, mapping.actor_id),
  created_by_actor_id = coalesce(
    organization.created_by_actor_id,
    mapping.actor_id
  )
from exact_person_actor as mapping
where mapping.person_id = organization.owner_person_id
  and (
    organization.owner_actor_id is null
    or organization.created_by_actor_id is null
  );

-- Exact legacy backfill: an active organization seller role identifies the
-- organization that owns an own_business space. Ambiguous spaces are skipped.
with exact_space_organization as (
  select
    role.space_id,
    (array_agg(actor.organization_id order by actor.organization_id))[1]
      as organization_id
  from public.actor_space_roles as role
  join public.actors as actor
    on actor.id = role.actor_id
  where role.is_active = true
    and role.function_type = 'seller'
    and actor.actor_type = 'organization'
    and actor.status = 'active'
    and actor.organization_id is not null
  group by role.space_id
  having count(distinct actor.organization_id) = 1
)
update public.spaces as space
set organization_id = mapping.organization_id
from exact_space_organization as mapping
where mapping.space_id = space.id
  and space.space_type = 'own_business'
  and space.organization_id is null;

update public.organization_locations as location
set created_by_actor_id = organization.created_by_actor_id
from public.organizations as organization
where organization.id = location.organization_id
  and location.created_by_actor_id is null
  and organization.created_by_actor_id is not null;

update public.points_reward_rules as reward_rule
set created_by_actor_id = organization.created_by_actor_id
from public.organizations as organization
where organization.id = reward_rule.organization_id
  and reward_rule.created_by_actor_id is null
  and organization.created_by_actor_id is not null;

create index if not exists organizations_created_by_actor_id_idx
  on public.organizations(created_by_actor_id);

create index if not exists organizations_owner_actor_id_idx
  on public.organizations(owner_actor_id);

create unique index if not exists actors_one_active_organization_actor_uidx
  on public.actors(organization_id)
  where organization_id is not null
    and actor_type = 'organization'
    and status = 'active';

create index if not exists spaces_organization_id_idx
  on public.spaces(organization_id);

create unique index if not exists spaces_one_active_own_business_per_org_uidx
  on public.spaces(organization_id)
  where organization_id is not null
    and space_type = 'own_business'
    and status = 'active';

create index if not exists organization_locations_created_by_actor_id_idx
  on public.organization_locations(created_by_actor_id);

create index if not exists points_reward_rules_created_by_actor_id_idx
  on public.points_reward_rules(created_by_actor_id);

create or replace function public.create_actor_owned_organization_v1(
  p_owner_user_id uuid,
  p_owner_actor_id uuid,
  p_organization_name text,
  p_organization_type text,
  p_description text,
  p_country_code text,
  p_default_currency text,
  p_directory_status text,
  p_is_public_profile_enabled boolean,
  p_is_listed_in_directory boolean,
  p_directory_published_at timestamptz,
  p_create_location boolean,
  p_location_country_code text,
  p_location_city text,
  p_location_district text,
  p_location_address_visibility text,
  p_location_latitude numeric,
  p_location_longitude numeric,
  p_create_default_reward_rule boolean
)
returns table (
  organization_id uuid,
  organization_actor_id uuid,
  business_space_id uuid,
  location_id uuid,
  reward_rule_id uuid,
  public_slug text,
  owner_actor_id uuid,
  owner_actor_type text
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $function$
declare
  v_organization_name text := btrim(coalesce(p_organization_name, ''));
  v_organization_type text := btrim(coalesce(p_organization_type, ''));
  v_description text := nullif(btrim(coalesce(p_description, '')), '');
  v_country_code text := nullif(upper(btrim(coalesce(p_country_code, ''))), '');
  v_default_currency text := upper(btrim(coalesce(p_default_currency, 'PLN')));
  v_directory_status text := btrim(coalesce(p_directory_status, 'published'));
  v_location_country_code text := nullif(
    upper(btrim(coalesce(p_location_country_code, ''))),
    ''
  );
  v_location_city text := nullif(btrim(coalesce(p_location_city, '')), '');
  v_location_district text := nullif(
    btrim(coalesce(p_location_district, '')),
    ''
  );
  v_location_address_visibility text := btrim(
    coalesce(p_location_address_visibility, 'approximate')
  );
  v_owner_actor_type text;
  v_owner_person_id uuid;
  v_organization_id uuid := gen_random_uuid();
  v_organization_actor_id uuid;
  v_business_space_id uuid;
  v_location_id uuid;
  v_reward_rule_id uuid;
  v_public_slug text;
  v_now timestamptz := coalesce(p_directory_published_at, now());
begin
  if p_owner_user_id is null or p_owner_actor_id is null then
    raise exception 'Owner user and active actor are required.'
      using errcode = '22004';
  end if;

  if not exists (
    select 1
    from public.app_users as app_user
    where app_user.id = p_owner_user_id
      and app_user.access_status is distinct from 'blocked'
  ) then
    raise exception 'Organization owner is unavailable.'
      using errcode = '42501';
  end if;

  select actor.actor_type, actor.person_id
  into v_owner_actor_type, v_owner_person_id
  from public.actors as actor
  join public.actor_public_profiles as profile
    on profile.actor_id = actor.id
  where actor.id = p_owner_actor_id
    and actor.status = 'active'
    and actor.actor_type in ('person', 'avatar')
    and profile.owner_user_id = p_owner_user_id
    and (
      (actor.actor_type = 'person' and profile.profile_kind = 'personal')
      or (actor.actor_type = 'avatar' and profile.profile_kind = 'avatar')
    )
  limit 1;

  if v_owner_actor_type is null then
    raise exception 'Active actor is not owned by this account.'
      using errcode = '42501';
  end if;

  if v_owner_actor_type = 'avatar' then
    v_owner_person_id := null;
  end if;

  if v_organization_name = '' then
    raise exception 'Organization name is required.'
      using errcode = '22023';
  end if;

  if char_length(v_organization_name) > 240 then
    raise exception 'Organization name must not exceed 240 characters.'
      using errcode = '22001';
  end if;

  if v_organization_type = '' then
    raise exception 'Organization type is required.'
      using errcode = '22023';
  end if;

  if char_length(v_organization_type) > 120
     or char_length(coalesce(v_description, '')) > 5000 then
    raise exception 'Organization text value is too long.'
      using errcode = '22001';
  end if;

  if char_length(v_default_currency) <> 3 then
    raise exception 'Default currency must contain three characters.'
      using errcode = '22023';
  end if;

  if v_directory_status not in (
    'draft',
    'pending_review',
    'published',
    'hidden',
    'suspended',
    'archived'
  ) then
    raise exception 'Unsupported directory status.'
      using errcode = '22023';
  end if;

  if coalesce(p_create_location, false)
     and v_location_address_visibility not in (
       'public',
       'approximate',
       'hidden'
     ) then
    raise exception 'Unsupported location visibility.'
      using errcode = '22023';
  end if;

  -- Independent visitor-facing identifier. It contains neither the account,
  -- personal actor nor avatar actor identifier.
  v_public_slug := 'organization-' || replace(gen_random_uuid()::text, '-', '');

  insert into public.organizations (
    id,
    created_by_user_id,
    created_by_actor_id,
    owner_actor_id,
    owner_person_id,
    organization_name,
    organization_type,
    description,
    country_code,
    default_currency,
    status,
    directory_status,
    is_public_profile_enabled,
    is_listed_in_directory,
    public_slug,
    directory_published_at,
    updated_at
  )
  values (
    v_organization_id,
    p_owner_user_id,
    p_owner_actor_id,
    p_owner_actor_id,
    v_owner_person_id,
    v_organization_name,
    v_organization_type,
    v_description,
    v_country_code,
    v_default_currency,
    'active',
    v_directory_status,
    coalesce(p_is_public_profile_enabled, true),
    coalesce(p_is_listed_in_directory, true),
    v_public_slug,
    case
      when v_directory_status = 'published' then v_now
      else null
    end,
    v_now
  );

  if coalesce(p_create_location, false) then
    insert into public.organization_locations (
      organization_id,
      location_type,
      address_visibility,
      country_code,
      city,
      district,
      latitude,
      longitude,
      is_primary,
      is_active,
      created_by_user_id,
      created_by_actor_id,
      updated_at
    )
    values (
      v_organization_id,
      'physical',
      v_location_address_visibility,
      coalesce(v_location_country_code, v_country_code),
      v_location_city,
      v_location_district,
      p_location_latitude,
      p_location_longitude,
      true,
      true,
      p_owner_user_id,
      p_owner_actor_id,
      v_now
    )
    returning id into v_location_id;
  end if;

  insert into public.actors (
    actor_type,
    organization_id,
    display_name,
    status
  )
  values (
    'organization',
    v_organization_id,
    v_organization_name,
    'active'
  )
  returning id into v_organization_actor_id;

  insert into public.spaces (
    owner_user_id,
    organization_id,
    space_type,
    title,
    description,
    status,
    updated_at
  )
  values (
    p_owner_user_id,
    v_organization_id,
    'own_business',
    v_organization_name,
    'Business space for ' || v_organization_name,
    'active',
    v_now
  )
  returning id into v_business_space_id;

  insert into public.actor_space_roles (
    actor_id,
    space_id,
    function_type,
    title,
    is_active,
    authority_level,
    responsibility_level
  )
  values
    (
      p_owner_actor_id,
      v_business_space_id,
      'owner',
      'Owner',
      true,
      100,
      100
    ),
    (
      p_owner_actor_id,
      v_business_space_id,
      'manager',
      'Manager',
      true,
      90,
      90
    ),
    (
      v_organization_actor_id,
      v_business_space_id,
      'seller',
      'Seller / Provider',
      true,
      100,
      100
    );

  if coalesce(p_create_default_reward_rule, false) then
    insert into public.points_reward_rules (
      organization_id,
      created_by_actor_id,
      rule_name,
      min_purchase_amount,
      purchase_currency,
      points_per_confirmed_purchase,
      max_points_per_user_per_month,
      max_confirmations_per_organization_per_month,
      is_active,
      status,
      updated_at
    )
    values (
      v_organization_id,
      p_owner_actor_id,
      v_organization_name || ' default purchase reward',
      10,
      v_default_currency,
      10,
      2000,
      5,
      true,
      'active',
      v_now
    )
    returning id into v_reward_rule_id;
  end if;

  return query
  select
    v_organization_id,
    v_organization_actor_id,
    v_business_space_id,
    v_location_id,
    v_reward_rule_id,
    v_public_slug,
    p_owner_actor_id,
    v_owner_actor_type;
end;
$function$;

revoke all on function public.create_actor_owned_organization_v1(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  boolean,
  timestamptz,
  boolean,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  boolean
) from public;

revoke all on function public.create_actor_owned_organization_v1(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  boolean,
  timestamptz,
  boolean,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  boolean
) from anon;

revoke all on function public.create_actor_owned_organization_v1(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  boolean,
  timestamptz,
  boolean,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  boolean
) from authenticated;

grant execute on function public.create_actor_owned_organization_v1(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  boolean,
  timestamptz,
  boolean,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  boolean
) to service_role;

comment on function public.create_actor_owned_organization_v1(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  boolean,
  timestamptz,
  boolean,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  boolean
) is
  'Atomically creates an actor-owned organization, optional location and reward rule, organization actor, business space, and roles. Server-only; validates private actor ownership.';
