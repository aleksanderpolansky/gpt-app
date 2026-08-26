-- ARCTor.app
-- MESSAGE OBJECTS CORE F1 — DB FOUNDATION V1
-- Date: 2026-08-26
--
-- MANUAL SQL POLICY:
-- Run this file once in Supabase SQL Editor against the current production project.
-- This is additive/idempotent DDL. It does not migrate or delete legacy chat_messages.
-- It creates the new universal message_objects foundation only.
--
-- Canonical model:
--   message_objects = one recorded-information entity.
--   Public post / private message / review / comment / notification / imported social item
--   differ through author, audience, relation, channel/distribution, lifecycle and provenance.
--
-- Safety:
--   * no DROP TABLE
--   * no DELETE/TRUNCATE
--   * no writes to existing business/activity rows
--   * anon/authenticated get no direct table access
--   * service_role is the only direct DB role used by application server routes
--   * native author ownership is guarded against app_users / actor_public_profiles /
--     organization owner actor relationships already present in production

begin;

-- ---------------------------------------------------------------------------
-- 0. Fail-closed dependency preflight
-- ---------------------------------------------------------------------------

do $preflight$
declare
  v_missing text;
begin
  select string_agg(required_name, ', ' order by required_name)
  into v_missing
  from (
    values
      ('public.app_users'),
      ('public.actors'),
      ('public.actor_public_profiles'),
      ('public.organizations'),
      ('public.activity_events'),
      ('public.offers'),
      ('public.certificates'),
      ('public.value_objects')
  ) required(required_name)
  where to_regclass(required_name) is null;

  if v_missing is not null then
    raise exception 'MESSAGE_OBJECTS_F1_DEPENDENCY_MISSING:%', v_missing;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'app_users'
      and column_name = 'access_status'
  ) then
    raise exception 'MESSAGE_OBJECTS_F1_APP_USERS_ACCESS_STATUS_MISSING';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'organizations'
      and column_name = 'owner_actor_id'
  ) then
    raise exception 'MESSAGE_OBJECTS_F1_ORGANIZATIONS_OWNER_ACTOR_ID_MISSING';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'actors'
      and column_name = 'organization_id'
  ) then
    raise exception 'MESSAGE_OBJECTS_F1_ACTORS_ORGANIZATION_ID_MISSING';
  end if;
end
$preflight$;

-- ---------------------------------------------------------------------------
-- 1. Canonical message object
-- ---------------------------------------------------------------------------

create table if not exists public.message_objects (
  id uuid primary key default gen_random_uuid(),

  -- Account/actor control. System/imported rows may intentionally have no owner.
  owner_user_id uuid
    references public.app_users(id)
    on delete set null,
  created_by_actor_id uuid
    references public.actors(id)
    on delete set null,
  author_actor_id uuid
    references public.actors(id)
    on delete set null,
  author_display_name_snapshot text,

  -- Canonical message content.
  title text,
  content_text text,
  content_json jsonb not null default '{}'::jsonb,
  language_code text,

  -- Who may receive/see the message.
  audience_scope_code text not null default 'self',
  audience_selector_json jsonb not null default '{}'::jsonb,

  -- Optional semantic intent; not a table discriminator.
  intent_code text,

  -- Canonical lifecycle. Channel delivery lives in message_object_distributions.
  lifecycle_status text not null default 'draft',
  scheduled_at timestamptz,
  activated_at timestamptz,
  edited_at timestamptz,
  withdrawn_at timestamptz,

  -- Provenance / external identity.
  origin_kind_code text not null default 'native',
  origin_provider_code text not null default 'arctor',
  external_account_id text,
  external_item_id text,
  canonical_url text,
  source_published_at timestamptz,
  imported_at timestamptz,

  metadata_json jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),

  constraint message_objects_audience_scope_check
    check (
      audience_scope_code in (
        'self',
        'direct',
        'group',
        'followers',
        'customers',
        'segment',
        'public'
      )
    ),

  constraint message_objects_lifecycle_status_check
    check (
      lifecycle_status in (
        'draft',
        'scheduled',
        'active',
        'withdrawn',
        'archived'
      )
    ),

  constraint message_objects_origin_kind_check
    check (origin_kind_code in ('native', 'imported', 'system')),

  constraint message_objects_native_identity_check
    check (
      origin_kind_code <> 'native'
      or (
        owner_user_id is not null
        and created_by_actor_id is not null
        and author_actor_id is not null
      )
    ),

  constraint message_objects_scheduled_timestamp_check
    check (
      lifecycle_status <> 'scheduled'
      or scheduled_at is not null
    ),

  constraint message_objects_json_shape_check
    check (
      jsonb_typeof(content_json) = 'object'
      and jsonb_typeof(audience_selector_json) = 'object'
      and jsonb_typeof(metadata_json) = 'object'
    ),

  constraint message_objects_language_code_check
    check (
      language_code is null
      or char_length(btrim(language_code)) between 2 and 35
    ),

  constraint message_objects_intent_code_check
    check (
      intent_code is null
      or intent_code ~ '^[a-z][a-z0-9_]{0,63}$'
    ),

  constraint message_objects_origin_provider_code_check
    check (
      origin_provider_code ~ '^[a-z][a-z0-9_]{0,63}$'
    ),

  constraint message_objects_text_length_check
    check (
      char_length(coalesce(title, '')) <= 1000
      and char_length(coalesce(content_text, '')) <= 100000
      and char_length(coalesce(author_display_name_snapshot, '')) <= 500
      and char_length(coalesce(external_account_id, '')) <= 1000
      and char_length(coalesce(external_item_id, '')) <= 2000
      and char_length(coalesce(canonical_url, '')) <= 4000
    ),

  constraint message_objects_canonical_url_check
    check (
      canonical_url is null
      or canonical_url ~ '^https?://'
    )
);

comment on table public.message_objects is
  'ARCTor canonical recorded-information entity. Public posts, direct messages, reviews, comments, notifications and imported external items share this identity and differ through audience, relations, distributions and provenance.';

comment on column public.message_objects.author_actor_id is
  'Actor presented as author/sender. For an enterprise publication this should normally be the organization actor, while created_by_actor_id records the human/avatar actor operating it.';

comment on column public.message_objects.audience_scope_code is
  'Audience contract: self, direct, group, followers, customers, segment or public.';

comment on column public.message_objects.lifecycle_status is
  'Canonical editorial lifecycle. External/internal per-channel delivery status is stored separately in message_object_distributions.';

comment on column public.message_objects.origin_kind_code is
  'native = authored in ARCTor; imported = ingested from an external provider; system = generated by ARCTor/system logic.';

create index if not exists message_objects_owner_created_idx
  on public.message_objects(owner_user_id, created_at desc, id);

create index if not exists message_objects_author_active_idx
  on public.message_objects(author_actor_id, activated_at desc, id)
  where lifecycle_status = 'active';

create index if not exists message_objects_feed_idx
  on public.message_objects(audience_scope_code, lifecycle_status, activated_at desc, id);

create unique index if not exists message_objects_external_identity_uidx
  on public.message_objects(
    origin_provider_code,
    coalesce(external_account_id, ''),
    external_item_id
  )
  where external_item_id is not null;

-- ---------------------------------------------------------------------------
-- 2. Explicit actor audience for direct/group messages
-- ---------------------------------------------------------------------------

create table if not exists public.message_object_audience_actors (
  id uuid primary key default gen_random_uuid(),
  message_object_id uuid not null
    references public.message_objects(id)
    on delete cascade,
  actor_id uuid not null
    references public.actors(id)
    on delete cascade,
  audience_role_code text not null default 'recipient',
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default clock_timestamp(),

  constraint message_object_audience_actors_role_check
    check (audience_role_code in ('recipient', 'cc', 'bcc', 'member')),

  constraint message_object_audience_actors_metadata_shape_check
    check (jsonb_typeof(metadata_json) = 'object'),

  constraint message_object_audience_actors_unique
    unique (message_object_id, actor_id, audience_role_code)
);

comment on table public.message_object_audience_actors is
  'Explicit actor recipients/members for direct and group message_objects. Segment/followers/customers audiences remain selector-driven on the parent object.';

create index if not exists message_object_audience_actors_actor_idx
  on public.message_object_audience_actors(actor_id, created_at desc, id);

-- ---------------------------------------------------------------------------
-- 3. Typed semantic/structural relations
--    One row links a message to exactly one supported target.
-- ---------------------------------------------------------------------------

create table if not exists public.message_object_relations (
  id uuid primary key default gen_random_uuid(),
  message_object_id uuid not null
    references public.message_objects(id)
    on delete cascade,

  relation_code text not null,

  target_message_object_id uuid
    references public.message_objects(id)
    on delete cascade,
  target_actor_id uuid
    references public.actors(id)
    on delete cascade,
  target_organization_id uuid
    references public.organizations(id)
    on delete cascade,
  target_activity_event_id uuid
    references public.activity_events(id)
    on delete cascade,
  target_offer_id uuid
    references public.offers(id)
    on delete cascade,
  target_certificate_id uuid
    references public.certificates(id)
    on delete cascade,
  target_value_object_id uuid
    references public.value_objects(id)
    on delete cascade,

  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default clock_timestamp(),

  constraint message_object_relations_code_check
    check (relation_code ~ '^[a-z][a-z0-9_]{0,63}$'),

  constraint message_object_relations_one_target_check
    check (
      num_nonnulls(
        target_message_object_id,
        target_actor_id,
        target_organization_id,
        target_activity_event_id,
        target_offer_id,
        target_certificate_id,
        target_value_object_id
      ) = 1
    ),

  constraint message_object_relations_no_self_message_check
    check (
      target_message_object_id is null
      or target_message_object_id <> message_object_id
    ),

  constraint message_object_relations_metadata_shape_check
    check (jsonb_typeof(metadata_json) = 'object')
);

comment on table public.message_object_relations is
  'Typed links such as reply_to, about, review_of, mentions, references or quotes. Relation codes are extensible stable codes; supported target tables retain real foreign keys.';

create unique index if not exists message_object_relations_message_target_uidx
  on public.message_object_relations(message_object_id, relation_code, target_message_object_id)
  where target_message_object_id is not null;

create unique index if not exists message_object_relations_actor_target_uidx
  on public.message_object_relations(message_object_id, relation_code, target_actor_id)
  where target_actor_id is not null;

create unique index if not exists message_object_relations_organization_target_uidx
  on public.message_object_relations(message_object_id, relation_code, target_organization_id)
  where target_organization_id is not null;

create unique index if not exists message_object_relations_activity_target_uidx
  on public.message_object_relations(message_object_id, relation_code, target_activity_event_id)
  where target_activity_event_id is not null;

create unique index if not exists message_object_relations_offer_target_uidx
  on public.message_object_relations(message_object_id, relation_code, target_offer_id)
  where target_offer_id is not null;

create unique index if not exists message_object_relations_certificate_target_uidx
  on public.message_object_relations(message_object_id, relation_code, target_certificate_id)
  where target_certificate_id is not null;

create unique index if not exists message_object_relations_value_object_target_uidx
  on public.message_object_relations(message_object_id, relation_code, target_value_object_id)
  where target_value_object_id is not null;

-- ---------------------------------------------------------------------------
-- 4. Per-channel distribution state
--    One canonical message can fan out to ARCTor + social/external channels.
-- ---------------------------------------------------------------------------

create table if not exists public.message_object_distributions (
  id uuid primary key default gen_random_uuid(),
  message_object_id uuid not null
    references public.message_objects(id)
    on delete cascade,

  channel_code text not null,
  destination_ref text,

  delivery_status text not null default 'pending',

  scheduled_at timestamptz,
  first_attempt_at timestamptz,
  last_attempt_at timestamptz,
  delivered_at timestamptz,
  withdrawn_at timestamptz,

  external_item_id text,
  canonical_url text,

  error_code text,
  error_message text,
  metadata_json jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),

  constraint message_object_distributions_channel_code_check
    check (channel_code ~ '^[a-z][a-z0-9_]{0,63}$'),

  constraint message_object_distributions_status_check
    check (
      delivery_status in (
        'pending',
        'scheduled',
        'processing',
        'succeeded',
        'failed',
        'withdrawn',
        'skipped'
      )
    ),

  constraint message_object_distributions_metadata_shape_check
    check (jsonb_typeof(metadata_json) = 'object'),

  constraint message_object_distributions_text_length_check
    check (
      char_length(coalesce(destination_ref, '')) <= 2000
      and char_length(coalesce(external_item_id, '')) <= 2000
      and char_length(coalesce(canonical_url, '')) <= 4000
      and char_length(coalesce(error_code, '')) <= 300
      and char_length(coalesce(error_message, '')) <= 4000
    ),

  constraint message_object_distributions_canonical_url_check
    check (
      canonical_url is null
      or canonical_url ~ '^https?://'
    )
);

comment on table public.message_object_distributions is
  'Per-channel publication/delivery projection for one canonical message_object. This separates message identity from ARCTor/Facebook/Instagram/LinkedIn/TikTok/YouTube/etc delivery state.';

create unique index if not exists message_object_distributions_destination_uidx
  on public.message_object_distributions(
    message_object_id,
    channel_code,
    coalesce(destination_ref, '')
  );

create index if not exists message_object_distributions_status_idx
  on public.message_object_distributions(delivery_status, scheduled_at, id);

-- ---------------------------------------------------------------------------
-- 5. Media references
--    No storage object is created by this migration.
-- ---------------------------------------------------------------------------

create table if not exists public.message_object_media (
  id uuid primary key default gen_random_uuid(),
  message_object_id uuid not null
    references public.message_objects(id)
    on delete cascade,

  media_kind_code text not null,
  media_origin_code text not null default 'native',

  storage_bucket text,
  storage_path text,
  external_url text,

  mime_type text,
  byte_size bigint,
  sha256_hex text,

  width_px integer,
  height_px integer,
  duration_seconds numeric,

  sort_order integer not null default 0,
  alt_text text,
  metadata_json jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default clock_timestamp(),

  constraint message_object_media_kind_check
    check (
      media_kind_code in (
        'image',
        'video',
        'audio',
        'document',
        'link_preview',
        'other'
      )
    ),

  constraint message_object_media_origin_check
    check (media_origin_code in ('native', 'imported', 'external')),

  constraint message_object_media_location_check
    check (
      storage_path is not null
      or external_url is not null
    ),

  constraint message_object_media_storage_pair_check
    check (
      (storage_path is null and storage_bucket is null)
      or (storage_path is not null and storage_bucket is not null)
    ),

  constraint message_object_media_external_url_check
    check (
      external_url is null
      or external_url ~ '^https?://'
    ),

  constraint message_object_media_size_check
    check (
      byte_size is null or byte_size >= 0
    ),

  constraint message_object_media_dimensions_check
    check (
      (width_px is null or width_px > 0)
      and (height_px is null or height_px > 0)
      and (duration_seconds is null or duration_seconds >= 0)
      and sort_order >= 0
    ),

  constraint message_object_media_sha256_check
    check (
      sha256_hex is null
      or sha256_hex ~ '^[0-9a-f]{64}$'
    ),

  constraint message_object_media_metadata_shape_check
    check (jsonb_typeof(metadata_json) = 'object')
);

comment on table public.message_object_media is
  'Media references attached to a message_object. Storage paths stay server-side; later public APIs must expose approved delivery URLs rather than raw private paths.';

create index if not exists message_object_media_message_order_idx
  on public.message_object_media(message_object_id, sort_order, id);

-- ---------------------------------------------------------------------------
-- 6. Actor-control helper for server-mediated native message creation
-- ---------------------------------------------------------------------------

create or replace function public.message_actor_controlled_by_user_v1(
  p_user_id uuid,
  p_actor_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select
    p_user_id is not null
    and p_actor_id is not null
    and (
      exists (
        select 1
        from public.actors actor
        join public.actor_public_profiles profile
          on profile.actor_id = actor.id
        where actor.id = p_actor_id
          and actor.status = 'active'
          and actor.actor_type in ('person', 'avatar')
          and profile.owner_user_id = p_user_id
      )
      or exists (
        select 1
        from public.actors organization_actor
        join public.organizations organization
          on organization.id = organization_actor.organization_id
        join public.actor_public_profiles owner_profile
          on owner_profile.actor_id = organization.owner_actor_id
        where organization_actor.id = p_actor_id
          and organization_actor.actor_type = 'organization'
          and organization_actor.status = 'active'
          and organization.status = 'active'
          and owner_profile.owner_user_id = p_user_id
      )
    );
$function$;

comment on function public.message_actor_controlled_by_user_v1(uuid, uuid) is
  'Server-side ownership helper for message_objects. A user controls owned person/avatar actors and the active organization actor whose organization owner actor belongs to that user.';

-- ---------------------------------------------------------------------------
-- 7. Main contract trigger
-- ---------------------------------------------------------------------------

create or replace function public.enforce_message_object_contract_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if new.owner_user_id is not null then
    if not exists (
      select 1
      from public.app_users app_user
      where app_user.id = new.owner_user_id
        and app_user.access_status is distinct from 'blocked'
    ) then
      raise exception using
        errcode = '42501',
        message = 'MESSAGE_OBJECT_OWNER_USER_UNAVAILABLE';
    end if;
  end if;

  if new.origin_kind_code = 'native' then
    if new.owner_user_id is null
       or new.created_by_actor_id is null
       or new.author_actor_id is null then
      raise exception using
        errcode = '22004',
        message = 'MESSAGE_OBJECT_NATIVE_IDENTITY_REQUIRED';
    end if;

    if not public.message_actor_controlled_by_user_v1(
      new.owner_user_id,
      new.created_by_actor_id
    ) then
      raise exception using
        errcode = '42501',
        message = 'MESSAGE_OBJECT_CREATOR_NOT_CONTROLLED_BY_USER';
    end if;

    if not public.message_actor_controlled_by_user_v1(
      new.owner_user_id,
      new.author_actor_id
    ) then
      raise exception using
        errcode = '42501',
        message = 'MESSAGE_OBJECT_AUTHOR_NOT_CONTROLLED_BY_USER';
    end if;
  else
    if new.created_by_actor_id is not null
       and new.owner_user_id is not null
       and not public.message_actor_controlled_by_user_v1(
         new.owner_user_id,
         new.created_by_actor_id
       ) then
      raise exception using
        errcode = '42501',
        message = 'MESSAGE_OBJECT_CREATOR_NOT_CONTROLLED_BY_USER';
    end if;

    if new.author_actor_id is not null then
      if new.owner_user_id is not null then
        if not public.message_actor_controlled_by_user_v1(
          new.owner_user_id,
          new.author_actor_id
        ) then
          raise exception using
            errcode = '42501',
            message = 'MESSAGE_OBJECT_AUTHOR_NOT_CONTROLLED_BY_USER';
        end if;
      elsif not exists (
        select 1
        from public.actors actor
        where actor.id = new.author_actor_id
          and actor.status = 'active'
      ) then
        raise exception using
          errcode = '23503',
          message = 'MESSAGE_OBJECT_AUTHOR_ACTOR_UNAVAILABLE';
      end if;
    end if;
  end if;

  if tg_op = 'UPDATE' then
    if new.owner_user_id is distinct from old.owner_user_id
       or new.origin_kind_code is distinct from old.origin_kind_code
       or new.origin_provider_code is distinct from old.origin_provider_code
       or new.external_account_id is distinct from old.external_account_id
       or new.external_item_id is distinct from old.external_item_id then
      raise exception using
        errcode = '23514',
        message = 'MESSAGE_OBJECT_ORIGIN_IDENTITY_IMMUTABLE';
    end if;

    if old.created_by_actor_id is not null
       and new.created_by_actor_id is distinct from old.created_by_actor_id then
      raise exception using
        errcode = '23514',
        message = 'MESSAGE_OBJECT_CREATOR_IDENTITY_IMMUTABLE';
    end if;

    if old.author_actor_id is not null
       and new.author_actor_id is distinct from old.author_actor_id then
      raise exception using
        errcode = '23514',
        message = 'MESSAGE_OBJECT_AUTHOR_IDENTITY_IMMUTABLE';
    end if;

    if (
      new.title is distinct from old.title
      or new.content_text is distinct from old.content_text
      or new.content_json is distinct from old.content_json
    ) then
      new.edited_at := clock_timestamp();
    end if;
  end if;

  if new.lifecycle_status = 'scheduled'
     and new.scheduled_at is null then
    raise exception using
      errcode = '23514',
      message = 'MESSAGE_OBJECT_SCHEDULED_AT_REQUIRED';
  end if;

  if new.lifecycle_status = 'active'
     and new.activated_at is null then
    new.activated_at := clock_timestamp();
  end if;

  if new.lifecycle_status = 'withdrawn'
     and new.withdrawn_at is null then
    new.withdrawn_at := clock_timestamp();
  end if;

  new.updated_at := clock_timestamp();

  return new;
end;
$function$;

drop trigger if exists message_objects_contract_trg
on public.message_objects;

create trigger message_objects_contract_trg
before insert or update on public.message_objects
for each row
execute function public.enforce_message_object_contract_v1();

-- Distribution updated_at is deliberately independent of canonical message editing.
create or replace function public.touch_message_object_distribution_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$function$;

drop trigger if exists message_object_distributions_touch_trg
on public.message_object_distributions;

create trigger message_object_distributions_touch_trg
before update on public.message_object_distributions
for each row
execute function public.touch_message_object_distribution_v1();

-- ---------------------------------------------------------------------------
-- 8. Minimal server-mediated writer boundary for native F2 integration
-- ---------------------------------------------------------------------------

create or replace function public.create_message_object_v1(
  p_owner_user_id uuid,
  p_created_by_actor_id uuid,
  p_author_actor_id uuid,
  p_title text,
  p_content_text text,
  p_content_json jsonb,
  p_language_code text,
  p_audience_scope_code text,
  p_audience_selector_json jsonb,
  p_intent_code text,
  p_lifecycle_status text,
  p_scheduled_at timestamptz,
  p_origin_kind_code text,
  p_origin_provider_code text,
  p_external_account_id text,
  p_external_item_id text,
  p_canonical_url text,
  p_source_published_at timestamptz,
  p_metadata_json jsonb
)
returns public.message_objects
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_row public.message_objects%rowtype;
begin
  if coalesce(p_lifecycle_status, 'draft') not in ('draft', 'scheduled') then
    raise exception using
      errcode = '23514',
      message = 'MESSAGE_OBJECT_CREATE_MUST_START_DRAFT_OR_SCHEDULED';
  end if;

  insert into public.message_objects (
    owner_user_id,
    created_by_actor_id,
    author_actor_id,
    title,
    content_text,
    content_json,
    language_code,
    audience_scope_code,
    audience_selector_json,
    intent_code,
    lifecycle_status,
    scheduled_at,
    origin_kind_code,
    origin_provider_code,
    external_account_id,
    external_item_id,
    canonical_url,
    source_published_at,
    imported_at,
    metadata_json
  )
  values (
    p_owner_user_id,
    p_created_by_actor_id,
    p_author_actor_id,
    nullif(btrim(coalesce(p_title, '')), ''),
    nullif(p_content_text, ''),
    coalesce(p_content_json, '{}'::jsonb),
    nullif(btrim(coalesce(p_language_code, '')), ''),
    coalesce(nullif(btrim(coalesce(p_audience_scope_code, '')), ''), 'self'),
    coalesce(p_audience_selector_json, '{}'::jsonb),
    nullif(btrim(coalesce(p_intent_code, '')), ''),
    coalesce(nullif(btrim(coalesce(p_lifecycle_status, '')), ''), 'draft'),
    p_scheduled_at,
    coalesce(nullif(btrim(coalesce(p_origin_kind_code, '')), ''), 'native'),
    coalesce(nullif(btrim(coalesce(p_origin_provider_code, '')), ''), 'arctor'),
    nullif(btrim(coalesce(p_external_account_id, '')), ''),
    nullif(btrim(coalesce(p_external_item_id, '')), ''),
    nullif(btrim(coalesce(p_canonical_url, '')), ''),
    p_source_published_at,
    case
      when coalesce(p_origin_kind_code, 'native') = 'imported'
        then clock_timestamp()
      else null
    end,
    coalesce(p_metadata_json, '{}'::jsonb)
  )
  returning *
  into v_row;

  return v_row;
end;
$function$;

create or replace function public.activate_message_object_v1(
  p_owner_user_id uuid,
  p_message_object_id uuid
)
returns public.message_objects
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_row public.message_objects%rowtype;
  v_has_content boolean;
begin
  select *
  into v_row
  from public.message_objects message
  where message.id = p_message_object_id
    and message.owner_user_id = p_owner_user_id
  for update;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'MESSAGE_OBJECT_NOT_OWNED_OR_NOT_FOUND';
  end if;

  if v_row.lifecycle_status not in ('draft', 'scheduled') then
    raise exception using
      errcode = '23514',
      message = 'MESSAGE_OBJECT_NOT_ACTIVATABLE';
  end if;

  if v_row.audience_scope_code in ('direct', 'group')
     and not exists (
       select 1
       from public.message_object_audience_actors audience
       where audience.message_object_id = v_row.id
     ) then
    raise exception using
      errcode = '23514',
      message = 'MESSAGE_OBJECT_EXPLICIT_AUDIENCE_REQUIRED';
  end if;

  if v_row.audience_scope_code = 'segment'
     and v_row.audience_selector_json = '{}'::jsonb then
    raise exception using
      errcode = '23514',
      message = 'MESSAGE_OBJECT_SEGMENT_SELECTOR_REQUIRED';
  end if;

  select
    nullif(btrim(coalesce(v_row.title, '')), '') is not null
    or nullif(btrim(coalesce(v_row.content_text, '')), '') is not null
    or v_row.content_json <> '{}'::jsonb
    or exists (
      select 1
      from public.message_object_media media
      where media.message_object_id = v_row.id
    )
  into v_has_content;

  if not v_has_content then
    raise exception using
      errcode = '23514',
      message = 'MESSAGE_OBJECT_CONTENT_OR_MEDIA_REQUIRED';
  end if;

  if v_row.scheduled_at is not null
     and v_row.scheduled_at > clock_timestamp() then
    update public.message_objects
    set lifecycle_status = 'scheduled'
    where id = v_row.id
    returning *
    into v_row;

    return v_row;
  end if;

  update public.message_objects
  set
    lifecycle_status = 'active',
    activated_at = coalesce(activated_at, clock_timestamp())
  where id = v_row.id
  returning *
  into v_row;

  return v_row;
end;
$function$;

create or replace function public.withdraw_message_object_v1(
  p_owner_user_id uuid,
  p_message_object_id uuid
)
returns public.message_objects
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_row public.message_objects%rowtype;
begin
  update public.message_objects
  set lifecycle_status = 'withdrawn'
  where id = p_message_object_id
    and owner_user_id = p_owner_user_id
    and lifecycle_status in ('draft', 'scheduled', 'active')
  returning *
  into v_row;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'MESSAGE_OBJECT_NOT_WITHDRAWABLE_OR_NOT_OWNED';
  end if;

  return v_row;
end;
$function$;

-- ---------------------------------------------------------------------------
-- 9. RLS + role boundary
-- ---------------------------------------------------------------------------

alter table public.message_objects enable row level security;
alter table public.message_object_audience_actors enable row level security;
alter table public.message_object_relations enable row level security;
alter table public.message_object_distributions enable row level security;
alter table public.message_object_media enable row level security;

revoke all on table public.message_objects
from public, anon, authenticated, service_role;

revoke all on table public.message_object_audience_actors
from public, anon, authenticated, service_role;

revoke all on table public.message_object_relations
from public, anon, authenticated, service_role;

revoke all on table public.message_object_distributions
from public, anon, authenticated, service_role;

revoke all on table public.message_object_media
from public, anon, authenticated, service_role;

grant select, insert, update, delete on table public.message_objects
to service_role;

grant select, insert, update, delete on table public.message_object_audience_actors
to service_role;

grant select, insert, update, delete on table public.message_object_relations
to service_role;

grant select, insert, update, delete on table public.message_object_distributions
to service_role;

grant select, insert, update, delete on table public.message_object_media
to service_role;

revoke all on function public.message_actor_controlled_by_user_v1(uuid, uuid)
from public, anon, authenticated, service_role;

revoke all on function public.enforce_message_object_contract_v1()
from public, anon, authenticated, service_role;

revoke all on function public.touch_message_object_distribution_v1()
from public, anon, authenticated, service_role;

revoke all on function public.create_message_object_v1(
  uuid,uuid,uuid,text,text,jsonb,text,text,jsonb,text,text,timestamptz,
  text,text,text,text,text,timestamptz,jsonb
)
from public, anon, authenticated, service_role;

revoke all on function public.activate_message_object_v1(uuid, uuid)
from public, anon, authenticated, service_role;

revoke all on function public.withdraw_message_object_v1(uuid, uuid)
from public, anon, authenticated, service_role;

grant execute on function public.create_message_object_v1(
  uuid,uuid,uuid,text,text,jsonb,text,text,jsonb,text,text,timestamptz,
  text,text,text,text,text,timestamptz,jsonb
)
to service_role;

grant execute on function public.activate_message_object_v1(uuid, uuid)
to service_role;

grant execute on function public.withdraw_message_object_v1(uuid, uuid)
to service_role;

-- Trigger/helper functions are intentionally not callable from application roles.
-- Triggers can execute them without explicit EXECUTE grants to anon/authenticated.

-- ---------------------------------------------------------------------------
-- 10. Structural postcheck inside the same transaction
-- ---------------------------------------------------------------------------

do $postcheck$
declare
  v_table text;
  v_missing_columns text;
begin
  foreach v_table in array array[
    'message_objects',
    'message_object_audience_actors',
    'message_object_relations',
    'message_object_distributions',
    'message_object_media'
  ]
  loop
    if to_regclass('public.' || v_table) is null then
      raise exception 'MESSAGE_OBJECTS_F1_TABLE_MISSING:%', v_table;
    end if;

    if not exists (
      select 1
      from pg_class
      where oid = to_regclass('public.' || v_table)
        and relrowsecurity
    ) then
      raise exception 'MESSAGE_OBJECTS_F1_RLS_NOT_ENABLED:%', v_table;
    end if;

    if has_table_privilege('anon', 'public.' || v_table, 'SELECT')
       or has_table_privilege('authenticated', 'public.' || v_table, 'SELECT')
       or has_table_privilege('anon', 'public.' || v_table, 'INSERT')
       or has_table_privilege('authenticated', 'public.' || v_table, 'INSERT')
       or has_table_privilege('anon', 'public.' || v_table, 'UPDATE')
       or has_table_privilege('authenticated', 'public.' || v_table, 'UPDATE')
       or has_table_privilege('anon', 'public.' || v_table, 'DELETE')
       or has_table_privilege('authenticated', 'public.' || v_table, 'DELETE') then
      raise exception 'MESSAGE_OBJECTS_F1_DIRECT_CLIENT_PRIVILEGE_PRESENT:%', v_table;
    end if;

    if not has_table_privilege('service_role', 'public.' || v_table, 'SELECT')
       or not has_table_privilege('service_role', 'public.' || v_table, 'INSERT')
       or not has_table_privilege('service_role', 'public.' || v_table, 'UPDATE')
       or not has_table_privilege('service_role', 'public.' || v_table, 'DELETE') then
      raise exception 'MESSAGE_OBJECTS_F1_SERVICE_ROLE_PRIVILEGE_MISSING:%', v_table;
    end if;
  end loop;

  select string_agg(required_column, ', ' order by required_column)
  into v_missing_columns
  from (
    values
      ('owner_user_id'),
      ('created_by_actor_id'),
      ('author_actor_id'),
      ('content_text'),
      ('audience_scope_code'),
      ('audience_selector_json'),
      ('intent_code'),
      ('lifecycle_status'),
      ('origin_kind_code'),
      ('origin_provider_code'),
      ('external_account_id'),
      ('external_item_id'),
      ('canonical_url'),
      ('source_published_at'),
      ('metadata_json')
  ) expected(required_column)
  where not exists (
    select 1
    from information_schema.columns column_info
    where column_info.table_schema = 'public'
      and column_info.table_name = 'message_objects'
      and column_info.column_name = expected.required_column
  );

  if v_missing_columns is not null then
    raise exception 'MESSAGE_OBJECTS_F1_MESSAGE_COLUMNS_MISSING:%', v_missing_columns;
  end if;

  if to_regprocedure(
    'public.create_message_object_v1(uuid,uuid,uuid,text,text,jsonb,text,text,jsonb,text,text,timestamp with time zone,text,text,text,text,text,timestamp with time zone,jsonb)'
  ) is null then
    raise exception 'MESSAGE_OBJECTS_F1_CREATE_RPC_MISSING';
  end if;

  if to_regprocedure(
    'public.activate_message_object_v1(uuid,uuid)'
  ) is null then
    raise exception 'MESSAGE_OBJECTS_F1_ACTIVATE_RPC_MISSING';
  end if;

  if to_regprocedure(
    'public.withdraw_message_object_v1(uuid,uuid)'
  ) is null then
    raise exception 'MESSAGE_OBJECTS_F1_WITHDRAW_RPC_MISSING';
  end if;

  if has_function_privilege(
       'anon',
       'public.create_message_object_v1(uuid,uuid,uuid,text,text,jsonb,text,text,jsonb,text,text,timestamp with time zone,text,text,text,text,text,timestamp with time zone,jsonb)',
       'EXECUTE'
     )
     or has_function_privilege(
       'authenticated',
       'public.create_message_object_v1(uuid,uuid,uuid,text,text,jsonb,text,text,jsonb,text,text,timestamp with time zone,text,text,text,text,text,timestamp with time zone,jsonb)',
       'EXECUTE'
     ) then
    raise exception 'MESSAGE_OBJECTS_F1_DIRECT_CLIENT_CREATE_RPC_PRESENT';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.create_message_object_v1(uuid,uuid,uuid,text,text,jsonb,text,text,jsonb,text,text,timestamp with time zone,text,text,text,text,text,timestamp with time zone,jsonb)',
    'EXECUTE'
  ) then
    raise exception 'MESSAGE_OBJECTS_F1_SERVICE_CREATE_RPC_MISSING';
  end if;
end
$postcheck$;

commit;

-- Refresh PostgREST schema cache after committed DDL.
notify pgrst, 'reload schema';

-- Visible acceptance row in Supabase SQL Editor.
select
  'PASS'::text as status,
  to_regclass('public.message_objects') is not null as message_objects,
  to_regclass('public.message_object_audience_actors') is not null as audience_actors,
  to_regclass('public.message_object_relations') is not null as relations,
  to_regclass('public.message_object_distributions') is not null as distributions,
  to_regclass('public.message_object_media') is not null as media,
  (select relrowsecurity from pg_class where oid = 'public.message_objects'::regclass) as message_objects_rls,
  not has_table_privilege('anon', 'public.message_objects', 'SELECT') as anon_read_blocked,
  not has_table_privilege('authenticated', 'public.message_objects', 'SELECT') as authenticated_read_blocked,
  has_function_privilege(
    'service_role',
    'public.create_message_object_v1(uuid,uuid,uuid,text,text,jsonb,text,text,jsonb,text,text,timestamp with time zone,text,text,text,text,text,timestamp with time zone,jsonb)',
    'EXECUTE'
  ) as service_create_rpc,
  to_regclass('public.chat_messages') is not null as legacy_chat_messages_preserved;
