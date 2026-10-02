/*
ARCTor.app — Project Planning PP1 Foundation V1

Scope:
- add project_contexts;
- add project_composition_relations;
- add project_activity_links;
- add activity_event_relations;
- preserve Reality Core / value_objects / activity_events as canonical entities;
- no UI, no scheduler, no recurrence, no progress %, no baseline, no AI writes.

Security boundary:
- server-only V1;
- anon/authenticated direct access is denied;
- service_role is the write/read boundary until application APIs are added.

Design invariants:
- project ontology root is an active private actor-scoped ontology leaf;
- project composition never mutates value_objects.parent_value_object_id;
- composition endpoints must be active ontology leaves;
- project activity membership is many-to-many;
- activity relation graph is project-scoped;
- self-links and directed cycles inside one relation family are rejected.
*/

begin;

set local lock_timeout = '5s';
set local statement_timeout = '180s';

do $preflight$
begin
  if to_regclass('public.app_users') is null
     or to_regclass('public.actors') is null
     or to_regclass('public.actor_public_profiles') is null
     or to_regclass('public.organizations') is null
     or to_regclass('public.value_objects') is null
     or to_regclass('public.activity_events') is null then
    raise exception using
      errcode = '42P01',
      message = 'PROJECT_PLANNING_PP1_REQUIRED_FOUNDATION_MISSING';
  end if;

  if to_regclass('public.project_contexts') is not null
     or to_regclass('public.project_composition_relations') is not null
     or to_regclass('public.project_activity_links') is not null
     or to_regclass('public.activity_event_relations') is not null then
    raise exception using
      errcode = '42P07',
      message = 'PROJECT_PLANNING_PP1_ALREADY_INSTALLED_OR_PARTIALLY_APPLIED';
  end if;
end;
$preflight$;

create table public.project_contexts (
  id uuid primary key default gen_random_uuid(),

  owner_user_id uuid not null
    references public.app_users(id)
    on delete cascade,

  owner_actor_id uuid not null
    references public.actors(id)
    on delete restrict,

  scope_code text not null default 'personal',

  organization_id uuid
    references public.organizations(id)
    on delete set null,

  root_value_object_id uuid not null
    references public.value_objects(id)
    on delete restrict,

  title text not null,
  description text,

  project_mode_code text not null default 'finite',
  status_code text not null default 'draft',

  timezone text not null default 'UTC',
  currency_code text,

  metadata_json jsonb not null default '{}'::jsonb,

  created_by_actor_id uuid
    references public.actors(id)
    on delete set null,

  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),

  constraint project_contexts_scope_v1_check
    check (scope_code in ('personal', 'organization')),

  constraint project_contexts_scope_shape_v1_check
    check (
      (scope_code = 'personal' and organization_id is null)
      or
      (scope_code = 'organization' and organization_id is not null)
    ),

  constraint project_contexts_title_v1_check
    check (
      char_length(btrim(title)) between 1 and 240
    ),

  constraint project_contexts_mode_v1_check
    check (project_mode_code in ('finite', 'continuous')),

  constraint project_contexts_status_v1_check
    check (
      status_code in (
        'draft',
        'active',
        'paused',
        'completed',
        'archived'
      )
    ),

  constraint project_contexts_currency_v1_check
    check (
      currency_code is null
      or currency_code ~ '^[A-Z]{3}$'
    ),

  constraint project_contexts_metadata_v1_check
    check (jsonb_typeof(metadata_json) = 'object')
);

create index project_contexts_owner_status_v1_idx
  on public.project_contexts (
    owner_user_id,
    owner_actor_id,
    status_code,
    created_at desc
  );

create index project_contexts_org_status_v1_idx
  on public.project_contexts (
    organization_id,
    status_code,
    created_at desc
  )
  where organization_id is not null;

create index project_contexts_root_v1_idx
  on public.project_contexts (
    root_value_object_id,
    status_code
  );

create table public.project_composition_relations (
  id uuid primary key default gen_random_uuid(),

  project_context_id uuid not null
    references public.project_contexts(id)
    on delete cascade,

  parent_value_object_id uuid not null
    references public.value_objects(id)
    on delete restrict,

  child_value_object_id uuid not null
    references public.value_objects(id)
    on delete restrict,

  relation_type_code text not null default 'decomposes_into',

  display_order integer not null default 0,
  local_label text,
  local_note text,

  status_code text not null default 'active',
  provenance_code text not null default 'manual',

  metadata_json jsonb not null default '{}'::jsonb,

  created_by_actor_id uuid
    references public.actors(id)
    on delete set null,

  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  deactivated_at timestamptz,

  constraint project_composition_relation_type_v1_check
    check (relation_type_code = 'decomposes_into'),

  constraint project_composition_no_self_v1_check
    check (parent_value_object_id <> child_value_object_id),

  constraint project_composition_order_v1_check
    check (display_order >= 0),

  constraint project_composition_label_v1_check
    check (
      local_label is null
      or char_length(btrim(local_label)) between 1 and 240
    ),

  constraint project_composition_status_v1_check
    check (status_code in ('active', 'inactive')),

  constraint project_composition_provenance_v1_check
    check (
      provenance_code in (
        'manual',
        'ai_suggested',
        'import',
        'system'
      )
    ),

  constraint project_composition_metadata_v1_check
    check (jsonb_typeof(metadata_json) = 'object')
);

create index project_composition_parent_v1_idx
  on public.project_composition_relations (
    project_context_id,
    parent_value_object_id,
    status_code,
    display_order,
    id
  );

create index project_composition_child_v1_idx
  on public.project_composition_relations (
    project_context_id,
    child_value_object_id,
    status_code,
    id
  );

create table public.project_activity_links (
  id uuid primary key default gen_random_uuid(),

  project_context_id uuid not null
    references public.project_contexts(id)
    on delete cascade,

  activity_event_id uuid not null
    references public.activity_events(id)
    on delete cascade,

  status_code text not null default 'active',
  provenance_code text not null default 'manual',

  metadata_json jsonb not null default '{}'::jsonb,

  created_by_actor_id uuid
    references public.actors(id)
    on delete set null,

  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  deactivated_at timestamptz,

  constraint project_activity_links_status_v1_check
    check (status_code in ('active', 'inactive')),

  constraint project_activity_links_provenance_v1_check
    check (
      provenance_code in (
        'manual',
        'ai_suggested',
        'import',
        'system'
      )
    ),

  constraint project_activity_links_metadata_v1_check
    check (jsonb_typeof(metadata_json) = 'object')
);

create unique index project_activity_links_active_v1_uidx
  on public.project_activity_links (
    project_context_id,
    activity_event_id
  )
  where status_code = 'active';

create index project_activity_links_activity_v1_idx
  on public.project_activity_links (
    activity_event_id,
    status_code,
    project_context_id
  );

create table public.activity_event_relations (
  id uuid primary key default gen_random_uuid(),

  project_context_id uuid not null
    references public.project_contexts(id)
    on delete cascade,

  source_activity_event_id uuid not null
    references public.activity_events(id)
    on delete cascade,

  target_activity_event_id uuid not null
    references public.activity_events(id)
    on delete cascade,

  relation_type_code text not null,

  lag_minutes integer not null default 0,
  is_hard boolean not null default false,

  calendar_basis_code text not null default 'project',
  condition_json jsonb not null default '{}'::jsonb,
  metadata_json jsonb not null default '{}'::jsonb,

  status_code text not null default 'active',
  provenance_code text not null default 'manual',

  created_by_actor_id uuid
    references public.actors(id)
    on delete set null,

  valid_from timestamptz,
  valid_to timestamptz,

  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  deactivated_at timestamptz,

  constraint activity_event_relations_no_self_v1_check
    check (source_activity_event_id <> target_activity_event_id),

  constraint activity_event_relations_type_v1_check
    check (
      relation_type_code in (
        'contains',
        'precedes',
        'finish_to_start',
        'start_to_start',
        'finish_to_finish',
        'start_to_finish',
        'blocks'
      )
    ),

  constraint activity_event_relations_calendar_basis_v1_check
    check (
      calendar_basis_code in (
        'project',
        'source',
        'target',
        'continuous'
      )
    ),

  constraint activity_event_relations_status_v1_check
    check (status_code in ('active', 'inactive')),

  constraint activity_event_relations_provenance_v1_check
    check (
      provenance_code in (
        'manual',
        'ai_suggested',
        'import',
        'system'
      )
    ),

  constraint activity_event_relations_condition_v1_check
    check (jsonb_typeof(condition_json) = 'object'),

  constraint activity_event_relations_metadata_v1_check
    check (jsonb_typeof(metadata_json) = 'object'),

  constraint activity_event_relations_validity_v1_check
    check (
      valid_from is null
      or valid_to is null
      or valid_to >= valid_from
    )
);

create unique index activity_event_relations_active_v1_uidx
  on public.activity_event_relations (
    project_context_id,
    source_activity_event_id,
    target_activity_event_id,
    relation_type_code
  )
  where status_code = 'active';

create index activity_event_relations_source_v1_idx
  on public.activity_event_relations (
    project_context_id,
    source_activity_event_id,
    status_code,
    relation_type_code
  );

create index activity_event_relations_target_v1_idx
  on public.activity_event_relations (
    project_context_id,
    target_activity_event_id,
    status_code,
    relation_type_code
  );

create or replace function public.touch_project_planning_pp1_updated_at_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  new.updated_at := clock_timestamp();

  if tg_op = 'UPDATE'
     and old.status_code = 'active'
     and new.status_code = 'inactive' then
    new.deactivated_at := clock_timestamp();
  elsif tg_op = 'UPDATE'
        and old.status_code = 'inactive'
        and new.status_code = 'active' then
    new.deactivated_at := null;
  elsif new.status_code = 'active' then
    new.deactivated_at := null;
  end if;

  return new;
end;
$function$;

create or replace function public.enforce_project_context_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_root public.value_objects%rowtype;
begin
  if not exists (
    select 1
    from public.actor_public_profiles profile
    join public.actors actor
      on actor.id = profile.actor_id
     and actor.status = 'active'
    where profile.owner_user_id = new.owner_user_id
      and profile.actor_id = new.owner_actor_id
  ) then
    raise exception using
      errcode = '42501',
      message = 'PROJECT_PP1_OWNER_ACTOR_NOT_OWNED_BY_USER';
  end if;

  select *
  into v_root
  from public.value_objects
  where id = new.root_value_object_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'PROJECT_PP1_ROOT_VALUE_OBJECT_NOT_FOUND';
  end if;

  if v_root.status <> 'active'
     or v_root.ontology_node_role_code <> 'leaf' then
    raise exception using
      errcode = '23514',
      message = 'PROJECT_PP1_ROOT_MUST_BE_ACTIVE_ONTOLOGY_LEAF';
  end if;

  if v_root.scope_code <> 'actor'
     or v_root.owner_user_id is distinct from new.owner_user_id
     or v_root.owner_actor_id is distinct from new.owner_actor_id then
    raise exception using
      errcode = '42501',
      message = 'PROJECT_PP1_ROOT_MUST_BE_OWNED_ACTOR_SCOPED_LEAF';
  end if;

  if coalesce(v_root.visibility_code, v_root.visibility, 'private') <> 'private' then
    raise exception using
      errcode = '23514',
      message = 'PROJECT_PP1_ROOT_MUST_BE_PRIVATE';
  end if;

  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
       or new.owner_user_id is distinct from old.owner_user_id
       or new.owner_actor_id is distinct from old.owner_actor_id
       or new.scope_code is distinct from old.scope_code
       or new.organization_id is distinct from old.organization_id
       or new.root_value_object_id is distinct from old.root_value_object_id
       or new.created_by_actor_id is distinct from old.created_by_actor_id
       or new.created_at is distinct from old.created_at then
      raise exception using
        errcode = '23514',
        message = 'PROJECT_PP1_CONTEXT_IDENTITY_IS_IMMUTABLE';
    end if;

    if old.status_code = 'archived'
       and new.status_code <> 'archived' then
      raise exception using
        errcode = '23514',
        message = 'PROJECT_PP1_ARCHIVED_CONTEXT_IS_TERMINAL';
    end if;
  end if;

  new.updated_at := clock_timestamp();
  return new;
end;
$function$;

create or replace function public.enforce_project_composition_relation_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_project public.project_contexts%rowtype;
  v_parent public.value_objects%rowtype;
  v_child public.value_objects%rowtype;
  v_cycle boolean;
begin
  select *
  into v_project
  from public.project_contexts
  where id = new.project_context_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'PROJECT_PP1_CONTEXT_NOT_FOUND';
  end if;

  if v_project.status_code = 'archived'
     and new.status_code = 'active' then
    raise exception using
      errcode = '23514',
      message = 'PROJECT_PP1_ARCHIVED_CONTEXT_CANNOT_GAIN_ACTIVE_COMPOSITION';
  end if;

  select *
  into v_parent
  from public.value_objects
  where id = new.parent_value_object_id;

  select *
  into v_child
  from public.value_objects
  where id = new.child_value_object_id;

  if v_parent.id is null or v_child.id is null then
    raise exception using
      errcode = '23503',
      message = 'PROJECT_PP1_COMPOSITION_VALUE_OBJECT_NOT_FOUND';
  end if;

  if v_parent.status <> 'active'
     or v_child.status <> 'active'
     or v_parent.ontology_node_role_code <> 'leaf'
     or v_child.ontology_node_role_code <> 'leaf' then
    raise exception using
      errcode = '23514',
      message = 'PROJECT_PP1_COMPOSITION_ENDPOINTS_MUST_BE_ACTIVE_ONTOLOGY_LEAVES';
  end if;

  if v_parent.scope_code = 'actor'
     and (
       v_parent.owner_user_id is distinct from v_project.owner_user_id
       or v_parent.owner_actor_id is distinct from v_project.owner_actor_id
     ) then
    raise exception using
      errcode = '42501',
      message = 'PROJECT_PP1_PARENT_PRIVATE_LEAF_OWNER_MISMATCH';
  elsif v_parent.scope_code not in ('global', 'actor') then
    raise exception using
      errcode = '23514',
      message = 'PROJECT_PP1_PARENT_LEAF_SCOPE_INVALID';
  end if;

  if v_child.scope_code = 'actor'
     and (
       v_child.owner_user_id is distinct from v_project.owner_user_id
       or v_child.owner_actor_id is distinct from v_project.owner_actor_id
     ) then
    raise exception using
      errcode = '42501',
      message = 'PROJECT_PP1_CHILD_PRIVATE_LEAF_OWNER_MISMATCH';
  elsif v_child.scope_code not in ('global', 'actor') then
    raise exception using
      errcode = '23514',
      message = 'PROJECT_PP1_CHILD_LEAF_SCOPE_INVALID';
  end if;

  if new.status_code = 'active' then
    with recursive reachable(node_id) as (
      select new.child_value_object_id

      union

      select edge.child_value_object_id
      from public.project_composition_relations edge
      join reachable r
        on edge.parent_value_object_id = r.node_id
      where edge.project_context_id = new.project_context_id
        and edge.status_code = 'active'
        and edge.id <> new.id
    )
    select exists (
      select 1
      from reachable
      where node_id = new.parent_value_object_id
    )
    into v_cycle;

    if v_cycle then
      raise exception using
        errcode = '23514',
        message = 'PROJECT_PP1_COMPOSITION_CYCLE_FORBIDDEN';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
       or new.project_context_id is distinct from old.project_context_id
       or new.parent_value_object_id is distinct from old.parent_value_object_id
       or new.child_value_object_id is distinct from old.child_value_object_id
       or new.relation_type_code is distinct from old.relation_type_code
       or new.created_by_actor_id is distinct from old.created_by_actor_id
       or new.created_at is distinct from old.created_at then
      raise exception using
        errcode = '23514',
        message = 'PROJECT_PP1_COMPOSITION_IDENTITY_IS_IMMUTABLE';
    end if;
  end if;

  new.updated_at := clock_timestamp();

  if tg_op = 'UPDATE'
     and old.status_code = 'active'
     and new.status_code = 'inactive' then
    new.deactivated_at := clock_timestamp();
  elsif tg_op = 'UPDATE'
        and old.status_code = 'inactive'
        and new.status_code = 'active' then
    new.deactivated_at := null;
  elsif new.status_code = 'active' then
    new.deactivated_at := null;
  end if;

  return new;
end;
$function$;

create or replace function public.enforce_project_activity_link_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_project public.project_contexts%rowtype;
  v_activity public.activity_events%rowtype;
begin
  select *
  into v_project
  from public.project_contexts
  where id = new.project_context_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'PROJECT_PP1_CONTEXT_NOT_FOUND';
  end if;

  select *
  into v_activity
  from public.activity_events
  where id = new.activity_event_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'PROJECT_PP1_ACTIVITY_EVENT_NOT_FOUND';
  end if;

  if v_activity.user_id is distinct from v_project.owner_user_id then
    raise exception using
      errcode = '42501',
      message = 'PROJECT_PP1_ACTIVITY_OWNER_MISMATCH';
  end if;

  if v_project.status_code = 'archived'
     and new.status_code = 'active' then
    raise exception using
      errcode = '23514',
      message = 'PROJECT_PP1_ARCHIVED_CONTEXT_CANNOT_GAIN_ACTIVE_ACTIVITY';
  end if;

  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
       or new.project_context_id is distinct from old.project_context_id
       or new.activity_event_id is distinct from old.activity_event_id
       or new.created_by_actor_id is distinct from old.created_by_actor_id
       or new.created_at is distinct from old.created_at then
      raise exception using
        errcode = '23514',
        message = 'PROJECT_PP1_ACTIVITY_LINK_IDENTITY_IS_IMMUTABLE';
    end if;
  end if;

  new.updated_at := clock_timestamp();

  if tg_op = 'UPDATE'
     and old.status_code = 'active'
     and new.status_code = 'inactive' then
    new.deactivated_at := clock_timestamp();
  elsif tg_op = 'UPDATE'
        and old.status_code = 'inactive'
        and new.status_code = 'active' then
    new.deactivated_at := null;
  elsif new.status_code = 'active' then
    new.deactivated_at := null;
  end if;

  return new;
end;
$function$;

create or replace function public.enforce_activity_event_relation_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_family text;
  v_cycle boolean;
begin
  if not exists (
    select 1
    from public.project_activity_links link
    where link.project_context_id = new.project_context_id
      and link.activity_event_id = new.source_activity_event_id
      and link.status_code = 'active'
  ) or not exists (
    select 1
    from public.project_activity_links link
    where link.project_context_id = new.project_context_id
      and link.activity_event_id = new.target_activity_event_id
      and link.status_code = 'active'
  ) then
    raise exception using
      errcode = '23514',
      message = 'PROJECT_PP1_ACTIVITY_RELATION_REQUIRES_ACTIVE_PROJECT_MEMBERSHIP';
  end if;

  v_family := case
    when new.relation_type_code = 'contains'
      then 'composition'
    when new.relation_type_code = 'precedes'
      then 'order'
    when new.relation_type_code in (
      'finish_to_start',
      'start_to_start',
      'finish_to_finish',
      'start_to_finish'
    )
      then 'dependency'
    when new.relation_type_code = 'blocks'
      then 'blocking'
    else null
  end;

  if v_family is null then
    raise exception using
      errcode = '22023',
      message = 'PROJECT_PP1_ACTIVITY_RELATION_TYPE_INVALID';
  end if;

  if new.status_code = 'active' then
    with recursive family_edges as (
      select
        edge.id,
        edge.source_activity_event_id,
        edge.target_activity_event_id,
        case
          when edge.relation_type_code = 'contains'
            then 'composition'
          when edge.relation_type_code = 'precedes'
            then 'order'
          when edge.relation_type_code in (
            'finish_to_start',
            'start_to_start',
            'finish_to_finish',
            'start_to_finish'
          )
            then 'dependency'
          when edge.relation_type_code = 'blocks'
            then 'blocking'
          else null
        end as family_code
      from public.activity_event_relations edge
      where edge.project_context_id = new.project_context_id
        and edge.status_code = 'active'
        and edge.id <> new.id
    ),
    reachable(node_id) as (
      select new.target_activity_event_id

      union

      select edge.target_activity_event_id
      from family_edges edge
      join reachable r
        on edge.source_activity_event_id = r.node_id
      where edge.family_code = v_family
    )
    select exists (
      select 1
      from reachable
      where node_id = new.source_activity_event_id
    )
    into v_cycle;

    if v_cycle then
      raise exception using
        errcode = '23514',
        message = 'PROJECT_PP1_ACTIVITY_RELATION_CYCLE_FORBIDDEN';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
       or new.project_context_id is distinct from old.project_context_id
       or new.source_activity_event_id is distinct from old.source_activity_event_id
       or new.target_activity_event_id is distinct from old.target_activity_event_id
       or new.relation_type_code is distinct from old.relation_type_code
       or new.created_by_actor_id is distinct from old.created_by_actor_id
       or new.created_at is distinct from old.created_at then
      raise exception using
        errcode = '23514',
        message = 'PROJECT_PP1_ACTIVITY_RELATION_IDENTITY_IS_IMMUTABLE';
    end if;
  end if;

  new.updated_at := clock_timestamp();

  if tg_op = 'UPDATE'
     and old.status_code = 'active'
     and new.status_code = 'inactive' then
    new.deactivated_at := clock_timestamp();
  elsif tg_op = 'UPDATE'
        and old.status_code = 'inactive'
        and new.status_code = 'active' then
    new.deactivated_at := null;
  elsif new.status_code = 'active' then
    new.deactivated_at := null;
  end if;

  return new;
end;
$function$;

create trigger project_contexts_guard_v1
before insert or update
on public.project_contexts
for each row
execute function public.enforce_project_context_v1();

create trigger project_composition_guard_v1
before insert or update
on public.project_composition_relations
for each row
execute function public.enforce_project_composition_relation_v1();

create trigger project_activity_links_guard_v1
before insert or update
on public.project_activity_links
for each row
execute function public.enforce_project_activity_link_v1();

create trigger activity_event_relations_guard_v1
before insert or update
on public.activity_event_relations
for each row
execute function public.enforce_activity_event_relation_v1();

alter table public.project_contexts enable row level security;
alter table public.project_composition_relations enable row level security;
alter table public.project_activity_links enable row level security;
alter table public.activity_event_relations enable row level security;

create policy project_contexts_no_direct_public_v1
on public.project_contexts
for all
to anon, authenticated
using (false)
with check (false);

create policy project_composition_no_direct_public_v1
on public.project_composition_relations
for all
to anon, authenticated
using (false)
with check (false);

create policy project_activity_links_no_direct_public_v1
on public.project_activity_links
for all
to anon, authenticated
using (false)
with check (false);

create policy activity_event_relations_no_direct_public_v1
on public.activity_event_relations
for all
to anon, authenticated
using (false)
with check (false);

create policy project_contexts_service_role_all_v1
on public.project_contexts
for all
to service_role
using (true)
with check (true);

create policy project_composition_service_role_all_v1
on public.project_composition_relations
for all
to service_role
using (true)
with check (true);

create policy project_activity_links_service_role_all_v1
on public.project_activity_links
for all
to service_role
using (true)
with check (true);

create policy activity_event_relations_service_role_all_v1
on public.activity_event_relations
for all
to service_role
using (true)
with check (true);

revoke all on table public.project_contexts
  from public, anon, authenticated;
revoke all on table public.project_composition_relations
  from public, anon, authenticated;
revoke all on table public.project_activity_links
  from public, anon, authenticated;
revoke all on table public.activity_event_relations
  from public, anon, authenticated;

grant select, insert, update, delete
  on table public.project_contexts
  to service_role;
grant select, insert, update, delete
  on table public.project_composition_relations
  to service_role;
grant select, insert, update, delete
  on table public.project_activity_links
  to service_role;
grant select, insert, update, delete
  on table public.activity_event_relations
  to service_role;

revoke all on function public.touch_project_planning_pp1_updated_at_v1()
  from public, anon, authenticated;
revoke all on function public.enforce_project_context_v1()
  from public, anon, authenticated;
revoke all on function public.enforce_project_composition_relation_v1()
  from public, anon, authenticated;
revoke all on function public.enforce_project_activity_link_v1()
  from public, anon, authenticated;
revoke all on function public.enforce_activity_event_relation_v1()
  from public, anon, authenticated;

grant execute on function public.touch_project_planning_pp1_updated_at_v1()
  to service_role;
grant execute on function public.enforce_project_context_v1()
  to service_role;
grant execute on function public.enforce_project_composition_relation_v1()
  to service_role;
grant execute on function public.enforce_project_activity_link_v1()
  to service_role;
grant execute on function public.enforce_activity_event_relation_v1()
  to service_role;

comment on table public.project_contexts is
  'PP1 project planning context. Technical planning container around one private actor-scoped root ontology leaf.';

comment on table public.project_composition_relations is
  'PP1 contextual project decomposition between ontology leaf Value Objects. Never mutates structural ontology parentage.';

comment on table public.project_activity_links is
  'PP1 many-to-many membership bridge between project contexts and canonical activity_events.';

comment on table public.activity_event_relations is
  'PP1 project-scoped relation graph between canonical activity_events. Supports composition/order/dependency/blocking contracts.';

do $postcheck$
begin
  if to_regclass('public.project_contexts') is null
     or to_regclass('public.project_composition_relations') is null
     or to_regclass('public.project_activity_links') is null
     or to_regclass('public.activity_event_relations') is null then
    raise exception using
      errcode = 'P0001',
      message = 'PROJECT_PLANNING_PP1_POSTCHECK_TABLE_MISSING';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'project_contexts'
      and c.relrowsecurity
  ) or not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'project_composition_relations'
      and c.relrowsecurity
  ) or not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'project_activity_links'
      and c.relrowsecurity
  ) or not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'activity_event_relations'
      and c.relrowsecurity
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'PROJECT_PLANNING_PP1_POSTCHECK_RLS_MISSING';
  end if;
end;
$postcheck$;

commit;
