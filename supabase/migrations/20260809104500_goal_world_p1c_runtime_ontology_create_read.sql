/*
ARCTor.app Ã¢â‚¬â€ Goal World Constructor
P1C Runtime Ontology Create/Read Contract v1

Creates:
- inactive legacy compatibility branch ontology_v1
- idempotency table for ontology creation
- ontology row guard
- automatic immutable definition snapshots
- assembled card read RPC
- controlled create RPC
- controlled lifecycle RPC

Compatibility:
- old authoring routes with P1 ontology columns = NULL remain accepted
- existing P1B rows remain intact
- old product/service/certificate routes are not replaced
*/

begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

do $preflight$
begin
  if to_regclass('public.value_objects') is null
     or to_regclass('public.value_object_facet_registry') is null
     or to_regclass('public.value_object_kind_registry') is null
     or to_regclass('public.value_object_definition_versions') is null
     or to_regclass('public.value_object_branch_types') is null
     or to_regclass('public.app_users') is null
     or to_regclass('public.actors') is null
     or to_regclass('public.actor_public_profiles') is null then
    raise exception using
      errcode = '42P01',
      message = 'P1C_REQUIRED_TABLES_MISSING';
  end if;

  if (
    select count(*)
    from public.value_objects
    where canonical_key is not null
      and definition_version = 1
      and origin_type_code = 'legacy'
  ) <> 15 then
    raise exception using
      errcode = '23514',
      message = 'P1C_P1B_BASELINE_NOT_FOUND';
  end if;
end;
$preflight$;

/*
Technical bridge only.
The row is inactive so it cannot appear as a selectable old branch policy.
*/
insert into public.value_object_branch_types (
  branch_type_code,
  title_key,
  description_key,
  display_order,
  status
)
values (
  'ontology_v1',
  'valueObject.branch.ontologyV1Bridge.title',
  'valueObject.branch.ontologyV1Bridge.description',
  999,
  'inactive'
)
on conflict (branch_type_code) do update
set
  title_key = excluded.title_key,
  description_key = excluded.description_key,
  status = 'inactive',
  updated_at = now();

create table if not exists public.value_object_ontology_write_requests (
  id uuid primary key default gen_random_uuid(),

  owner_user_id uuid not null
    references public.app_users(id)
    on delete cascade,

  owner_actor_id uuid not null
    references public.actors(id)
    on delete cascade,

  idempotency_key text not null,
  request_hash text not null,
  value_object_id uuid
    references public.value_objects(id)
    on delete set null,

  response_json jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint value_object_ontology_write_requests_key_check
    check (
      char_length(idempotency_key) between 8 and 200
    ),

  constraint value_object_ontology_write_requests_hash_check
    check (
      request_hash ~ '^[A-F0-9]{64}$'
    ),

  constraint value_object_ontology_write_requests_response_check
    check (
      jsonb_typeof(response_json) = 'object'
    ),

  constraint value_object_ontology_write_requests_unique
    unique (owner_user_id, owner_actor_id, idempotency_key)
);

alter table public.value_object_ontology_write_requests enable row level security;

revoke all
on table public.value_object_ontology_write_requests
from public, anon, authenticated;

grant select, insert, update
on table public.value_object_ontology_write_requests
to service_role;

drop policy if exists value_object_ontology_write_requests_no_direct_p1c
  on public.value_object_ontology_write_requests;

create policy value_object_ontology_write_requests_no_direct_p1c
  on public.value_object_ontology_write_requests
  for all
  to anon, authenticated
  using (false)
  with check (false);

/*
Core ontology guard.
Legacy rows with all P1 columns NULL pass through unchanged.
*/
create or replace function public.enforce_value_object_ontology_p1c()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_ontology_requested boolean;
  v_parent public.value_objects%rowtype;
  v_root public.value_objects%rowtype;
  v_kind public.value_object_kind_registry%rowtype;
  v_has_children boolean;
  v_definition_changed boolean := false;
begin
  v_ontology_requested :=
    new.canonical_key is not null
    or new.facet_code is not null
    or new.object_kind_code is not null
    or new.ontology_node_role_code is not null
    or new.hierarchy_relation_code is not null
    or new.scope_code is not null
    or new.visibility_code is not null
    or new.privacy_class_code is not null
    or new.definition_version is not null
    or new.origin_type_code is not null;

  /*
  The technical ontology_v1 branch is reserved for the new P1C runtime.
  Old routes may continue to write under legacy P1B roots, but they may not
  inject P1-null rows into a new ontology_v1 tree.
  */
  if new.branch_type_code = 'ontology_v1'
     and not v_ontology_requested then
    raise exception using
      errcode = '23514',
      message = 'P1C_ONTOLOGY_V1_REQUIRES_ONTOLOGY_FIELDS';
  end if;

  /*
  Semantic leaves are terminal even for writes coming from an old route.
  This closes the temporary legacy structural/activity_leaf compatibility gap.
  */
  if new.parent_value_object_id is not null then
    select *
    into v_parent
    from public.value_objects parent_guard
    where parent_guard.id = new.parent_value_object_id;

    if found
       and v_parent.ontology_node_role_code = 'leaf' then
      raise exception using
        errcode = '23514',
        message = 'P1C_SEMANTIC_LEAF_CANNOT_ACCEPT_CHILD';
    end if;
  end if;

  if not v_ontology_requested then
    return new;
  end if;

  if nullif(btrim(new.canonical_key), '') is null
     or new.facet_code is null
     or new.object_kind_code is null
     or new.ontology_node_role_code is null
     or new.scope_code is null
     or new.visibility_code is null
     or new.privacy_class_code is null
     or new.definition_version is null
     or new.origin_type_code is null then
    raise exception using
      errcode = '23514',
      message = 'P1C_ONTOLOGY_IDENTITY_INCOMPLETE';
  end if;

  if new.status not in ('candidate', 'draft', 'active', 'inactive', 'retired') then
    raise exception using
      errcode = '23514',
      message = 'P1C_STATUS_INVALID';
  end if;

  if not exists (
    select 1
    from public.value_object_facet_registry facet
    where facet.facet_code = new.facet_code
      and facet.status = 'active'
  ) then
    raise exception using
      errcode = '23514',
      message = 'P1C_FACET_NOT_ACTIVE';
  end if;

  select *
  into v_kind
  from public.value_object_kind_registry kind_registry
  where kind_registry.object_kind_code = new.object_kind_code;

  if not found or v_kind.status <> 'active' then
    raise exception using
      errcode = '23514',
      message = 'P1C_KIND_NOT_ACTIVE';
  end if;

  if v_kind.facet_code <> new.facet_code then
    raise exception using
      errcode = '23514',
      message = 'P1C_KIND_FACET_MISMATCH';
  end if;

  if not (v_kind.allowed_node_roles_json ? new.ontology_node_role_code) then
    raise exception using
      errcode = '23514',
      message = 'P1C_KIND_NODE_ROLE_FORBIDDEN';
  end if;

  if tg_op = 'UPDATE' then
    if old.canonical_key is not null
       and new.canonical_key is distinct from old.canonical_key then
      raise exception using
        errcode = '23514',
        message = 'P1C_CANONICAL_KEY_IMMUTABLE';
    end if;

    if old.ontology_node_role_code is not null
       and new.ontology_node_role_code
            is distinct from old.ontology_node_role_code then
      raise exception using
        errcode = '23514',
        message = 'P1C_NODE_ROLE_IMMUTABLE';
    end if;
  end if;

  if new.ontology_node_role_code = 'root' then
    if new.facet_code <> 'DOMAIN'
       or new.object_kind_code <> 'domain_root'
       or new.parent_value_object_id is not null
       or new.hierarchy_relation_code is not null
       or new.root_value_object_id is distinct from new.id then
      raise exception using
        errcode = '23514',
        message = 'P1C_ROOT_SHAPE_INVALID';
    end if;
  else
    if new.parent_value_object_id is null
       or new.hierarchy_relation_code is null then
      raise exception using
        errcode = '23514',
        message = 'P1C_NON_ROOT_PARENT_AND_RELATION_REQUIRED';
    end if;

    select *
    into v_parent
    from public.value_objects parent
    where parent.id = new.parent_value_object_id;

    if not found then
      raise exception using
        errcode = '23503',
        message = 'P1C_PARENT_NOT_FOUND';
    end if;

    if v_parent.canonical_key is null
       or v_parent.facet_code is null
       or v_parent.object_kind_code is null
       or v_parent.ontology_node_role_code not in ('root', 'intermediate')
       or v_parent.root_value_object_id is null then
      raise exception using
        errcode = '23514',
        message = 'P1C_PARENT_NOT_ONTOLOGY_STRUCTURAL';
    end if;

    if new.scope_code is distinct from v_parent.scope_code
       or new.owner_actor_id is distinct from v_parent.owner_actor_id
       or new.owner_user_id is distinct from v_parent.owner_user_id then
      raise exception using
        errcode = '42501',
        message = 'P1C_PARENT_SCOPE_OWNER_MISMATCH';
    end if;

    if v_parent.ontology_node_role_code = 'root' then
      if v_parent.facet_code <> 'DOMAIN'
         or new.facet_code = 'DOMAIN' then
        raise exception using
          errcode = '23514',
          message = 'P1C_DOMAIN_ROOT_FACET_TRANSITION_INVALID';
      end if;
    elsif new.facet_code <> v_parent.facet_code then
      raise exception using
        errcode = '23514',
        message = 'P1C_NON_ROOT_FACET_MISMATCH';
    end if;

    if new.root_value_object_id
         is distinct from v_parent.root_value_object_id then
      raise exception using
        errcode = '23514',
        message = 'P1C_ROOT_POINTER_MISMATCH';
    end if;
  end if;

  /*
  A root is self-referential by definition. During BEFORE INSERT the new root
  is not yet visible through SELECT from value_objects, so its self-root shape
  is validated above without re-reading the table.

  Non-root objects must resolve an already persisted semantic root.
  */
  if new.ontology_node_role_code <> 'root' then
    select *
    into v_root
    from public.value_objects root
    where root.id = new.root_value_object_id;

    if not found
       or v_root.ontology_node_role_code <> 'root'
       or v_root.facet_code <> 'DOMAIN'
       or v_root.parent_value_object_id is not null
       or v_root.root_value_object_id is distinct from v_root.id then
      raise exception using
        errcode = '23514',
        message = 'P1C_ROOT_POINTER_INVALID';
    end if;
  end if;

  if new.ontology_node_role_code = 'leaf' then
    select exists (
      select 1
      from public.value_objects child
      where child.parent_value_object_id = new.id
        and child.id <> new.id
    )
    into v_has_children;

    if v_has_children then
      raise exception using
        errcode = '23514',
        message = 'P1C_LEAF_CANNOT_HAVE_CHILDREN';
    end if;
  end if;

  if tg_op = 'INSERT' then
    if new.definition_version <> 1 then
      raise exception using
        errcode = '23514',
        message = 'P1C_INITIAL_DEFINITION_VERSION_MUST_BE_1';
    end if;
  else
    v_definition_changed :=
      new.title is distinct from old.title
      or new.description is distinct from old.description
      or new.facet_code is distinct from old.facet_code
      or new.object_kind_code is distinct from old.object_kind_code
      or new.ontology_node_role_code
           is distinct from old.ontology_node_role_code
      or new.parent_value_object_id
           is distinct from old.parent_value_object_id
      or new.root_value_object_id
           is distinct from old.root_value_object_id
      or new.hierarchy_relation_code
           is distinct from old.hierarchy_relation_code
      or new.scope_code is distinct from old.scope_code
      or new.visibility_code is distinct from old.visibility_code
      or new.privacy_class_code is distinct from old.privacy_class_code
      or new.valid_from is distinct from old.valid_from
      or new.valid_to is distinct from old.valid_to
      or new.origin_type_code is distinct from old.origin_type_code;

    if v_definition_changed then
      new.definition_version := old.definition_version + 1;
    elsif new.definition_version is distinct from old.definition_version then
      raise exception using
        errcode = '23514',
        message = 'P1C_DEFINITION_VERSION_MANUAL_CHANGE_FORBIDDEN';
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists value_objects_ontology_p1c_enforce_trg
  on public.value_objects;

create trigger value_objects_ontology_p1c_enforce_trg
before insert or update
on public.value_objects
for each row
execute function public.enforce_value_object_ontology_p1c();

/*
Immutable definition snapshot writer.
*/
create or replace function public.write_value_object_definition_snapshot_p1c()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if new.canonical_key is null
     or new.definition_version is null then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and new.definition_version = old.definition_version then
    return new;
  end if;

  insert into public.value_object_definition_versions (
    value_object_id,
    version,
    canonical_key,
    title,
    description,
    facet_code,
    object_kind_code,
    node_role_code,
    parent_value_object_id,
    root_value_object_id,
    hierarchy_relation_code,
    scope_code,
    owner_actor_id,
    status_code,
    visibility_code,
    privacy_class_code,
    origin_type_code,
    valid_from,
    valid_to,
    created_by_actor_id,
    definition_snapshot_json,
    source_context
  )
  values (
    new.id,
    new.definition_version,
    new.canonical_key,
    new.title,
    new.description,
    new.facet_code,
    new.object_kind_code,
    new.ontology_node_role_code,
    new.parent_value_object_id,
    new.root_value_object_id,
    new.hierarchy_relation_code,
    new.scope_code,
    new.owner_actor_id,
    new.status,
    new.visibility_code,
    new.privacy_class_code,
    new.origin_type_code,
    new.valid_from,
    new.valid_to,
    new.created_by_actor_id,
    jsonb_build_object(
      'contract', 'P1C_RUNTIME_ONTOLOGY_CREATE_READ_V1',
      'legacy_bridge', jsonb_build_object(
        'object_kind', new.object_kind,
        'node_role_code', new.node_role_code,
        'branch_type_code', new.branch_type_code
      )
    ),
    'P1C_RUNTIME_ONTOLOGY_CREATE_READ_V1'
  );

  return new;
end;
$function$;

drop trigger if exists value_objects_definition_snapshot_p1c_trg
  on public.value_objects;

create trigger value_objects_definition_snapshot_p1c_trg
after insert or update
on public.value_objects
for each row
execute function public.write_value_object_definition_snapshot_p1c();

/*
Assembled core card.
Actor-scoped v1 only.
*/
create or replace function public.get_value_object_ontology_card_v1(
  p_owner_user_id uuid,
  p_owner_actor_id uuid,
  p_value_object_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
declare
  v_value_object public.value_objects%rowtype;
  v_parent public.value_objects%rowtype;
  v_root public.value_objects%rowtype;
  v_facet public.value_object_facet_registry%rowtype;
  v_kind public.value_object_kind_registry%rowtype;
  v_latest_definition public.value_object_definition_versions%rowtype;
  v_allowed_actions jsonb := '[]'::jsonb;
begin
  if p_owner_user_id is null
     or p_owner_actor_id is null
     or p_value_object_id is null then
    raise exception using
      errcode = '22023',
      message = 'P1C_READ_IDENTIFIERS_REQUIRED';
  end if;

  select *
  into v_value_object
  from public.value_objects value_object
  where value_object.id = p_value_object_id;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'P1C_VALUE_OBJECT_NOT_FOUND';
  end if;

  if v_value_object.scope_code <> 'actor'
     or v_value_object.owner_user_id is distinct from p_owner_user_id
     or v_value_object.owner_actor_id is distinct from p_owner_actor_id then
    raise exception using
      errcode = '42501',
      message = 'P1C_VALUE_OBJECT_ACCESS_DENIED';
  end if;

  if v_value_object.canonical_key is null
     or v_value_object.facet_code is null
     or v_value_object.object_kind_code is null
     or v_value_object.ontology_node_role_code is null then
    raise exception using
      errcode = '23514',
      message = 'P1C_VALUE_OBJECT_NOT_ONTOLOGY_READY';
  end if;

  if v_value_object.parent_value_object_id is not null then
    select *
    into v_parent
    from public.value_objects parent
    where parent.id = v_value_object.parent_value_object_id;
  end if;

  select *
  into v_root
  from public.value_objects root
  where root.id = v_value_object.root_value_object_id;

  if not found then
    raise exception using
      errcode = '23514',
      message = 'P1C_ROOT_NOT_FOUND';
  end if;

  select *
  into v_facet
  from public.value_object_facet_registry facet
  where facet.facet_code = v_value_object.facet_code;

  select *
  into v_kind
  from public.value_object_kind_registry kind_registry
  where kind_registry.object_kind_code = v_value_object.object_kind_code;

  select *
  into v_latest_definition
  from public.value_object_definition_versions definition
  where definition.value_object_id = v_value_object.id
  order by definition.version desc
  limit 1;

  v_allowed_actions :=
    case v_value_object.status
      when 'draft' then '["activate","retire"]'::jsonb
      when 'active' then '["deactivate","retire"]'::jsonb
      when 'inactive' then '["reactivate","retire"]'::jsonb
      else '[]'::jsonb
    end;

  return jsonb_build_object(
    'contractVersion', 'value-object-ontology-card-v1',

    'valueObject', jsonb_build_object(
      'id', v_value_object.id,
      'canonicalKey', v_value_object.canonical_key,
      'title', v_value_object.title,
      'description', v_value_object.description,
      'facetCode', v_value_object.facet_code,
      'objectKindCode', v_value_object.object_kind_code,
      'nodeRoleCode', v_value_object.ontology_node_role_code,
      'parentValueObjectId', v_value_object.parent_value_object_id,
      'rootValueObjectId', v_value_object.root_value_object_id,
      'hierarchyRelationCode', v_value_object.hierarchy_relation_code,
      'scopeCode', v_value_object.scope_code,
      'ownerActorId', v_value_object.owner_actor_id,
      'statusCode', v_value_object.status,
      'visibilityCode', v_value_object.visibility_code,
      'privacyClassCode', v_value_object.privacy_class_code,
      'validFrom', v_value_object.valid_from,
      'validTo', v_value_object.valid_to,
      'definitionVersion', v_value_object.definition_version,
      'originTypeCode', v_value_object.origin_type_code,
      'createdByActorId', v_value_object.created_by_actor_id,
      'createdAt', v_value_object.created_at,
      'updatedAt', v_value_object.updated_at
    ),

    'parent',
      case
        when v_value_object.parent_value_object_id is null then null
        else jsonb_build_object(
          'id', v_parent.id,
          'canonicalKey', v_parent.canonical_key,
          'title', v_parent.title,
          'description', v_parent.description,
          'facetCode', v_parent.facet_code,
          'objectKindCode', v_parent.object_kind_code,
          'nodeRoleCode', v_parent.ontology_node_role_code,
          'parentValueObjectId', v_parent.parent_value_object_id,
          'rootValueObjectId', v_parent.root_value_object_id,
          'hierarchyRelationCode', v_parent.hierarchy_relation_code,
          'scopeCode', v_parent.scope_code,
          'ownerActorId', v_parent.owner_actor_id,
          'statusCode', v_parent.status,
          'visibilityCode', v_parent.visibility_code,
          'privacyClassCode', v_parent.privacy_class_code,
          'validFrom', v_parent.valid_from,
          'validTo', v_parent.valid_to,
          'definitionVersion', v_parent.definition_version,
          'originTypeCode', v_parent.origin_type_code,
          'createdByActorId', v_parent.created_by_actor_id,
          'createdAt', v_parent.created_at,
          'updatedAt', v_parent.updated_at
        )
      end,

    'root', jsonb_build_object(
      'id', v_root.id,
      'canonicalKey', v_root.canonical_key,
      'title', v_root.title,
      'description', v_root.description,
      'facetCode', v_root.facet_code,
      'objectKindCode', v_root.object_kind_code,
      'nodeRoleCode', v_root.ontology_node_role_code,
      'parentValueObjectId', v_root.parent_value_object_id,
      'rootValueObjectId', v_root.root_value_object_id,
      'hierarchyRelationCode', v_root.hierarchy_relation_code,
      'scopeCode', v_root.scope_code,
      'ownerActorId', v_root.owner_actor_id,
      'statusCode', v_root.status,
      'visibilityCode', v_root.visibility_code,
      'privacyClassCode', v_root.privacy_class_code,
      'validFrom', v_root.valid_from,
      'validTo', v_root.valid_to,
      'definitionVersion', v_root.definition_version,
      'originTypeCode', v_root.origin_type_code,
      'createdByActorId', v_root.created_by_actor_id,
      'createdAt', v_root.created_at,
      'updatedAt', v_root.updated_at
    ),

    'facet', jsonb_build_object(
      'facetCode', v_facet.facet_code,
      'titleKey', v_facet.title_key,
      'descriptionKey', v_facet.description_key,
      'displayOrder', v_facet.display_order,
      'status', v_facet.status,
      'version', v_facet.version
    ),

    'kind', jsonb_build_object(
      'objectKindCode', v_kind.object_kind_code,
      'facetCode', v_kind.facet_code,
      'titleKey', v_kind.title_key,
      'descriptionKey', v_kind.description_key,
      'allowedNodeRoles', v_kind.allowed_node_roles_json,
      'policy', v_kind.policy_json,
      'status', v_kind.status,
      'version', v_kind.version
    ),

    'latestDefinition',
      case
        when v_latest_definition.id is null then null
        else jsonb_build_object(
          'id', v_latest_definition.id,
          'version', v_latest_definition.version,
          'sourceContext', v_latest_definition.source_context,
          'createdAt', v_latest_definition.created_at
        )
      end,

    'allowedLifecycleActions',
      v_allowed_actions
  );
end;
$function$;

/*
Controlled actor-scoped creation.
*/
create or replace function public.create_value_object_ontology_v1(
  p_owner_user_id uuid,
  p_owner_actor_id uuid,
  p_created_by_actor_id uuid,
  p_payload jsonb,
  p_idempotency_key text,
  p_request_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_existing_request public.value_object_ontology_write_requests%rowtype;
  v_parent public.value_objects%rowtype;

  v_id uuid := gen_random_uuid();
  v_title text;
  v_description text;
  v_facet_code text;
  v_object_kind_code text;
  v_node_role_code text;
  v_parent_id uuid;
  v_hierarchy_relation_code text;
  v_visibility_code text;
  v_privacy_class_code text;

  v_root_id uuid;
  v_legacy_branch_type_code text;
  v_canonical_key text;
  v_legacy_privacy_level text;
  v_legacy_sensitivity_level text;

  v_response jsonb;
begin
  if p_owner_user_id is null
     or p_owner_actor_id is null
     or p_created_by_actor_id is null then
    raise exception using
      errcode = '22023',
      message = 'P1C_CREATE_ACTOR_CONTEXT_REQUIRED';
  end if;

  if jsonb_typeof(p_payload) <> 'object' then
    raise exception using
      errcode = '22023',
      message = 'P1C_CREATE_PAYLOAD_MUST_BE_OBJECT';
  end if;

  if nullif(btrim(p_idempotency_key), '') is null
     or char_length(p_idempotency_key) not between 8 and 200
     or nullif(btrim(p_request_hash), '') is null
     or p_request_hash !~ '^[A-F0-9]{64}$' then
    raise exception using
      errcode = '22023',
      message = 'P1C_CREATE_IDEMPOTENCY_INVALID';
  end if;

  if not exists (
    select 1
    from public.actor_public_profiles profile
    join public.actors actor
      on actor.id = profile.actor_id
     and actor.status = 'active'
    where profile.owner_user_id = p_owner_user_id
      and profile.actor_id = p_owner_actor_id
  ) then
    raise exception using
      errcode = '42501',
      message = 'P1C_CREATE_ACTOR_NOT_OWNED_BY_USER';
  end if;

  if not exists (
    select 1
    from public.actor_public_profiles profile
    where profile.owner_user_id = p_owner_user_id
      and profile.actor_id = p_created_by_actor_id
  ) then
    raise exception using
      errcode = '42501',
      message = 'P1C_CREATE_CREATOR_NOT_OWNED_BY_USER';
  end if;

  select *
  into v_existing_request
  from public.value_object_ontology_write_requests request
  where request.owner_user_id = p_owner_user_id
    and request.owner_actor_id = p_owner_actor_id
    and request.idempotency_key = p_idempotency_key
  for update;

  if found then
    if v_existing_request.request_hash is distinct from p_request_hash then
      raise exception using
        errcode = '23505',
        message = 'P1C_CREATE_IDEMPOTENCY_PAYLOAD_MISMATCH';
    end if;

    if v_existing_request.value_object_id is not null then
      return public.get_value_object_ontology_card_v1(
        p_owner_user_id,
        p_owner_actor_id,
        v_existing_request.value_object_id
      ) || jsonb_build_object('idempotentReplay', true);
    end if;

    return v_existing_request.response_json
      || jsonb_build_object('idempotentReplay', true);
  end if;

  v_title := nullif(btrim(p_payload ->> 'title'), '');
  v_description := nullif(btrim(p_payload ->> 'description'), '');
  v_facet_code := nullif(btrim(p_payload ->> 'facetCode'), '');
  v_object_kind_code := nullif(btrim(p_payload ->> 'objectKindCode'), '');
  v_node_role_code := nullif(btrim(p_payload ->> 'nodeRoleCode'), '');
  v_hierarchy_relation_code :=
    nullif(btrim(p_payload ->> 'hierarchyRelationCode'), '');
  v_visibility_code :=
    coalesce(nullif(btrim(p_payload ->> 'visibilityCode'), ''), 'private');
  v_privacy_class_code :=
    coalesce(nullif(btrim(p_payload ->> 'privacyClassCode'), ''), 'standard');

  if p_payload ? 'parentValueObjectId'
     and nullif(btrim(p_payload ->> 'parentValueObjectId'), '') is not null then
    begin
      v_parent_id := (p_payload ->> 'parentValueObjectId')::uuid;
    exception when invalid_text_representation then
      raise exception using
        errcode = '22023',
        message = 'P1C_CREATE_PARENT_UUID_INVALID';
    end;
  end if;

  if v_title is null or char_length(v_title) > 180 then
    raise exception using
      errcode = '22023',
      message = 'P1C_CREATE_TITLE_INVALID';
  end if;

  if v_description is null or char_length(v_description) > 4000 then
    raise exception using
      errcode = '22023',
      message = 'P1C_CREATE_DESCRIPTION_INVALID';
  end if;

  if v_node_role_code not in ('root', 'intermediate', 'leaf') then
    raise exception using
      errcode = '22023',
      message = 'P1C_CREATE_NODE_ROLE_INVALID';
  end if;

  if v_visibility_code not in ('private', 'shared', 'public')
     or v_privacy_class_code
          not in ('public_ontology', 'standard', 'sensitive', 'restricted') then
    raise exception using
      errcode = '22023',
      message = 'P1C_CREATE_PRIVACY_INVALID';
  end if;

  if v_node_role_code = 'root' then
    if v_parent_id is not null
       or v_hierarchy_relation_code is not null
       or v_facet_code <> 'DOMAIN'
       or v_object_kind_code <> 'domain_root' then
      raise exception using
        errcode = '23514',
        message = 'P1C_CREATE_ROOT_SHAPE_INVALID';
    end if;

    v_root_id := v_id;
    v_legacy_branch_type_code := 'ontology_v1';
  else
    if v_parent_id is null
       or v_hierarchy_relation_code is null then
      raise exception using
        errcode = '23514',
        message = 'P1C_CREATE_NON_ROOT_PARENT_REQUIRED';
    end if;

    select *
    into v_parent
    from public.value_objects parent
    where parent.id = v_parent_id
    for share;

    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'P1C_CREATE_PARENT_NOT_FOUND';
    end if;

    if v_parent.owner_user_id is distinct from p_owner_user_id
       or v_parent.owner_actor_id is distinct from p_owner_actor_id then
      raise exception using
        errcode = '42501',
        message = 'P1C_CREATE_PARENT_ACCESS_DENIED';
    end if;

    if v_parent.status not in ('draft', 'active')
       or v_parent.ontology_node_role_code not in ('root', 'intermediate')
       or v_parent.canonical_key is null then
      raise exception using
        errcode = '23514',
        message = 'P1C_CREATE_PARENT_NOT_ELIGIBLE';
    end if;

    v_root_id := v_parent.root_value_object_id;
    v_legacy_branch_type_code := v_parent.branch_type_code;
  end if;

  v_canonical_key :=
    'actor.'
    || replace(p_owner_actor_id::text, '-', '')
    || '.'
    || replace(v_id::text, '-', '');

  v_legacy_privacy_level := v_visibility_code;

  v_legacy_sensitivity_level :=
    case v_privacy_class_code
      when 'sensitive' then 'sensitive'
      when 'restricted' then 'restricted'
      else 'standard'
    end;

  insert into public.value_objects (
    id,
    owner_actor_id,
    value_type,
    title,
    description,

    organization_id,
    commercial_usage,
    parent_value_object_id,

    actor_id,
    app_user_id,
    owner_user_id,
    visibility,
    source,
    usage_scope,
    created_by_actor_id,

    object_kind,
    node_role_code,
    branch_type_code,
    root_value_object_id,
    instance_of_value_object_id,

    privacy_level,
    sensitivity_level,

    status,

    canonical_key,
    facet_code,
    object_kind_code,
    ontology_node_role_code,
    hierarchy_relation_code,
    scope_code,
    visibility_code,
    privacy_class_code,
    definition_version,
    origin_type_code,

    metadata_json,
    identity_attributes_json
  )
  values (
    v_id,
    p_owner_actor_id,
    'other',
    v_title,
    v_description,

    null,
    'none',
    v_parent_id,

    p_owner_actor_id,
    p_owner_user_id,
    p_owner_user_id,
    v_visibility_code,
    'manual',
    'private',
    p_created_by_actor_id,

    'other',
    'structural',
    v_legacy_branch_type_code,
    v_root_id,
    null,

    v_legacy_privacy_level,
    v_legacy_sensitivity_level,

    'draft',

    v_canonical_key,
    v_facet_code,
    v_object_kind_code,
    v_node_role_code,
    v_hierarchy_relation_code,
    'actor',
    v_visibility_code,
    v_privacy_class_code,
    1,
    'user_declared',

    jsonb_build_object(
      'authoring_contract', 'P1C_RUNTIME_ONTOLOGY_CREATE_READ_V1',
      'legacy_bridge', true
    ),
    '{}'::jsonb
  );

  v_response := public.get_value_object_ontology_card_v1(
    p_owner_user_id,
    p_owner_actor_id,
    v_id
  );

  insert into public.value_object_ontology_write_requests (
    owner_user_id,
    owner_actor_id,
    idempotency_key,
    request_hash,
    value_object_id,
    response_json
  )
  values (
    p_owner_user_id,
    p_owner_actor_id,
    p_idempotency_key,
    p_request_hash,
    v_id,
    v_response
  );

  return v_response;
end;
$function$;

/*
Lifecycle state only; semantic definition version is unchanged.
*/
create or replace function public.set_value_object_ontology_lifecycle_v1(
  p_owner_user_id uuid,
  p_owner_actor_id uuid,
  p_value_object_id uuid,
  p_new_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_value_object public.value_objects%rowtype;
  v_allowed boolean := false;
begin
  if p_owner_user_id is null
     or p_owner_actor_id is null
     or p_value_object_id is null
     or p_new_status is null then
    raise exception using
      errcode = '22023',
      message = 'P1C_LIFECYCLE_ARGUMENTS_REQUIRED';
  end if;

  if p_new_status not in ('active', 'inactive', 'retired') then
    raise exception using
      errcode = '22023',
      message = 'P1C_LIFECYCLE_STATUS_INVALID';
  end if;

  select *
  into v_value_object
  from public.value_objects value_object
  where value_object.id = p_value_object_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'P1C_LIFECYCLE_VALUE_OBJECT_NOT_FOUND';
  end if;

  if v_value_object.scope_code <> 'actor'
     or v_value_object.owner_user_id is distinct from p_owner_user_id
     or v_value_object.owner_actor_id is distinct from p_owner_actor_id then
    raise exception using
      errcode = '42501',
      message = 'P1C_LIFECYCLE_ACCESS_DENIED';
  end if;

  v_allowed :=
    (v_value_object.status = 'draft' and p_new_status in ('active', 'retired'))
    or (v_value_object.status = 'active' and p_new_status in ('inactive', 'retired'))
    or (v_value_object.status = 'inactive' and p_new_status in ('active', 'retired'));

  if not v_allowed then
    raise exception using
      errcode = '23514',
      message = 'P1C_LIFECYCLE_TRANSITION_FORBIDDEN';
  end if;

  update public.value_objects
  set
    status = p_new_status,
    updated_at = now()
  where id = p_value_object_id;

  return public.get_value_object_ontology_card_v1(
    p_owner_user_id,
    p_owner_actor_id,
    p_value_object_id
  );
end;
$function$;

revoke all on function public.enforce_value_object_ontology_p1c()
  from public, anon, authenticated;

revoke all on function public.write_value_object_definition_snapshot_p1c()
  from public, anon, authenticated;

revoke all on function public.get_value_object_ontology_card_v1(uuid, uuid, uuid)
  from public, anon, authenticated;

revoke all on function public.create_value_object_ontology_v1(
  uuid, uuid, uuid, jsonb, text, text
)
  from public, anon, authenticated;

revoke all on function public.set_value_object_ontology_lifecycle_v1(
  uuid, uuid, uuid, text
)
  from public, anon, authenticated;

grant execute on function public.get_value_object_ontology_card_v1(
  uuid, uuid, uuid
)
  to service_role;

grant execute on function public.create_value_object_ontology_v1(
  uuid, uuid, uuid, jsonb, text, text
)
  to service_role;

grant execute on function public.set_value_object_ontology_lifecycle_v1(
  uuid, uuid, uuid, text
)
  to service_role;

comment on function public.create_value_object_ontology_v1(
  uuid, uuid, uuid, jsonb, text, text
) is
  'P1C controlled actor-scoped root/intermediate/leaf creation without AI. Uses semantic ontology fields and a temporary legacy tree bridge.';

comment on function public.get_value_object_ontology_card_v1(
  uuid, uuid, uuid
) is
  'P1C assembled core Value Object ontology card for an owned actor-scoped object.';

comment on function public.set_value_object_ontology_lifecycle_v1(
  uuid, uuid, uuid, text
) is
  'P1C controlled activate/deactivate/reactivate/retire state transitions. Identity and definition history are preserved.';

commit;
