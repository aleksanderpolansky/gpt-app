/*
ARCTor.app — Goal World Constructor
P2C Value Object Definition Editor v1

Creates:
- value_object_definition_edit_requests
- get_value_object_definition_editor_v1
- edit_value_object_ontology_definition_v1

Alters:
- immutable definition snapshot provenance

Does NOT:
- alter structural parent/root (P2B only)
- alter aliases (P2D)
- alter canonical_key
- alter ontology_node_role_code
- alter facet/object-kind classification
*/

begin;

set local lock_timeout = '5s';
set local statement_timeout = '180s';

do $preflight$
begin
  if to_regclass('public.value_objects') is null
     or to_regclass('public.value_object_definition_versions') is null
     or to_regclass('public.app_users') is null
     or to_regclass('public.actors') is null
     or to_regclass('public.actor_public_profiles') is null then
    raise exception using
      errcode='42P01',
      message='P2C_REQUIRED_TABLES_MISSING';
  end if;

  if to_regprocedure(
    'public.get_value_object_structure_card_v1(uuid,uuid,uuid)'
  ) is null
     or to_regprocedure(
       'public.preview_value_object_tree_restructure_v2(uuid,uuid,uuid,text,jsonb)'
     ) is null then
    raise exception using
      errcode='42883',
      message='P2C_P2A_OR_P2B_NOT_INSTALLED';
  end if;

  if to_regclass('public.value_object_definition_edit_requests') is not null
     or to_regprocedure(
       'public.edit_value_object_ontology_definition_v1(uuid,uuid,uuid,uuid,text,jsonb,text,text)'
     ) is not null then
    raise exception using
      errcode='23514',
      message='P2C_ALREADY_INSTALLED_OR_PARTIALLY_APPLIED';
  end if;

  if (select count(*) from public.value_objects) <> 15
     or (select count(*) from public.value_object_definition_versions) <> 15
     or (select count(*) from public.value_object_tree_operations) <> 0
     or (select count(*) from public.value_object_tree_operation_items) <> 0 then
    raise exception using
      errcode='23514',
      message='P2C_BASELINE_CHANGED';
  end if;
end;
$preflight$;

create table public.value_object_definition_edit_requests (
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

  value_object_id uuid not null
    references public.value_objects(id)
    on delete restrict,

  edit_kind text not null,
  idempotency_key text not null,
  request_hash text not null,
  request_patch jsonb not null default '{}'::jsonb,

  before_definition_version integer not null,
  after_definition_version integer,

  response_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint value_object_definition_edit_requests_kind_check
    check (edit_kind in ('rename','semantic_definition')),

  constraint value_object_definition_edit_requests_key_check
    check (char_length(idempotency_key) between 8 and 200),

  constraint value_object_definition_edit_requests_hash_check
    check (request_hash ~ '^[A-F0-9]{64}$'),

  constraint value_object_definition_edit_requests_patch_check
    check (jsonb_typeof(request_patch)='object'),

  constraint value_object_definition_edit_requests_response_check
    check (jsonb_typeof(response_json)='object'),

  constraint value_object_definition_edit_requests_unique
    unique (owner_user_id,owner_actor_id,idempotency_key)
);

create index value_object_definition_edit_requests_object_idx
  on public.value_object_definition_edit_requests(
    value_object_id,
    created_at desc
  );

alter table public.value_object_definition_edit_requests
  enable row level security;

revoke all on table public.value_object_definition_edit_requests
  from public,anon,authenticated;

grant select,insert,update
  on table public.value_object_definition_edit_requests
  to service_role;

create policy value_object_definition_edit_requests_no_direct_v1
on public.value_object_definition_edit_requests
for all
to anon,authenticated
using (false)
with check (false);

create or replace function public.get_value_object_definition_editor_v1(
  p_owner_user_id uuid,
  p_owner_actor_id uuid,
  p_value_object_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $function$
declare
  v_value_object public.value_objects%rowtype;
  v_latest public.value_object_definition_versions%rowtype;
  v_can_edit boolean := false;
begin
  if p_owner_user_id is null
     or p_owner_actor_id is null
     or p_value_object_id is null then
    raise exception using
      errcode='22023',
      message='P2C_EDITOR_IDENTIFIERS_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.actor_public_profiles profile
    join public.actors actor
      on actor.id=profile.actor_id
     and actor.status='active'
    where profile.owner_user_id=p_owner_user_id
      and profile.actor_id=p_owner_actor_id
  ) then
    raise exception using
      errcode='42501',
      message='P2C_ACTOR_NOT_OWNED_BY_USER';
  end if;

  select *
  into v_value_object
  from public.value_objects value_object
  where value_object.id=p_value_object_id;

  if not found then
    raise exception using
      errcode='P0002',
      message='P2C_VALUE_OBJECT_NOT_FOUND';
  end if;

  if v_value_object.scope_code <> 'actor'
     or v_value_object.owner_user_id is distinct from p_owner_user_id
     or v_value_object.owner_actor_id is distinct from p_owner_actor_id then
    raise exception using
      errcode='42501',
      message='P2C_VALUE_OBJECT_ACCESS_DENIED';
  end if;

  if v_value_object.canonical_key is null
     or v_value_object.facet_code is null
     or v_value_object.object_kind_code is null
     or v_value_object.ontology_node_role_code
          not in ('root','intermediate','leaf')
     or v_value_object.definition_version is null then
    raise exception using
      errcode='23514',
      message='P2C_VALUE_OBJECT_NOT_ONTOLOGY_READY';
  end if;

  select *
  into v_latest
  from public.value_object_definition_versions definition
  where definition.value_object_id=v_value_object.id
  order by definition.version desc
  limit 1;

  v_can_edit :=
    v_value_object.status in ('draft','active','inactive');

  return jsonb_build_object(
    'ok',true,
    'contractVersion','P2C_VALUE_OBJECT_DEFINITION_EDITOR_V1',
    'valueObject',jsonb_build_object(
      'id',v_value_object.id,
      'canonicalKey',v_value_object.canonical_key,
      'title',v_value_object.title,
      'description',v_value_object.description,
      'facetCode',v_value_object.facet_code,
      'objectKindCode',v_value_object.object_kind_code,
      'nodeRoleCode',v_value_object.ontology_node_role_code,
      'parentValueObjectId',v_value_object.parent_value_object_id,
      'rootValueObjectId',v_value_object.root_value_object_id,
      'hierarchyRelationCode',v_value_object.hierarchy_relation_code,
      'statusCode',v_value_object.status,
      'visibilityCode',v_value_object.visibility_code,
      'privacyClassCode',v_value_object.privacy_class_code,
      'definitionVersion',v_value_object.definition_version
    ),
    'permissions',jsonb_build_object(
      'actorOwner',true,
      'canRename',v_can_edit,
      'canEditSemanticDefinition',v_can_edit,
      'canEditStructureThroughP2C',false,
      'canManageAliasesThroughP2C',false,
      'platformAdminOverride',false
    ),
    'versionProvenance',jsonb_build_object(
      'latestVersion',v_value_object.definition_version,
      'latestSourceContext',v_latest.source_context,
      'latestCreatedAt',v_latest.created_at
    )
  );
end;
$function$;

create or replace function public.write_value_object_definition_snapshot_p1c()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_request_id uuid;
  v_request public.value_object_definition_edit_requests%rowtype;
  v_source_context text := 'P1C_RUNTIME_ONTOLOGY_CREATE_READ_V1';
  v_provenance jsonb := '{}'::jsonb;
begin
  if new.canonical_key is null
     or new.definition_version is null then
    return new;
  end if;

  if tg_op='UPDATE'
     and new.definition_version=old.definition_version then
    return new;
  end if;

  begin
    v_request_id :=
      nullif(
        current_setting('arctor.p2c_definition_edit_request_id',true),
        ''
      )::uuid;
  exception when invalid_text_representation then
    v_request_id := null;
  end;

  if v_request_id is not null then
    select *
    into v_request
    from public.value_object_definition_edit_requests edit_request
    where edit_request.id=v_request_id
      and edit_request.value_object_id=new.id;

    if found then
      v_source_context :=
        case v_request.edit_kind
          when 'rename' then 'P2C_RENAME_V1'
          else 'P2C_SEMANTIC_DEFINITION_EDIT_V1'
        end;

      v_provenance := jsonb_build_object(
        'editRequestId',v_request.id,
        'editKind',v_request.edit_kind,
        'ownerUserId',v_request.owner_user_id,
        'ownerActorId',v_request.owner_actor_id,
        'editedByActorId',v_request.created_by_actor_id
      );
    end if;
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
      'contract','P1C_RUNTIME_ONTOLOGY_CREATE_READ_V1',
      'legacy_bridge',jsonb_build_object(
        'object_kind',new.object_kind,
        'node_role_code',new.node_role_code,
        'branch_type_code',new.branch_type_code
      ),
      'versionProvenance',v_provenance
    ),
    v_source_context
  );

  return new;
end;
$function$;

create or replace function public.edit_value_object_ontology_definition_v1(
  p_owner_user_id uuid,
  p_owner_actor_id uuid,
  p_created_by_actor_id uuid,
  p_value_object_id uuid,
  p_edit_kind text,
  p_patch jsonb,
  p_idempotency_key text,
  p_request_hash text
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_existing public.value_object_definition_edit_requests%rowtype;
  v_request public.value_object_definition_edit_requests%rowtype;
  v_before public.value_objects%rowtype;
  v_after public.value_objects%rowtype;

  v_new_title text;
  v_new_description text;
  v_new_relation text;
  v_new_visibility text;
  v_new_privacy text;

  v_state_already_satisfied boolean := false;
  v_response jsonb;
begin
  if p_owner_user_id is null
     or p_owner_actor_id is null
     or p_created_by_actor_id is null
     or p_value_object_id is null then
    raise exception using
      errcode='22023',
      message='P2C_EDIT_IDENTIFIERS_REQUIRED';
  end if;

  if p_edit_kind not in ('rename','semantic_definition') then
    raise exception using
      errcode='22023',
      message='P2C_EDIT_KIND_INVALID';
  end if;

  if jsonb_typeof(p_patch) <> 'object'
     or p_patch='{}'::jsonb then
    raise exception using
      errcode='22023',
      message='P2C_PATCH_INVALID';
  end if;

  if nullif(btrim(p_idempotency_key),'') is null
     or char_length(p_idempotency_key) not between 8 and 200
     or p_request_hash !~ '^[A-F0-9]{64}$' then
    raise exception using
      errcode='22023',
      message='P2C_IDEMPOTENCY_OR_HASH_INVALID';
  end if;

  if not exists (
    select 1
    from public.actor_public_profiles profile
    join public.actors actor
      on actor.id=profile.actor_id
     and actor.status='active'
    where profile.owner_user_id=p_owner_user_id
      and profile.actor_id=p_owner_actor_id
  ) or not exists (
    select 1
    from public.actor_public_profiles profile
    join public.actors actor
      on actor.id=profile.actor_id
     and actor.status='active'
    where profile.owner_user_id=p_owner_user_id
      and profile.actor_id=p_created_by_actor_id
  ) then
    raise exception using
      errcode='42501',
      message='P2C_ACTOR_NOT_OWNED_BY_USER';
  end if;

  select *
  into v_existing
  from public.value_object_definition_edit_requests request
  where request.owner_user_id=p_owner_user_id
    and request.owner_actor_id=p_owner_actor_id
    and request.idempotency_key=p_idempotency_key
  for update;

  if found then
    if v_existing.value_object_id is distinct from p_value_object_id
       or v_existing.edit_kind is distinct from p_edit_kind
       or v_existing.request_hash is distinct from p_request_hash then
      raise exception using
        errcode='23505',
        message='P2C_IDEMPOTENCY_PAYLOAD_MISMATCH';
    end if;

    return jsonb_set(
      v_existing.response_json,
      '{idempotentReplay}',
      'true'::jsonb,
      true
    );
  end if;

  select *
  into v_before
  from public.value_objects value_object
  where value_object.id=p_value_object_id
  for update;

  if not found then
    raise exception using
      errcode='P0002',
      message='P2C_VALUE_OBJECT_NOT_FOUND';
  end if;

  if v_before.scope_code <> 'actor'
     or v_before.owner_user_id is distinct from p_owner_user_id
     or v_before.owner_actor_id is distinct from p_owner_actor_id then
    raise exception using
      errcode='42501',
      message='P2C_VALUE_OBJECT_ACCESS_DENIED';
  end if;

  if v_before.canonical_key is null
     or v_before.facet_code is null
     or v_before.object_kind_code is null
     or v_before.ontology_node_role_code
          not in ('root','intermediate','leaf')
     or v_before.definition_version is null then
    raise exception using
      errcode='23514',
      message='P2C_VALUE_OBJECT_NOT_ONTOLOGY_READY';
  end if;

  if v_before.status not in ('draft','active','inactive') then
    raise exception using
      errcode='23514',
      message='P2C_STATUS_NOT_EDITABLE';
  end if;

  if p_edit_kind='rename' then
    if exists (
      select 1
      from jsonb_object_keys(p_patch) key_name
      where key_name <> 'title'
    ) or not (p_patch ? 'title') then
      raise exception using
        errcode='22023',
        message='P2C_RENAME_ACCEPTS_TITLE_ONLY';
    end if;

    if jsonb_typeof(p_patch -> 'title') <> 'string' then
      raise exception using
        errcode='22023',
        message='P2C_TITLE_MUST_BE_STRING';
    end if;

    v_new_title := nullif(btrim(p_patch ->> 'title'),'');

    if v_new_title is null
       or char_length(v_new_title) > 180 then
      raise exception using
        errcode='22023',
        message='P2C_TITLE_INVALID';
    end if;

    v_state_already_satisfied :=
      v_before.title is not distinct from v_new_title;

  else
    if exists (
      select 1
      from jsonb_object_keys(p_patch) key_name
      where key_name not in (
        'description',
        'hierarchyRelationCode',
        'visibilityCode',
        'privacyClassCode'
      )
    ) then
      raise exception using
        errcode='22023',
        message='P2C_SEMANTIC_PATCH_KEY_FORBIDDEN';
    end if;

    if p_patch ? 'description' then
      if jsonb_typeof(p_patch -> 'description') not in ('string','null') then
        raise exception using
          errcode='22023',
          message='P2C_DESCRIPTION_INVALID';
      end if;

      if jsonb_typeof(p_patch -> 'description')='null' then
        v_new_description := null;
      else
        v_new_description := nullif(btrim(p_patch ->> 'description'),'');
      end if;

      if v_new_description is not null
         and char_length(v_new_description) > 4000 then
        raise exception using
          errcode='22023',
          message='P2C_DESCRIPTION_TOO_LONG';
      end if;
    else
      v_new_description := v_before.description;
    end if;

    if p_patch ? 'hierarchyRelationCode' then
      if v_before.ontology_node_role_code='root' then
        raise exception using
          errcode='23514',
          message='P2C_ROOT_HAS_NO_HIERARCHY_RELATION';
      end if;

      if jsonb_typeof(p_patch -> 'hierarchyRelationCode') <> 'string' then
        raise exception using
          errcode='22023',
          message='P2C_HIERARCHY_RELATION_INVALID';
      end if;

      v_new_relation :=
        nullif(btrim(p_patch ->> 'hierarchyRelationCode'),'');

      if v_new_relation not in (
        'is_a',
        'part_of',
        'aspect_of',
        'subprocess_of'
      ) then
        raise exception using
          errcode='22023',
          message='P2C_HIERARCHY_RELATION_INVALID';
      end if;
    else
      v_new_relation := v_before.hierarchy_relation_code;
    end if;

    if p_patch ? 'visibilityCode' then
      if jsonb_typeof(p_patch -> 'visibilityCode') <> 'string' then
        raise exception using
          errcode='22023',
          message='P2C_VISIBILITY_INVALID';
      end if;

      v_new_visibility :=
        nullif(btrim(p_patch ->> 'visibilityCode'),'');

      if v_new_visibility not in ('private','shared','public') then
        raise exception using
          errcode='22023',
          message='P2C_VISIBILITY_INVALID';
      end if;
    else
      v_new_visibility := v_before.visibility_code;
    end if;

    if p_patch ? 'privacyClassCode' then
      if jsonb_typeof(p_patch -> 'privacyClassCode') <> 'string' then
        raise exception using
          errcode='22023',
          message='P2C_PRIVACY_INVALID';
      end if;

      v_new_privacy :=
        nullif(btrim(p_patch ->> 'privacyClassCode'),'');

      if v_new_privacy not in (
        'public_ontology',
        'standard',
        'sensitive',
        'restricted'
      ) then
        raise exception using
          errcode='22023',
          message='P2C_PRIVACY_INVALID';
      end if;
    else
      v_new_privacy := v_before.privacy_class_code;
    end if;

    v_state_already_satisfied :=
      v_before.description is not distinct from v_new_description
      and v_before.hierarchy_relation_code
            is not distinct from v_new_relation
      and v_before.visibility_code
            is not distinct from v_new_visibility
      and v_before.privacy_class_code
            is not distinct from v_new_privacy;
  end if;

  insert into public.value_object_definition_edit_requests (
    owner_user_id,
    owner_actor_id,
    created_by_actor_id,
    value_object_id,
    edit_kind,
    idempotency_key,
    request_hash,
    request_patch,
    before_definition_version
  )
  values (
    p_owner_user_id,
    p_owner_actor_id,
    p_created_by_actor_id,
    p_value_object_id,
    p_edit_kind,
    p_idempotency_key,
    p_request_hash,
    p_patch,
    v_before.definition_version
  )
  returning * into v_request;

  perform set_config(
    'arctor.p2c_definition_edit_request_id',
    v_request.id::text,
    true
  );

  if not v_state_already_satisfied then
    if p_edit_kind='rename' then
      update public.value_objects
      set
        title=v_new_title,
        updated_at=clock_timestamp()
      where id=v_before.id;
    else
      update public.value_objects
      set
        description=v_new_description,
        hierarchy_relation_code=v_new_relation,
        visibility_code=v_new_visibility,
        privacy_class_code=v_new_privacy,
        updated_at=clock_timestamp()
      where id=v_before.id;
    end if;
  end if;

  select *
  into v_after
  from public.value_objects value_object
  where value_object.id=v_before.id;

  v_response := jsonb_build_object(
    'ok',true,
    'contractVersion','P2C_VALUE_OBJECT_DEFINITION_EDITOR_V1',
    'idempotentReplay',false,
    'stateAlreadySatisfied',v_state_already_satisfied,
    'editRequestId',v_request.id,
    'editKind',p_edit_kind,
    'valueObjectId',v_before.id,
    'beforeDefinitionVersion',v_before.definition_version,
    'afterDefinitionVersion',v_after.definition_version,
    'definitionVersionChanged',
      v_after.definition_version <> v_before.definition_version,
    'sourceContext',
      case p_edit_kind
        when 'rename' then 'P2C_RENAME_V1'
        else 'P2C_SEMANTIC_DEFINITION_EDIT_V1'
      end,
    'editor',
      public.get_value_object_definition_editor_v1(
        p_owner_user_id,
        p_owner_actor_id,
        v_before.id
      )
  );

  update public.value_object_definition_edit_requests
  set
    after_definition_version=v_after.definition_version,
    response_json=v_response
  where id=v_request.id;

  return v_response;
end;
$function$;

revoke all on function public.get_value_object_definition_editor_v1(
  uuid,uuid,uuid
) from public,anon,authenticated;

revoke all on function public.edit_value_object_ontology_definition_v1(
  uuid,uuid,uuid,uuid,text,jsonb,text,text
) from public,anon,authenticated;

grant execute on function public.get_value_object_definition_editor_v1(
  uuid,uuid,uuid
) to service_role;

grant execute on function public.edit_value_object_ontology_definition_v1(
  uuid,uuid,uuid,uuid,text,jsonb,text,text
) to service_role;

comment on table public.value_object_definition_edit_requests is
  'P2C idempotency and provenance ledger for owner-scoped primary rename and semantic-definition edits.';

comment on function public.edit_value_object_ontology_definition_v1(
  uuid,uuid,uuid,uuid,text,jsonb,text,text
) is
  'P2C owner-scoped semantic definition write boundary. Does not move tree structure and does not manage aliases.';

commit;
