-- ARCTor.app
-- P10 ordinary semantic relations between Value Objects.
--
-- Scope:
-- - canonical relation-type vocabulary for ordinary Value Objects;
-- - one lifecycle row per logical relation;
-- - canonical symmetric pairs;
-- - controlled create/reactivate/deactivate RPCs with idempotency;
-- - actor/owner guards, RLS and service-role-only write path.
--
-- Explicitly out of scope:
-- - structural part_of / tree placement;
-- - cross-actor relations;
-- - analysis relations (threat/opportunity/state);
-- - facts, measures, parameters, targets, project planning, analytics and AI.

begin;

do $preflight$
begin
  if to_regclass('public.value_objects') is null
     or to_regclass('public.value_object_relation_types') is null
     or to_regclass('public.app_users') is null
     or to_regclass('public.actors') is null then
    raise exception using
      errcode = '42P01',
      message = 'P10_REQUIRED_TABLES_MISSING';
  end if;

  if to_regprocedure('public.enforce_value_object_tree_v2()') is null then
    raise exception using
      errcode = '42883',
      message = 'P10_VALUE_OBJECT_TREE_GUARD_MISSING';
  end if;

  if to_regprocedure('extensions.digest(bytea,text)') is null then
    raise exception using
      errcode = '42883',
      message = 'P10_PGCRYPTO_DIGEST_MISSING';
  end if;

  if to_regclass('public.value_object_relations') is not null then
    raise exception using
      errcode = '42P07',
      message = 'P10_RELATION_TABLE_ALREADY_EXISTS_REVIEW_REQUIRED';
  end if;
end;
$preflight$;

alter table public.value_object_relation_types
  add column if not exists reverse_title_key text,
  add column if not exists reverse_description_key text,
  add column if not exists allow_self_link boolean not null default false,
  add column if not exists contract_version integer not null default 1;

update public.value_object_relation_types
set
  reverse_title_key = coalesce(reverse_title_key, title_key),
  reverse_description_key = coalesce(reverse_description_key, description_key),
  allow_self_link = coalesce(allow_self_link, false),
  contract_version = coalesce(contract_version, 1)
where reverse_title_key is null
   or reverse_description_key is null
   or allow_self_link is null
   or contract_version is null;

alter table public.value_object_relation_types
  alter column reverse_title_key set not null,
  alter column reverse_description_key set not null;

do $registry_constraints$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.value_object_relation_types'::regclass
      and conname = 'value_object_relation_types_contract_version_p10_check'
  ) then
    alter table public.value_object_relation_types
      add constraint value_object_relation_types_contract_version_p10_check
      check (contract_version > 0);
  end if;
end;
$registry_constraints$;

-- Free the initial ordinary display-order slots before replacing the
-- provisional vocabulary. No relation rows exist, so no data migration is
-- required and old codes can be retained as inactive registry history.
update public.value_object_relation_types
set display_order = display_order + 1000
where relation_type_code in (
  'supports',
  'depends_on',
  'prerequisite_for',
  'conflicts_with',
  'associated_with',
  'influenced_by'
)
and display_order < 1000;

insert into public.value_object_relation_types (
  relation_type_code,
  directionality_code,
  from_scope_code,
  to_scope_code,
  title_key,
  description_key,
  reverse_title_key,
  reverse_description_key,
  allow_self_link,
  contract_version,
  display_order,
  status
)
values
  (
    'related_to',
    'symmetric',
    'ordinary',
    'ordinary',
    'valueObject.relation.relatedTo.title',
    'valueObject.relation.relatedTo.description',
    'valueObject.relation.relatedTo.title',
    'valueObject.relation.relatedTo.description',
    false,
    1,
    10,
    'active'
  ),
  (
    'same_subject_as',
    'symmetric',
    'ordinary',
    'ordinary',
    'valueObject.relation.sameSubjectAs.title',
    'valueObject.relation.sameSubjectAs.description',
    'valueObject.relation.sameSubjectAs.title',
    'valueObject.relation.sameSubjectAs.description',
    false,
    1,
    20,
    'active'
  ),
  (
    'supports',
    'directed',
    'ordinary',
    'ordinary',
    'valueObject.relation.supports.title',
    'valueObject.relation.supports.description',
    'valueObject.relation.supportedBy.title',
    'valueObject.relation.supportedBy.description',
    false,
    1,
    30,
    'active'
  ),
  (
    'depends_on',
    'directed',
    'ordinary',
    'ordinary',
    'valueObject.relation.dependsOn.title',
    'valueObject.relation.dependsOn.description',
    'valueObject.relation.prerequisiteFor.title',
    'valueObject.relation.prerequisiteFor.description',
    false,
    1,
    40,
    'active'
  ),
  (
    'conflicts_with',
    'symmetric',
    'ordinary',
    'ordinary',
    'valueObject.relation.conflictsWith.title',
    'valueObject.relation.conflictsWith.description',
    'valueObject.relation.conflictsWith.title',
    'valueObject.relation.conflictsWith.description',
    false,
    1,
    50,
    'active'
  ),
  (
    'influences',
    'directed',
    'ordinary',
    'ordinary',
    'valueObject.relation.influences.title',
    'valueObject.relation.influences.description',
    'valueObject.relation.influencedBy.title',
    'valueObject.relation.influencedBy.description',
    false,
    1,
    60,
    'active'
  ),
  (
    'prerequisite_for',
    'directed',
    'ordinary',
    'ordinary',
    'valueObject.relation.prerequisiteFor.title',
    'valueObject.relation.prerequisiteFor.description',
    'valueObject.relation.dependsOn.title',
    'valueObject.relation.dependsOn.description',
    false,
    1,
    910,
    'inactive'
  ),
  (
    'associated_with',
    'symmetric',
    'ordinary',
    'ordinary',
    'valueObject.relation.associatedWith.title',
    'valueObject.relation.associatedWith.description',
    'valueObject.relation.associatedWith.title',
    'valueObject.relation.associatedWith.description',
    false,
    1,
    920,
    'inactive'
  ),
  (
    'influenced_by',
    'directed',
    'ordinary',
    'ordinary',
    'valueObject.relation.influencedBy.title',
    'valueObject.relation.influencedBy.description',
    'valueObject.relation.influences.title',
    'valueObject.relation.influences.description',
    false,
    1,
    930,
    'inactive'
  )
on conflict (relation_type_code) do update
set
  directionality_code = excluded.directionality_code,
  from_scope_code = excluded.from_scope_code,
  to_scope_code = excluded.to_scope_code,
  title_key = excluded.title_key,
  description_key = excluded.description_key,
  reverse_title_key = excluded.reverse_title_key,
  reverse_description_key = excluded.reverse_description_key,
  allow_self_link = excluded.allow_self_link,
  contract_version = excluded.contract_version,
  display_order = excluded.display_order,
  status = excluded.status,
  updated_at = clock_timestamp();

-- Future analysis registry rows remain future and are not writable in P10.
update public.value_object_relation_types
set
  reverse_title_key = coalesce(reverse_title_key, title_key),
  reverse_description_key = coalesce(reverse_description_key, description_key),
  allow_self_link = false,
  contract_version = greatest(contract_version, 1),
  updated_at = clock_timestamp()
where relation_type_code in (
  'threatens',
  'opportunity_for',
  'indicated_by'
);

create table public.value_object_relations (
  id uuid primary key default gen_random_uuid(),

  owner_user_id uuid not null
    references public.app_users(id)
    on delete cascade,

  owner_actor_id uuid not null
    references public.actors(id)
    on delete cascade,

  source_value_object_id uuid not null
    references public.value_objects(id)
    on delete restrict,

  target_value_object_id uuid not null
    references public.value_objects(id)
    on delete restrict,

  relation_type_code text not null
    references public.value_object_relation_types(relation_type_code)
    on update restrict
    on delete restrict,

  status text not null default 'active',
  provenance_code text not null default 'manual',

  created_by_actor_id uuid not null
    references public.actors(id)
    on delete restrict,

  updated_by_actor_id uuid not null
    references public.actors(id)
    on delete restrict,

  metadata_json jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  deactivated_at timestamptz,
  reactivated_at timestamptz,

  constraint value_object_relations_status_p10_check
    check (status in ('active', 'inactive')),

  constraint value_object_relations_provenance_p10_check
    check (provenance_code in ('manual', 'ai_suggested', 'imported', 'system')),

  constraint value_object_relations_metadata_p10_check
    check (jsonb_typeof(metadata_json) = 'object'),

  constraint value_object_relations_identity_p10_unique
    unique (
      owner_user_id,
      owner_actor_id,
      relation_type_code,
      source_value_object_id,
      target_value_object_id
    )
);

create table public.value_object_relation_operations (
  id uuid primary key default gen_random_uuid(),

  owner_user_id uuid not null
    references public.app_users(id)
    on delete cascade,

  owner_actor_id uuid not null
    references public.actors(id)
    on delete cascade,

  created_by_actor_id uuid not null
    references public.actors(id)
    on delete restrict,

  relation_id uuid
    references public.value_object_relations(id)
    on delete set null,

  operation_type text not null,
  idempotency_key text not null,
  request_hash text not null,
  response_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default clock_timestamp(),

  constraint value_object_relation_operations_type_p10_check
    check (operation_type in ('create_or_reactivate', 'deactivate', 'reactivate')),

  constraint value_object_relation_operations_idempotency_p10_check
    check (char_length(idempotency_key) between 8 and 200),

  constraint value_object_relation_operations_hash_p10_check
    check (request_hash ~ '^[A-F0-9]{64}$'),

  constraint value_object_relation_operations_response_p10_check
    check (jsonb_typeof(response_json) = 'object'),

  constraint value_object_relation_operations_idempotency_p10_unique
    unique (owner_user_id, owner_actor_id, idempotency_key)
);

create index value_object_relations_source_p10_idx
  on public.value_object_relations(
    owner_user_id,
    owner_actor_id,
    source_value_object_id,
    status,
    updated_at desc
  );

create index value_object_relations_target_p10_idx
  on public.value_object_relations(
    owner_user_id,
    owner_actor_id,
    target_value_object_id,
    status,
    updated_at desc
  );

create index value_object_relation_operations_relation_p10_idx
  on public.value_object_relation_operations(
    relation_id,
    created_at desc
  );

alter table public.value_object_relations enable row level security;
alter table public.value_object_relation_operations enable row level security;

revoke all on public.value_object_relations
  from public, anon, authenticated, service_role;
revoke all on public.value_object_relation_operations
  from public, anon, authenticated, service_role;

-- Server reads use the service-role client. All writes go through the
-- SECURITY DEFINER RPCs below; direct service-role table writes are denied.
grant select on public.value_object_relations
  to service_role;
grant select on public.value_object_relation_operations
  to service_role;

create policy value_object_relations_no_direct_p10
on public.value_object_relations
for all
to anon, authenticated
using (false)
with check (false);

create policy value_object_relation_operations_no_direct_p10
on public.value_object_relation_operations
for all
to anon, authenticated
using (false)
with check (false);

create or replace function public.enforce_value_object_relation_p10()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $function$
declare
  v_relation_type public.value_object_relation_types%rowtype;
  v_source record;
  v_target record;
  v_swap uuid;
begin
  select relation_type.*
  into v_relation_type
  from public.value_object_relation_types relation_type
  where relation_type.relation_type_code = new.relation_type_code;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'P10_RELATION_TYPE_NOT_FOUND';
  end if;

  if new.status = 'active'
     and (
       v_relation_type.status <> 'active'
       or v_relation_type.from_scope_code not in ('ordinary', 'both')
       or v_relation_type.to_scope_code not in ('ordinary', 'both')
     ) then
    raise exception using
      errcode = '23514',
      message = 'P10_RELATION_TYPE_NOT_ACTIVE_ORDINARY';
  end if;

  if new.source_value_object_id = new.target_value_object_id
     and not v_relation_type.allow_self_link then
    raise exception using
      errcode = '23514',
      message = 'P10_SELF_LINK_FORBIDDEN';
  end if;

  select
    value_object.id,
    value_object.owner_user_id,
    value_object.owner_actor_id,
    value_object.node_role_code,
    value_object.branch_type_code
  into v_source
  from public.value_objects value_object
  where value_object.id = new.source_value_object_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'P10_SOURCE_VALUE_OBJECT_NOT_FOUND';
  end if;

  select
    value_object.id,
    value_object.owner_user_id,
    value_object.owner_actor_id,
    value_object.node_role_code,
    value_object.branch_type_code
  into v_target
  from public.value_objects value_object
  where value_object.id = new.target_value_object_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'P10_TARGET_VALUE_OBJECT_NOT_FOUND';
  end if;

  if v_source.owner_user_id is distinct from new.owner_user_id
     or v_source.owner_actor_id is distinct from new.owner_actor_id
     or v_target.owner_user_id is distinct from new.owner_user_id
     or v_target.owner_actor_id is distinct from new.owner_actor_id then
    raise exception using
      errcode = '42501',
      message = 'P10_RELATION_OWNER_MISMATCH';
  end if;

  if v_source.node_role_code is null
     or v_source.branch_type_code is null
     or v_target.node_role_code is null
     or v_target.branch_type_code is null then
    raise exception using
      errcode = '23514',
      message = 'P10_RELATION_REQUIRES_REALITY_MODEL_VALUE_OBJECTS';
  end if;

  if new.created_by_actor_id is distinct from new.owner_actor_id
     or new.updated_by_actor_id is distinct from new.owner_actor_id then
    raise exception using
      errcode = '42501',
      message = 'P10_RELATION_ACTOR_MISMATCH';
  end if;

  if v_relation_type.directionality_code = 'symmetric'
     and new.source_value_object_id::text > new.target_value_object_id::text then
    v_swap := new.source_value_object_id;
    new.source_value_object_id := new.target_value_object_id;
    new.target_value_object_id := v_swap;
  end if;

  if tg_op = 'UPDATE' then
    if new.owner_user_id is distinct from old.owner_user_id
       or new.owner_actor_id is distinct from old.owner_actor_id
       or new.source_value_object_id is distinct from old.source_value_object_id
       or new.target_value_object_id is distinct from old.target_value_object_id
       or new.relation_type_code is distinct from old.relation_type_code
       or new.provenance_code is distinct from old.provenance_code
       or new.created_by_actor_id is distinct from old.created_by_actor_id
       or new.created_at is distinct from old.created_at then
      raise exception using
        errcode = '23514',
        message = 'P10_RELATION_IDENTITY_IMMUTABLE';
    end if;

    if old.status = 'active' and new.status = 'inactive' then
      new.deactivated_at := clock_timestamp();
    elsif old.status = 'inactive' and new.status = 'active' then
      new.deactivated_at := null;
      new.reactivated_at := clock_timestamp();
    elsif new.status = 'active' then
      new.deactivated_at := null;
    end if;

    new.updated_at := clock_timestamp();
  else
    if new.status = 'inactive' and new.deactivated_at is null then
      new.deactivated_at := clock_timestamp();
    elsif new.status = 'active' then
      new.deactivated_at := null;
    end if;
  end if;

  return new;
end;
$function$;

create trigger value_object_relations_enforce_p10_trg
before insert or update on public.value_object_relations
for each row
execute function public.enforce_value_object_relation_p10();

create or replace function public.p10_value_object_relation_json(
  p_relation_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select jsonb_build_object(
    'id', relation.id,
    'ownerUserId', relation.owner_user_id,
    'ownerActorId', relation.owner_actor_id,
    'sourceValueObjectId', relation.source_value_object_id,
    'targetValueObjectId', relation.target_value_object_id,
    'relationTypeCode', relation.relation_type_code,
    'status', relation.status,
    'provenanceCode', relation.provenance_code,
    'createdByActorId', relation.created_by_actor_id,
    'updatedByActorId', relation.updated_by_actor_id,
    'createdAt', relation.created_at,
    'updatedAt', relation.updated_at,
    'deactivatedAt', relation.deactivated_at,
    'reactivatedAt', relation.reactivated_at
  )
  from public.value_object_relations relation
  where relation.id = p_relation_id;
$function$;

create or replace function public.create_or_reactivate_value_object_relation_v1(
  p_owner_user_id uuid,
  p_owner_actor_id uuid,
  p_created_by_actor_id uuid,
  p_source_value_object_id uuid,
  p_target_value_object_id uuid,
  p_relation_type_code text,
  p_provenance_code text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $function$
declare
  v_relation_type public.value_object_relation_types%rowtype;
  v_source_id uuid := p_source_value_object_id;
  v_target_id uuid := p_target_value_object_id;
  v_swap uuid;
  v_relation public.value_object_relations%rowtype;
  v_operation public.value_object_relation_operations%rowtype;
  v_request_payload jsonb;
  v_request_hash text;
  v_response jsonb;
  v_disposition text;
begin
  if p_owner_user_id is null
     or p_owner_actor_id is null
     or p_created_by_actor_id is null
     or p_source_value_object_id is null
     or p_target_value_object_id is null
     or nullif(btrim(p_relation_type_code), '') is null
     or nullif(btrim(p_idempotency_key), '') is null then
    raise exception using
      errcode = '22023',
      message = 'P10_CREATE_ARGUMENT_REQUIRED';
  end if;

  if p_created_by_actor_id is distinct from p_owner_actor_id then
    raise exception using
      errcode = '42501',
      message = 'P10_CREATE_ACTOR_MISMATCH';
  end if;

  if char_length(p_idempotency_key) not between 8 and 200 then
    raise exception using
      errcode = '22023',
      message = 'P10_IDEMPOTENCY_KEY_INVALID';
  end if;

  select relation_type.*
  into v_relation_type
  from public.value_object_relation_types relation_type
  where relation_type.relation_type_code = btrim(p_relation_type_code)
    and relation_type.status = 'active'
    and relation_type.from_scope_code in ('ordinary', 'both')
    and relation_type.to_scope_code in ('ordinary', 'both');

  if not found then
    raise exception using
      errcode = '23514',
      message = 'P10_RELATION_TYPE_NOT_ACTIVE_ORDINARY';
  end if;

  if v_relation_type.directionality_code = 'symmetric'
     and v_source_id::text > v_target_id::text then
    v_swap := v_source_id;
    v_source_id := v_target_id;
    v_target_id := v_swap;
  end if;

  v_request_payload := jsonb_build_object(
    'operation', 'create_or_reactivate',
    'ownerUserId', p_owner_user_id,
    'ownerActorId', p_owner_actor_id,
    'createdByActorId', p_created_by_actor_id,
    'sourceValueObjectId', v_source_id,
    'targetValueObjectId', v_target_id,
    'relationTypeCode', btrim(p_relation_type_code),
    'provenanceCode', coalesce(nullif(btrim(p_provenance_code), ''), 'manual')
  );

  v_request_hash := upper(
    encode(
      digest(convert_to(v_request_payload::text, 'UTF8'), 'sha256'),
      'hex'
    )
  );

  perform pg_advisory_xact_lock(
    hashtextextended(
      p_owner_user_id::text || '|' ||
      p_owner_actor_id::text || '|' ||
      p_idempotency_key,
      0
    )
  );

  select operation.*
  into v_operation
  from public.value_object_relation_operations operation
  where operation.owner_user_id = p_owner_user_id
    and operation.owner_actor_id = p_owner_actor_id
    and operation.idempotency_key = p_idempotency_key;

  if found then
    if v_operation.request_hash <> v_request_hash then
      raise exception using
        errcode = '23505',
        message = 'P10_IDEMPOTENCY_CONFLICT';
    end if;

    return v_operation.response_json;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      p_owner_user_id::text || '|' ||
      p_owner_actor_id::text || '|' ||
      btrim(p_relation_type_code) || '|' ||
      v_source_id::text || '|' ||
      v_target_id::text,
      1
    )
  );

  select relation.*
  into v_relation
  from public.value_object_relations relation
  where relation.owner_user_id = p_owner_user_id
    and relation.owner_actor_id = p_owner_actor_id
    and relation.relation_type_code = btrim(p_relation_type_code)
    and relation.source_value_object_id = v_source_id
    and relation.target_value_object_id = v_target_id
  for update;

  if found then
    if v_relation.status = 'active' then
      v_disposition := 'already_active';
    else
      update public.value_object_relations relation
      set
        status = 'active',
        updated_by_actor_id = p_created_by_actor_id
      where relation.id = v_relation.id
      returning relation.* into v_relation;

      v_disposition := 'reactivated';
    end if;
  else
    insert into public.value_object_relations (
      owner_user_id,
      owner_actor_id,
      source_value_object_id,
      target_value_object_id,
      relation_type_code,
      status,
      provenance_code,
      created_by_actor_id,
      updated_by_actor_id,
      metadata_json
    )
    values (
      p_owner_user_id,
      p_owner_actor_id,
      v_source_id,
      v_target_id,
      btrim(p_relation_type_code),
      'active',
      coalesce(nullif(btrim(p_provenance_code), ''), 'manual'),
      p_created_by_actor_id,
      p_created_by_actor_id,
      '{}'::jsonb
    )
    returning * into v_relation;

    v_disposition := 'created';
  end if;

  v_response := jsonb_build_object(
    'ok', true,
    'disposition', v_disposition,
    'relation', public.p10_value_object_relation_json(v_relation.id)
  );

  insert into public.value_object_relation_operations (
    owner_user_id,
    owner_actor_id,
    created_by_actor_id,
    relation_id,
    operation_type,
    idempotency_key,
    request_hash,
    response_json
  )
  values (
    p_owner_user_id,
    p_owner_actor_id,
    p_created_by_actor_id,
    v_relation.id,
    'create_or_reactivate',
    p_idempotency_key,
    v_request_hash,
    v_response
  );

  return v_response;
end;
$function$;

create or replace function public.set_value_object_relation_status_v1(
  p_owner_user_id uuid,
  p_owner_actor_id uuid,
  p_created_by_actor_id uuid,
  p_context_value_object_id uuid,
  p_relation_id uuid,
  p_status text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $function$
declare
  v_relation public.value_object_relations%rowtype;
  v_operation public.value_object_relation_operations%rowtype;
  v_requested_status text := btrim(p_status);
  v_operation_type text;
  v_request_payload jsonb;
  v_request_hash text;
  v_response jsonb;
  v_disposition text;
begin
  if p_owner_user_id is null
     or p_owner_actor_id is null
     or p_created_by_actor_id is null
     or p_context_value_object_id is null
     or p_relation_id is null
     or nullif(v_requested_status, '') is null
     or nullif(btrim(p_idempotency_key), '') is null then
    raise exception using
      errcode = '22023',
      message = 'P10_STATUS_ARGUMENT_REQUIRED';
  end if;

  if p_created_by_actor_id is distinct from p_owner_actor_id then
    raise exception using
      errcode = '42501',
      message = 'P10_STATUS_ACTOR_MISMATCH';
  end if;

  if v_requested_status not in ('active', 'inactive') then
    raise exception using
      errcode = '22023',
      message = 'P10_STATUS_INVALID';
  end if;

  if char_length(p_idempotency_key) not between 8 and 200 then
    raise exception using
      errcode = '22023',
      message = 'P10_IDEMPOTENCY_KEY_INVALID';
  end if;

  v_operation_type := case
    when v_requested_status = 'active' then 'reactivate'
    else 'deactivate'
  end;

  v_request_payload := jsonb_build_object(
    'operation', v_operation_type,
    'ownerUserId', p_owner_user_id,
    'ownerActorId', p_owner_actor_id,
    'createdByActorId', p_created_by_actor_id,
    'contextValueObjectId', p_context_value_object_id,
    'relationId', p_relation_id,
    'status', v_requested_status
  );

  v_request_hash := upper(
    encode(
      digest(convert_to(v_request_payload::text, 'UTF8'), 'sha256'),
      'hex'
    )
  );

  perform pg_advisory_xact_lock(
    hashtextextended(
      p_owner_user_id::text || '|' ||
      p_owner_actor_id::text || '|' ||
      p_idempotency_key,
      0
    )
  );

  select operation.*
  into v_operation
  from public.value_object_relation_operations operation
  where operation.owner_user_id = p_owner_user_id
    and operation.owner_actor_id = p_owner_actor_id
    and operation.idempotency_key = p_idempotency_key;

  if found then
    if v_operation.request_hash <> v_request_hash then
      raise exception using
        errcode = '23505',
        message = 'P10_IDEMPOTENCY_CONFLICT';
    end if;

    return v_operation.response_json;
  end if;

  select relation.*
  into v_relation
  from public.value_object_relations relation
  where relation.id = p_relation_id
    and relation.owner_user_id = p_owner_user_id
    and relation.owner_actor_id = p_owner_actor_id
    and p_context_value_object_id in (
      relation.source_value_object_id,
      relation.target_value_object_id
    )
  for update;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'P10_RELATION_NOT_FOUND_OR_CONTEXT_MISMATCH';
  end if;

  if v_relation.status = v_requested_status then
    v_disposition := case
      when v_requested_status = 'active' then 'already_active'
      else 'already_inactive'
    end;
  else
    update public.value_object_relations relation
    set
      status = v_requested_status,
      updated_by_actor_id = p_created_by_actor_id
    where relation.id = v_relation.id
    returning relation.* into v_relation;

    v_disposition := case
      when v_requested_status = 'active' then 'reactivated'
      else 'deactivated'
    end;
  end if;

  v_response := jsonb_build_object(
    'ok', true,
    'disposition', v_disposition,
    'relation', public.p10_value_object_relation_json(v_relation.id)
  );

  insert into public.value_object_relation_operations (
    owner_user_id,
    owner_actor_id,
    created_by_actor_id,
    relation_id,
    operation_type,
    idempotency_key,
    request_hash,
    response_json
  )
  values (
    p_owner_user_id,
    p_owner_actor_id,
    p_created_by_actor_id,
    v_relation.id,
    v_operation_type,
    p_idempotency_key,
    v_request_hash,
    v_response
  );

  return v_response;
end;
$function$;

revoke all on function public.enforce_value_object_relation_p10()
  from public, anon, authenticated;
revoke all on function public.p10_value_object_relation_json(uuid)
  from public, anon, authenticated;
revoke all on function public.create_or_reactivate_value_object_relation_v1(
  uuid, uuid, uuid, uuid, uuid, text, text, text
) from public, anon, authenticated;
revoke all on function public.set_value_object_relation_status_v1(
  uuid, uuid, uuid, uuid, uuid, text, text
) from public, anon, authenticated;

grant execute on function public.enforce_value_object_relation_p10()
  to service_role;
grant execute on function public.p10_value_object_relation_json(uuid)
  to service_role;
grant execute on function public.create_or_reactivate_value_object_relation_v1(
  uuid, uuid, uuid, uuid, uuid, text, text, text
) to service_role;
grant execute on function public.set_value_object_relation_status_v1(
  uuid, uuid, uuid, uuid, uuid, text, text
) to service_role;

comment on table public.value_object_relations is
  'P10 ordinary semantic links between owned Value Objects. These rows never alter the structural tree and never copy facts, measures, parameters or targets.';

comment on table public.value_object_relation_operations is
  'P10 idempotent lifecycle operation log for semantic relations.';

comment on function public.create_or_reactivate_value_object_relation_v1(
  uuid, uuid, uuid, uuid, uuid, text, text, text
) is
  'Creates one canonical ordinary semantic relation or reactivates the same lifecycle row. Symmetric pairs are canonicalized.';

comment on function public.set_value_object_relation_status_v1(
  uuid, uuid, uuid, uuid, uuid, text, text
) is
  'Deactivates or reactivates an owned semantic relation without hard delete.';

commit;
