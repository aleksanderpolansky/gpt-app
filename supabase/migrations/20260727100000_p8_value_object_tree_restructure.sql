-- ARCTor.app
-- P8 controlled Value Object tree restructuring.
-- Additive migration: preview, atomic reparent/insert-intermediate, audit and guarded rollback.
-- No semantic relations, project planning, activity, fact, analytics or AI writes.

begin;

create extension if not exists pgcrypto;

do $preflight$
begin
  if to_regclass('public.value_objects') is null
     or to_regclass('public.app_users') is null
     or to_regclass('public.actors') is null
     or to_regclass('public.actor_public_profiles') is null then
    raise exception using
      errcode = '42P01',
      message = 'P8_REQUIRED_TABLES_MISSING';
  end if;

  if to_regprocedure('public.enforce_value_object_tree_v2()') is null then
    raise exception using
      errcode = '42883',
      message = 'P8_TREE_V2_GUARD_MISSING';
  end if;
end;
$preflight$;

create table if not exists public.value_object_tree_operations (
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

  operation_type text not null,
  status text not null default 'applying',

  target_value_object_id uuid
    references public.value_objects(id)
    on delete set null,

  target_value_object_id_snapshot uuid not null,

  source_parent_value_object_id uuid
    references public.value_objects(id)
    on delete set null,

  source_parent_value_object_id_snapshot uuid,

  destination_parent_value_object_id uuid
    references public.value_objects(id)
    on delete set null,

  destination_parent_value_object_id_snapshot uuid,

  created_value_object_id uuid
    references public.value_objects(id)
    on delete set null,

  created_value_object_id_snapshot uuid,

  rollback_of_operation_id uuid
    references public.value_object_tree_operations(id)
    on delete restrict,

  idempotency_key text not null,
  request_hash text not null,
  preview_hash text not null,
  request_payload jsonb not null default '{}'::jsonb,
  before_snapshot jsonb not null default '{}'::jsonb,
  after_snapshot jsonb not null default '{}'::jsonb,
  response_json jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  applied_at timestamptz,
  rolled_back_at timestamptz,

  constraint value_object_tree_operations_type_check
    check (operation_type in ('reparent', 'insert_intermediate', 'rollback')),

  constraint value_object_tree_operations_status_check
    check (status in ('applying', 'applied', 'rolled_back', 'failed')),

  constraint value_object_tree_operations_idempotency_key_check
    check (char_length(idempotency_key) between 8 and 200),

  constraint value_object_tree_operations_request_hash_check
    check (request_hash ~ '^[A-F0-9]{64}$'),

  constraint value_object_tree_operations_preview_hash_check
    check (preview_hash ~ '^[A-F0-9]{64}$'),

  constraint value_object_tree_operations_payload_check
    check (jsonb_typeof(request_payload) = 'object'),

  constraint value_object_tree_operations_before_check
    check (jsonb_typeof(before_snapshot) = 'object'),

  constraint value_object_tree_operations_after_check
    check (jsonb_typeof(after_snapshot) = 'object'),

  constraint value_object_tree_operations_response_check
    check (jsonb_typeof(response_json) = 'object'),

  constraint value_object_tree_operations_idempotency_unique
    unique (owner_user_id, owner_actor_id, idempotency_key)
);

create table if not exists public.value_object_tree_operation_items (
  id uuid primary key default gen_random_uuid(),

  operation_id uuid not null
    references public.value_object_tree_operations(id)
    on delete cascade,

  value_object_id uuid
    references public.value_objects(id)
    on delete set null,

  value_object_id_snapshot uuid not null,
  item_role text not null,
  depth integer not null default 0,

  before_parent_value_object_id uuid,
  before_root_value_object_id uuid,
  before_branch_type_code text,
  before_updated_at timestamptz,

  after_parent_value_object_id uuid,
  after_root_value_object_id uuid,
  after_branch_type_code text,
  after_updated_at timestamptz,

  before_snapshot jsonb not null default '{}'::jsonb,
  after_snapshot jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint value_object_tree_operation_items_role_check
    check (
      item_role in (
        'target',
        'descendant',
        'selected_child',
        'selected_descendant',
        'created_intermediate'
      )
    ),

  constraint value_object_tree_operation_items_depth_check
    check (depth >= 0),

  constraint value_object_tree_operation_items_before_check
    check (jsonb_typeof(before_snapshot) = 'object'),

  constraint value_object_tree_operation_items_after_check
    check (jsonb_typeof(after_snapshot) = 'object'),

  constraint value_object_tree_operation_items_unique
    unique (operation_id, value_object_id_snapshot)
);

create index if not exists value_object_tree_operations_owner_idx
  on public.value_object_tree_operations(
    owner_user_id,
    owner_actor_id,
    created_at desc
  );

create index if not exists value_object_tree_operations_target_idx
  on public.value_object_tree_operations(
    target_value_object_id_snapshot,
    created_at desc
  );

create index if not exists value_object_tree_operation_items_object_idx
  on public.value_object_tree_operation_items(
    value_object_id_snapshot,
    created_at desc
  );

alter table public.value_object_tree_operations enable row level security;
alter table public.value_object_tree_operation_items enable row level security;

revoke all on public.value_object_tree_operations
  from public, anon, authenticated;
revoke all on public.value_object_tree_operation_items
  from public, anon, authenticated;

grant select, insert, update on public.value_object_tree_operations
  to service_role;
grant select, insert, update, delete on public.value_object_tree_operation_items
  to service_role;

create policy value_object_tree_operations_no_direct_v1
on public.value_object_tree_operations
for all
to anon, authenticated
using (false)
with check (false);

create policy value_object_tree_operation_items_no_direct_v1
on public.value_object_tree_operation_items
for all
to anon, authenticated
using (false)
with check (false);

create or replace function public.p8_value_object_tree_node_json(
  p_value_object_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select jsonb_build_object(
    'id', value_object.id,
    'title', value_object.title,
    'parentValueObjectId', value_object.parent_value_object_id,
    'rootValueObjectId', value_object.root_value_object_id,
    'branchTypeCode', value_object.branch_type_code,
    'nodeRoleCode', value_object.node_role_code,
    'objectKind', value_object.object_kind,
    'status', value_object.status
  )
  from public.value_objects value_object
  where value_object.id = p_value_object_id;
$function$;

create or replace function public.p8_value_object_tree_path_json(
  p_owner_user_id uuid,
  p_owner_actor_id uuid,
  p_value_object_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  with recursive ancestors as (
    select
      value_object.id,
      value_object.title,
      value_object.parent_value_object_id,
      value_object.root_value_object_id,
      value_object.branch_type_code,
      value_object.node_role_code,
      value_object.object_kind,
      value_object.status,
      0 as depth
    from public.value_objects value_object
    where value_object.id = p_value_object_id
      and value_object.owner_user_id = p_owner_user_id
      and value_object.owner_actor_id = p_owner_actor_id

    union all

    select
      parent.id,
      parent.title,
      parent.parent_value_object_id,
      parent.root_value_object_id,
      parent.branch_type_code,
      parent.node_role_code,
      parent.object_kind,
      parent.status,
      child.depth + 1
    from public.value_objects parent
    join ancestors child
      on parent.id = child.parent_value_object_id
    where parent.owner_user_id = p_owner_user_id
      and parent.owner_actor_id = p_owner_actor_id
      and child.depth < 200
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', ancestor.id,
        'title', ancestor.title,
        'parentValueObjectId', ancestor.parent_value_object_id,
        'rootValueObjectId', ancestor.root_value_object_id,
        'branchTypeCode', ancestor.branch_type_code,
        'nodeRoleCode', ancestor.node_role_code,
        'objectKind', ancestor.object_kind,
        'status', ancestor.status
      )
      order by ancestor.depth desc
    ),
    '[]'::jsonb
  )
  from ancestors ancestor;
$function$;

create or replace function public.preview_value_object_tree_restructure_v1(
  p_owner_user_id uuid,
  p_owner_actor_id uuid,
  p_target_value_object_id uuid,
  p_mode text,
  p_payload jsonb
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
declare
  v_target public.value_objects%rowtype;
  v_source_parent public.value_objects%rowtype;
  v_destination_parent public.value_objects%rowtype;
  v_new_parent_id uuid;
  v_new_root_id uuid;
  v_child_ids uuid[];
  v_child_count integer;
  v_distinct_child_count integer;
  v_title text;
  v_description text;
  v_object_kind text;
  v_old_path jsonb;
  v_new_path jsonb;
  v_affected jsonb;
  v_selected_children jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
  v_preview_material jsonb;
  v_preview_hash text;
  v_state_already_satisfied boolean := false;
begin
  if p_owner_user_id is null
     or p_owner_actor_id is null
     or p_target_value_object_id is null then
    raise exception using
      errcode = '22023',
      message = 'P8_REQUIRED_IDENTIFIERS_MISSING';
  end if;

  if p_mode not in ('reparent', 'insert_intermediate') then
    raise exception using
      errcode = '22023',
      message = 'P8_MODE_INVALID';
  end if;

  if jsonb_typeof(p_payload) <> 'object' then
    raise exception using
      errcode = '22023',
      message = 'P8_PAYLOAD_MUST_BE_OBJECT';
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
      message = 'P8_ACTOR_NOT_OWNED_BY_USER';
  end if;

  select *
  into v_target
  from public.value_objects value_object
  where value_object.id = p_target_value_object_id;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'P8_TARGET_NOT_FOUND';
  end if;

  if v_target.owner_user_id is distinct from p_owner_user_id
     or v_target.owner_actor_id is distinct from p_owner_actor_id then
    raise exception using
      errcode = '42501',
      message = 'P8_TARGET_OWNER_MISMATCH';
  end if;

  if v_target.node_role_code not in ('structural', 'activity_leaf')
     or v_target.branch_type_code is null
     or v_target.root_value_object_id is null
     or v_target.object_kind is null then
    raise exception using
      errcode = '23514',
      message = 'P8_TARGET_REQUIRES_V2_TREE_IDENTITY';
  end if;

  if v_target.parent_value_object_id is not null then
    select *
    into v_source_parent
    from public.value_objects value_object
    where value_object.id = v_target.parent_value_object_id;
  end if;

  v_old_path := public.p8_value_object_tree_path_json(
    p_owner_user_id,
    p_owner_actor_id,
    p_target_value_object_id
  );

  if p_mode = 'reparent' then
    if p_payload ? 'newParentValueObjectId'
       and nullif(p_payload ->> 'newParentValueObjectId', '') is not null then
      begin
        v_new_parent_id := (p_payload ->> 'newParentValueObjectId')::uuid;
      exception when invalid_text_representation then
        raise exception using
          errcode = '22023',
          message = 'P8_NEW_PARENT_ID_INVALID';
      end;
    else
      v_new_parent_id := null;
    end if;

    if v_new_parent_id is null then
      if v_target.node_role_code <> 'structural' then
        raise exception using
          errcode = '23514',
          message = 'P8_ONLY_STRUCTURAL_CAN_BECOME_ROOT';
      end if;

      v_new_root_id := v_target.id;
      v_new_path := jsonb_build_array(
        jsonb_build_object(
          'id', v_target.id,
          'title', v_target.title,
          'parentValueObjectId', null,
          'rootValueObjectId', v_target.id,
          'branchTypeCode', v_target.branch_type_code,
          'nodeRoleCode', v_target.node_role_code,
          'objectKind', v_target.object_kind,
          'status', v_target.status
        )
      );
    else
      if v_new_parent_id = v_target.id then
        raise exception using
          errcode = '23514',
          message = 'P8_PARENT_CANNOT_REFERENCE_TARGET';
      end if;

      select *
      into v_destination_parent
      from public.value_objects value_object
      where value_object.id = v_new_parent_id;

      if not found then
        raise exception using
          errcode = 'P0002',
          message = 'P8_DESTINATION_PARENT_NOT_FOUND';
      end if;

      if v_destination_parent.owner_user_id is distinct from p_owner_user_id
         or v_destination_parent.owner_actor_id is distinct from p_owner_actor_id then
        raise exception using
          errcode = '42501',
          message = 'P8_DESTINATION_PARENT_OWNER_MISMATCH';
      end if;

      if v_destination_parent.node_role_code <> 'structural'
         or v_destination_parent.root_value_object_id is null
         or v_destination_parent.branch_type_code is null then
        raise exception using
          errcode = '23514',
          message = 'P8_DESTINATION_PARENT_MUST_BE_STRUCTURAL';
      end if;

      if v_destination_parent.branch_type_code <> v_target.branch_type_code then
        raise exception using
          errcode = '23514',
          message = 'P8_CROSS_BRANCH_MOVE_FORBIDDEN';
      end if;

      if exists (
        with recursive subtree as (
          select value_object.id
          from public.value_objects value_object
          where value_object.id = v_target.id

          union all

          select child.id
          from public.value_objects child
          join subtree parent
            on child.parent_value_object_id = parent.id
          where child.owner_user_id = p_owner_user_id
            and child.owner_actor_id = p_owner_actor_id
        )
        select 1
        from subtree
        where id = v_new_parent_id
      ) then
        raise exception using
          errcode = '23514',
          message = 'P8_CYCLE_FORBIDDEN';
      end if;

      v_new_root_id := v_destination_parent.root_value_object_id;
      v_new_path :=
        public.p8_value_object_tree_path_json(
          p_owner_user_id,
          p_owner_actor_id,
          v_destination_parent.id
        ) ||
        jsonb_build_array(
          jsonb_build_object(
            'id', v_target.id,
            'title', v_target.title,
            'parentValueObjectId', v_destination_parent.id,
            'rootValueObjectId', v_new_root_id,
            'branchTypeCode', v_target.branch_type_code,
            'nodeRoleCode', v_target.node_role_code,
            'objectKind', v_target.object_kind,
            'status', v_target.status
          )
        );
    end if;

    with recursive subtree as (
      select
        value_object.id,
        value_object.title,
        value_object.parent_value_object_id,
        value_object.root_value_object_id,
        value_object.branch_type_code,
        value_object.node_role_code,
        value_object.object_kind,
        value_object.status,
        value_object.updated_at,
        0 as depth
      from public.value_objects value_object
      where value_object.id = v_target.id
        and value_object.owner_user_id = p_owner_user_id
        and value_object.owner_actor_id = p_owner_actor_id

      union all

      select
        child.id,
        child.title,
        child.parent_value_object_id,
        child.root_value_object_id,
        child.branch_type_code,
        child.node_role_code,
        child.object_kind,
        child.status,
        child.updated_at,
        parent.depth + 1
      from public.value_objects child
      join subtree parent
        on child.parent_value_object_id = parent.id
      where child.owner_user_id = p_owner_user_id
        and child.owner_actor_id = p_owner_actor_id
        and parent.depth < 200
    )
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', subtree.id,
          'title', subtree.title,
          'parentValueObjectId', subtree.parent_value_object_id,
          'rootValueObjectId', subtree.root_value_object_id,
          'branchTypeCode', subtree.branch_type_code,
          'nodeRoleCode', subtree.node_role_code,
          'objectKind', subtree.object_kind,
          'status', subtree.status,
          'depth', subtree.depth,
          'updatedAt', subtree.updated_at
        )
        order by subtree.depth, subtree.id
      ),
      '[]'::jsonb
    )
    into v_affected
    from subtree;

    v_state_already_satisfied :=
      v_target.parent_value_object_id is not distinct from v_new_parent_id
      and v_target.root_value_object_id is not distinct from v_new_root_id;

    if jsonb_array_length(v_affected) > 1 then
      v_warnings := v_warnings || jsonb_build_array(
        'The selected object has descendants. Their structural path and root context will move atomically with the target.'
      );
    end if;

    v_preview_material := jsonb_build_object(
      'mode', p_mode,
      'targetId', v_target.id,
      'newParentId', v_new_parent_id,
      'newRootId', v_new_root_id,
      'targetParentId', v_target.parent_value_object_id,
      'targetRootId', v_target.root_value_object_id,
      'branchTypeCode', v_target.branch_type_code,
      'affected', v_affected
    );

  else
    if v_target.node_role_code <> 'structural' then
      raise exception using
        errcode = '23514',
        message = 'P8_INSERT_PARENT_MUST_BE_STRUCTURAL';
    end if;

    if jsonb_typeof(p_payload -> 'childValueObjectIds') <> 'array' then
      raise exception using
        errcode = '22023',
        message = 'P8_CHILD_IDS_MUST_BE_ARRAY';
    end if;

    begin
      select coalesce(array_agg(value::uuid order by value::uuid), array[]::uuid[])
      into v_child_ids
      from jsonb_array_elements_text(p_payload -> 'childValueObjectIds') element(value);
    exception when invalid_text_representation then
      raise exception using
        errcode = '22023',
        message = 'P8_CHILD_ID_INVALID';
    end;

    v_child_count := coalesce(cardinality(v_child_ids), 0);

    select count(distinct child_id)
    into v_distinct_child_count
    from unnest(v_child_ids) child_id;

    if v_child_count = 0 or v_child_count <> v_distinct_child_count then
      raise exception using
        errcode = '22023',
        message = 'P8_CHILD_IDS_EMPTY_OR_DUPLICATED';
    end if;

    v_title := nullif(btrim(p_payload ->> 'title'), '');
    v_description := nullif(btrim(p_payload ->> 'description'), '');
    v_object_kind := nullif(btrim(p_payload ->> 'objectKind'), '');

    if v_title is null or char_length(v_title) > 180 then
      raise exception using
        errcode = '22023',
        message = 'P8_INTERMEDIATE_TITLE_INVALID';
    end if;

    if v_description is not null and char_length(v_description) > 4000 then
      raise exception using
        errcode = '22023',
        message = 'P8_INTERMEDIATE_DESCRIPTION_INVALID';
    end if;

    if v_object_kind is null or v_object_kind = 'activity_pattern' then
      raise exception using
        errcode = '22023',
        message = 'P8_INTERMEDIATE_OBJECT_KIND_INVALID';
    end if;

    if exists (
      select 1
      from unnest(v_child_ids) selected(id)
      left join public.value_objects child
        on child.id = selected.id
      where child.id is null
         or child.owner_user_id is distinct from p_owner_user_id
         or child.owner_actor_id is distinct from p_owner_actor_id
         or child.parent_value_object_id is distinct from v_target.id
         or child.branch_type_code is distinct from v_target.branch_type_code
         or child.root_value_object_id is distinct from v_target.root_value_object_id
    ) then
      raise exception using
        errcode = '23514',
        message = 'P8_SELECTED_CHILD_MUST_BE_DIRECT_OWNED_CHILD';
    end if;

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', child.id,
          'title', child.title,
          'parentValueObjectId', child.parent_value_object_id,
          'rootValueObjectId', child.root_value_object_id,
          'branchTypeCode', child.branch_type_code,
          'nodeRoleCode', child.node_role_code,
          'objectKind', child.object_kind,
          'status', child.status
        )
        order by child.title, child.id
      ),
      '[]'::jsonb
    )
    into v_selected_children
    from public.value_objects child
    where child.id = any(v_child_ids);

    with recursive selected_subtrees as (
      select
        child.id,
        child.title,
        child.parent_value_object_id,
        child.root_value_object_id,
        child.branch_type_code,
        child.node_role_code,
        child.object_kind,
        child.status,
        child.updated_at,
        child.id as selected_root_id,
        0 as depth
      from public.value_objects child
      where child.id = any(v_child_ids)

      union all

      select
        descendant.id,
        descendant.title,
        descendant.parent_value_object_id,
        descendant.root_value_object_id,
        descendant.branch_type_code,
        descendant.node_role_code,
        descendant.object_kind,
        descendant.status,
        descendant.updated_at,
        parent.selected_root_id,
        parent.depth + 1
      from public.value_objects descendant
      join selected_subtrees parent
        on descendant.parent_value_object_id = parent.id
      where descendant.owner_user_id = p_owner_user_id
        and descendant.owner_actor_id = p_owner_actor_id
        and parent.depth < 200
    )
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', subtree.id,
          'title', subtree.title,
          'parentValueObjectId', subtree.parent_value_object_id,
          'rootValueObjectId', subtree.root_value_object_id,
          'branchTypeCode', subtree.branch_type_code,
          'nodeRoleCode', subtree.node_role_code,
          'objectKind', subtree.object_kind,
          'status', subtree.status,
          'depth', subtree.depth,
          'selectedRootId', subtree.selected_root_id,
          'updatedAt', subtree.updated_at
        )
        order by subtree.selected_root_id, subtree.depth, subtree.id
      ),
      '[]'::jsonb
    )
    into v_affected
    from selected_subtrees subtree;

    v_new_path :=
      public.p8_value_object_tree_path_json(
        p_owner_user_id,
        p_owner_actor_id,
        v_target.id
      ) ||
      jsonb_build_array(
        jsonb_build_object(
          'id', null,
          'title', v_title,
          'parentValueObjectId', v_target.id,
          'rootValueObjectId', v_target.root_value_object_id,
          'branchTypeCode', v_target.branch_type_code,
          'nodeRoleCode', 'structural',
          'objectKind', v_object_kind,
          'status', 'draft'
        )
      );

    v_warnings := v_warnings || jsonb_build_array(
      'The new intermediate object and all selected child reparent operations will be committed or rolled back as one transaction.'
    );

    v_preview_material := jsonb_build_object(
      'mode', p_mode,
      'parentId', v_target.id,
      'rootId', v_target.root_value_object_id,
      'branchTypeCode', v_target.branch_type_code,
      'title', v_title,
      'description', v_description,
      'objectKind', v_object_kind,
      'childIds', to_jsonb(v_child_ids),
      'affected', v_affected
    );
  end if;

  v_preview_hash := upper(
    encode(
      digest(convert_to(v_preview_material::text, 'UTF8'), 'sha256'),
      'hex'
    )
  );

  return jsonb_build_object(
    'ok', true,
    'allowed', true,
    'mode', p_mode,
    'stateAlreadySatisfied', v_state_already_satisfied,
    'target', public.p8_value_object_tree_node_json(v_target.id),
    'sourceParent',
      case
        when v_source_parent.id is null then null
        else public.p8_value_object_tree_node_json(v_source_parent.id)
      end,
    'destinationParent',
      case
        when p_mode = 'insert_intermediate' then public.p8_value_object_tree_node_json(v_target.id)
        when v_destination_parent.id is null then null
        else public.p8_value_object_tree_node_json(v_destination_parent.id)
      end,
    'oldPath', v_old_path,
    'newPath', v_new_path,
    'affectedNodes', v_affected,
    'selectedChildren', v_selected_children,
    'proposedIntermediate',
      case
        when p_mode = 'insert_intermediate' then jsonb_build_object(
          'title', v_title,
          'description', v_description,
          'objectKind', v_object_kind
        )
        else null
      end,
    'warnings', v_warnings,
    'previewHash', v_preview_hash
  );
end;
$function$;

-- Preserve every Reality Model v2 invariant while allowing a P8 RPC to update
-- a subtree atomically. The transaction-local setting is accepted only when it
-- names an operation row that is currently in status=applying.
create or replace function public.enforce_value_object_tree_v2()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
declare
  v_tree_requested boolean;
  v_parent record;
  v_root record;
  v_cycle_found boolean;
  v_has_children boolean;
  v_controlled_operation_id uuid;
  v_controlled_operation_valid boolean := false;
begin
  begin
    v_controlled_operation_id :=
      nullif(current_setting('arctor.p8_tree_operation_id', true), '')::uuid;
  exception when invalid_text_representation then
    v_controlled_operation_id := null;
  end;

  if v_controlled_operation_id is not null then
    select exists (
      select 1
      from public.value_object_tree_operations operation
      where operation.id = v_controlled_operation_id
        and operation.status = 'applying'
    )
    into v_controlled_operation_valid;
  end if;

  v_tree_requested :=
    new.object_kind is not null
    or new.node_role_code is not null
    or new.branch_type_code is not null
    or new.root_value_object_id is not null
    or new.instance_of_value_object_id is not null;

  if not v_tree_requested then
    if tg_op = 'UPDATE' then
      if (
         old.object_kind is not null
         or old.node_role_code is not null
         or old.branch_type_code is not null
         or old.root_value_object_id is not null
         or old.instance_of_value_object_id is not null
      ) then
        raise exception using
          errcode = '23514',
          message = 'VALUE_OBJECT_TREE_V2_IDENTITY_CANNOT_BE_CLEARED';
      end if;
    end if;

    return new;
  end if;

  if new.id is null then
    new.id := gen_random_uuid();
  end if;

  if new.object_kind is null
     or new.node_role_code is null
     or new.branch_type_code is null then
    raise exception using
      errcode = '23514',
      message = 'VALUE_OBJECT_TREE_V2_IDENTITY_INCOMPLETE';
  end if;

  new.value_type := new.object_kind;

  if new.node_role_code = 'activity_leaf'
     and new.object_kind <> 'activity_pattern' then
    raise exception using
      errcode = '23514',
      message = 'VALUE_OBJECT_TREE_V2_LEAF_KIND_INVALID';
  end if;

  if new.instance_of_value_object_id = new.id then
    raise exception using
      errcode = '23514',
      message = 'VALUE_OBJECT_TREE_V2_INSTANCE_CANNOT_REFERENCE_SELF';
  end if;

  if new.parent_value_object_id is null then
    if new.node_role_code <> 'structural' then
      raise exception using
        errcode = '23514',
        message = 'VALUE_OBJECT_TREE_V2_ROOT_MUST_BE_STRUCTURAL';
    end if;

    if new.root_value_object_id is null then
      new.root_value_object_id := new.id;
    elsif new.root_value_object_id <> new.id then
      raise exception using
        errcode = '23514',
        message = 'VALUE_OBJECT_TREE_V2_ROOT_MUST_REFERENCE_SELF';
    end if;
  else
    if new.parent_value_object_id = new.id then
      raise exception using
        errcode = '23514',
        message = 'VALUE_OBJECT_TREE_V2_PARENT_CANNOT_REFERENCE_SELF';
    end if;

    select
      parent.id,
      parent.node_role_code,
      parent.branch_type_code,
      parent.root_value_object_id
    into v_parent
    from public.value_objects parent
    where parent.id = new.parent_value_object_id;

    if not found then
      raise exception using
        errcode = '23503',
        message = 'VALUE_OBJECT_TREE_V2_PARENT_NOT_FOUND';
    end if;

    if v_parent.node_role_code <> 'structural'
       or v_parent.branch_type_code is null
       or v_parent.root_value_object_id is null then
      raise exception using
        errcode = '23514',
        message = 'VALUE_OBJECT_TREE_V2_PARENT_MUST_BE_V2_STRUCTURAL';
    end if;

    if new.branch_type_code <> v_parent.branch_type_code then
      raise exception using
        errcode = '23514',
        message = 'VALUE_OBJECT_TREE_V2_BRANCH_MISMATCH';
    end if;

    if new.root_value_object_id is null then
      new.root_value_object_id := v_parent.root_value_object_id;
    elsif new.root_value_object_id <> v_parent.root_value_object_id then
      raise exception using
        errcode = '23514',
        message = 'VALUE_OBJECT_TREE_V2_ROOT_MISMATCH';
    end if;

    with recursive ancestors as (
      select candidate.id, candidate.parent_value_object_id
      from public.value_objects candidate
      where candidate.id = new.parent_value_object_id

      union

      select candidate.id, candidate.parent_value_object_id
      from public.value_objects candidate
      join ancestors previous
        on candidate.id = previous.parent_value_object_id
    )
    select exists (
      select 1
      from ancestors
      where id = new.id
    )
    into v_cycle_found;

    if v_cycle_found then
      raise exception using
        errcode = '23514',
        message = 'VALUE_OBJECT_TREE_V2_CYCLE_FORBIDDEN';
    end if;
  end if;

  if new.root_value_object_id <> new.id then
    select
      root.id,
      root.node_role_code,
      root.branch_type_code,
      root.root_value_object_id,
      root.parent_value_object_id
    into v_root
    from public.value_objects root
    where root.id = new.root_value_object_id;

    if not found
       or v_root.node_role_code <> 'structural'
       or v_root.parent_value_object_id is not null
       or v_root.root_value_object_id <> v_root.id
       or v_root.branch_type_code <> new.branch_type_code then
      raise exception using
        errcode = '23514',
        message = 'VALUE_OBJECT_TREE_V2_ROOT_INVALID';
    end if;
  end if;

  select exists (
    select 1
    from public.value_objects child
    where child.parent_value_object_id = new.id
      and child.id <> new.id
  )
  into v_has_children;

  if new.node_role_code = 'activity_leaf' and v_has_children then
    raise exception using
      errcode = '23514',
      message = 'VALUE_OBJECT_TREE_V2_LEAF_CANNOT_HAVE_CHILDREN';
  end if;

  if tg_op = 'UPDATE'
     and (
       new.parent_value_object_id is distinct from old.parent_value_object_id
       or new.branch_type_code is distinct from old.branch_type_code
       or new.root_value_object_id is distinct from old.root_value_object_id
     )
     and not v_controlled_operation_valid then
    raise exception using
      errcode = '23514',
      message = 'VALUE_OBJECT_TREE_V2_SUBTREE_MOVE_REQUIRES_CONTROLLED_FLOW';
  end if;

  return new;
end;
$function$;

create or replace function public.apply_value_object_tree_restructure_v1(
  p_owner_user_id uuid,
  p_owner_actor_id uuid,
  p_created_by_actor_id uuid,
  p_target_value_object_id uuid,
  p_mode text,
  p_payload jsonb,
  p_preview_hash text,
  p_idempotency_key text,
  p_request_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_existing_operation public.value_object_tree_operations%rowtype;
  v_operation public.value_object_tree_operations%rowtype;
  v_target public.value_objects%rowtype;
  v_parent public.value_objects%rowtype;
  v_preview jsonb;
  v_new_parent_id uuid;
  v_new_root_id uuid;
  v_child_ids uuid[];
  v_created_intermediate public.value_objects%rowtype;
  v_response jsonb;
  v_now timestamptz := clock_timestamp();
  v_item record;
begin
  if p_owner_user_id is null
     or p_owner_actor_id is null
     or p_created_by_actor_id is null
     or p_target_value_object_id is null then
    raise exception using
      errcode = '22023',
      message = 'P8_REQUIRED_IDENTIFIERS_MISSING';
  end if;

  if p_mode not in ('reparent', 'insert_intermediate') then
    raise exception using
      errcode = '22023',
      message = 'P8_MODE_INVALID';
  end if;

  if nullif(btrim(p_idempotency_key), '') is null
     or char_length(p_idempotency_key) not between 8 and 200
     or p_request_hash !~ '^[A-F0-9]{64}$'
     or p_preview_hash !~ '^[A-F0-9]{64}$' then
    raise exception using
      errcode = '22023',
      message = 'P8_IDEMPOTENCY_OR_HASH_INVALID';
  end if;

  if not exists (
    select 1
    from public.actor_public_profiles profile
    where profile.owner_user_id = p_owner_user_id
      and profile.actor_id = p_owner_actor_id
  ) or not exists (
    select 1
    from public.actor_public_profiles profile
    where profile.owner_user_id = p_owner_user_id
      and profile.actor_id = p_created_by_actor_id
  ) then
    raise exception using
      errcode = '42501',
      message = 'P8_ACTOR_OR_CREATOR_NOT_OWNED';
  end if;

  select *
  into v_existing_operation
  from public.value_object_tree_operations operation
  where operation.owner_user_id = p_owner_user_id
    and operation.owner_actor_id = p_owner_actor_id
    and operation.idempotency_key = p_idempotency_key
  for update;

  if found then
    if v_existing_operation.operation_type is distinct from p_mode
       or v_existing_operation.target_value_object_id_snapshot
            is distinct from p_target_value_object_id
       or v_existing_operation.request_hash is distinct from p_request_hash then
      raise exception using
        errcode = '23505',
        message = 'P8_IDEMPOTENCY_PAYLOAD_MISMATCH';
    end if;

    return jsonb_set(
      v_existing_operation.response_json,
      '{idempotentReplay}',
      'true'::jsonb,
      true
    );
  end if;

  -- P8 is rare and structural. A short table-level write lock prevents a
  -- concurrent insert from appearing under a subtree after it was enumerated.
  lock table public.value_objects in share row exclusive mode;

  -- Lock target and all rows whose path can change before validating the preview.
  if p_mode = 'reparent' then
    for v_item in
      with recursive subtree as (
        select value_object.id, 0 as depth
        from public.value_objects value_object
        where value_object.id = p_target_value_object_id

        union all

        select child.id, parent.depth + 1
        from public.value_objects child
        join subtree parent
          on child.parent_value_object_id = parent.id
        where parent.depth < 200
      )
      select value_object.id
      from public.value_objects value_object
      join subtree on subtree.id = value_object.id
      order by subtree.depth, value_object.id
      for update of value_object
    loop
      null;
    end loop;

    if p_payload ? 'newParentValueObjectId'
       and nullif(p_payload ->> 'newParentValueObjectId', '') is not null then
      v_new_parent_id := (p_payload ->> 'newParentValueObjectId')::uuid;
      perform 1
      from public.value_objects value_object
      where value_object.id = v_new_parent_id
      for update;
    end if;
  else
    select coalesce(array_agg(value::uuid), array[]::uuid[])
    into v_child_ids
    from jsonb_array_elements_text(p_payload -> 'childValueObjectIds') element(value);

    for v_item in
      with recursive locked_rows as (
        select value_object.id, 0 as depth
        from public.value_objects value_object
        where value_object.id = p_target_value_object_id
           or value_object.id = any(v_child_ids)

        union

        select child.id, parent.depth + 1
        from public.value_objects child
        join locked_rows parent
          on child.parent_value_object_id = parent.id
        where parent.id <> p_target_value_object_id
          and parent.depth < 200
      )
      select value_object.id
      from public.value_objects value_object
      join locked_rows locked on locked.id = value_object.id
      order by locked.depth, value_object.id
      for update of value_object
    loop
      null;
    end loop;
  end if;

  v_preview := public.preview_value_object_tree_restructure_v1(
    p_owner_user_id,
    p_owner_actor_id,
    p_target_value_object_id,
    p_mode,
    p_payload
  );

  if v_preview ->> 'previewHash' is distinct from p_preview_hash then
    raise exception using
      errcode = '40001',
      message = 'P8_PREVIEW_STALE_RELOAD_REQUIRED';
  end if;

  select *
  into v_target
  from public.value_objects value_object
  where value_object.id = p_target_value_object_id
  for update;

  if p_mode = 'reparent' then
    if p_payload ? 'newParentValueObjectId'
       and nullif(p_payload ->> 'newParentValueObjectId', '') is not null then
      v_new_parent_id := (p_payload ->> 'newParentValueObjectId')::uuid;

      select *
      into v_parent
      from public.value_objects value_object
      where value_object.id = v_new_parent_id
      for update;

      v_new_root_id := v_parent.root_value_object_id;
    else
      v_new_parent_id := null;
      v_new_root_id := v_target.id;
    end if;
  end if;

  insert into public.value_object_tree_operations (
    owner_user_id,
    owner_actor_id,
    created_by_actor_id,
    operation_type,
    status,
    target_value_object_id,
    target_value_object_id_snapshot,
    source_parent_value_object_id,
    source_parent_value_object_id_snapshot,
    destination_parent_value_object_id,
    destination_parent_value_object_id_snapshot,
    idempotency_key,
    request_hash,
    preview_hash,
    request_payload,
    before_snapshot
  )
  values (
    p_owner_user_id,
    p_owner_actor_id,
    p_created_by_actor_id,
    p_mode,
    'applying',
    v_target.id,
    v_target.id,
    v_target.parent_value_object_id,
    v_target.parent_value_object_id,
    case when p_mode = 'reparent' then v_new_parent_id else v_target.id end,
    case when p_mode = 'reparent' then v_new_parent_id else v_target.id end,
    p_idempotency_key,
    p_request_hash,
    p_preview_hash,
    p_payload,
    jsonb_build_object('preview', v_preview)
  )
  returning * into v_operation;

  perform set_config('arctor.p8_tree_operation_id', v_operation.id::text, true);

  if p_mode = 'reparent' then
    insert into public.value_object_tree_operation_items (
      operation_id,
      value_object_id,
      value_object_id_snapshot,
      item_role,
      depth,
      before_parent_value_object_id,
      before_root_value_object_id,
      before_branch_type_code,
      before_updated_at,
      after_parent_value_object_id,
      after_root_value_object_id,
      after_branch_type_code,
      before_snapshot
    )
    with recursive subtree as (
      select value_object.*, 0 as depth
      from public.value_objects value_object
      where value_object.id = v_target.id

      union all

      select child.*, parent.depth + 1
      from public.value_objects child
      join subtree parent
        on child.parent_value_object_id = parent.id
      where parent.depth < 200
    )
    select
      v_operation.id,
      subtree.id,
      subtree.id,
      case when subtree.depth = 0 then 'target' else 'descendant' end,
      subtree.depth,
      subtree.parent_value_object_id,
      subtree.root_value_object_id,
      subtree.branch_type_code,
      subtree.updated_at,
      case when subtree.depth = 0 then v_new_parent_id else subtree.parent_value_object_id end,
      v_new_root_id,
      subtree.branch_type_code,
      to_jsonb(subtree) - 'depth'
    from subtree;

    if not coalesce(
      (v_preview ->> 'stateAlreadySatisfied')::boolean,
      false
    ) then
      for v_item in
        select item.value_object_id_snapshot, item.depth
        from public.value_object_tree_operation_items item
        where item.operation_id = v_operation.id
        order by item.depth, item.value_object_id_snapshot
      loop
        update public.value_objects value_object
        set
          parent_value_object_id = case
            when v_item.depth = 0 then v_new_parent_id
            else value_object.parent_value_object_id
          end,
          root_value_object_id = v_new_root_id,
          updated_at = v_now
        where value_object.id = v_item.value_object_id_snapshot
          and value_object.owner_user_id = p_owner_user_id
          and value_object.owner_actor_id = p_owner_actor_id;
      end loop;
    end if;

  else
    select coalesce(array_agg(value::uuid order by value::uuid), array[]::uuid[])
    into v_child_ids
    from jsonb_array_elements_text(p_payload -> 'childValueObjectIds') element(value);

    insert into public.value_objects (
      id,
      owner_actor_id,
      created_by_actor_id,
      actor_id,
      app_user_id,
      owner_user_id,
      organization_id,
      usage_scope,
      value_type,
      object_kind,
      node_role_code,
      branch_type_code,
      root_value_object_id,
      parent_value_object_id,
      instance_of_value_object_id,
      title,
      description,
      unit_type,
      default_price,
      default_currency,
      default_duration_minutes,
      is_marketplace_sellable,
      is_free_possible,
      commercial_usage,
      visibility,
      privacy_level,
      sensitivity_level,
      source,
      status,
      identity_attributes_json,
      metadata_json,
      created_at,
      updated_at
    )
    values (
      gen_random_uuid(),
      p_owner_actor_id,
      p_created_by_actor_id,
      p_owner_actor_id,
      p_owner_user_id,
      p_owner_user_id,
      null,
      'private',
      p_payload ->> 'objectKind',
      p_payload ->> 'objectKind',
      'structural',
      v_target.branch_type_code,
      v_target.root_value_object_id,
      v_target.id,
      null,
      btrim(p_payload ->> 'title'),
      nullif(btrim(p_payload ->> 'description'), ''),
      null,
      null,
      null,
      null,
      false,
      false,
      'none',
      'private',
      'private',
      'standard',
      'manual',
      'draft',
      '{}'::jsonb,
      jsonb_build_object(
        'authoring_contract', 'reality-model-v5-p8-insert-intermediate',
        'tree_operation_id', v_operation.id,
        'parent_object_id', v_target.id,
        'root_object_id', v_target.root_value_object_id
      ),
      v_now,
      v_now
    )
    returning * into v_created_intermediate;

    update public.value_object_tree_operations
    set
      created_value_object_id = v_created_intermediate.id,
      created_value_object_id_snapshot = v_created_intermediate.id
    where id = v_operation.id;

    insert into public.value_object_tree_operation_items (
      operation_id,
      value_object_id,
      value_object_id_snapshot,
      item_role,
      depth,
      before_parent_value_object_id,
      before_root_value_object_id,
      before_branch_type_code,
      before_updated_at,
      after_parent_value_object_id,
      after_root_value_object_id,
      after_branch_type_code,
      before_snapshot,
      after_snapshot,
      after_updated_at
    )
    values (
      v_operation.id,
      v_created_intermediate.id,
      v_created_intermediate.id,
      'created_intermediate',
      0,
      null,
      null,
      null,
      null,
      v_created_intermediate.parent_value_object_id,
      v_created_intermediate.root_value_object_id,
      v_created_intermediate.branch_type_code,
      '{}'::jsonb,
      to_jsonb(v_created_intermediate),
      v_created_intermediate.updated_at
    );

    insert into public.value_object_tree_operation_items (
      operation_id,
      value_object_id,
      value_object_id_snapshot,
      item_role,
      depth,
      before_parent_value_object_id,
      before_root_value_object_id,
      before_branch_type_code,
      before_updated_at,
      after_parent_value_object_id,
      after_root_value_object_id,
      after_branch_type_code,
      before_snapshot
    )
    with recursive selected_subtrees as (
      select child.*, child.id as selected_root_id, 0 as depth
      from public.value_objects child
      where child.id = any(v_child_ids)

      union all

      select descendant.*, parent.selected_root_id, parent.depth + 1
      from public.value_objects descendant
      join selected_subtrees parent
        on descendant.parent_value_object_id = parent.id
      where parent.depth < 200
    )
    select
      v_operation.id,
      subtree.id,
      subtree.id,
      case when subtree.depth = 0 then 'selected_child' else 'selected_descendant' end,
      subtree.depth,
      subtree.parent_value_object_id,
      subtree.root_value_object_id,
      subtree.branch_type_code,
      subtree.updated_at,
      case when subtree.depth = 0 then v_created_intermediate.id else subtree.parent_value_object_id end,
      subtree.root_value_object_id,
      subtree.branch_type_code,
      to_jsonb(subtree) - 'selected_root_id' - 'depth'
    from selected_subtrees subtree;

    for v_item in
      select item.value_object_id_snapshot
      from public.value_object_tree_operation_items item
      where item.operation_id = v_operation.id
        and item.item_role = 'selected_child'
      order by item.value_object_id_snapshot
    loop
      update public.value_objects value_object
      set
        parent_value_object_id = v_created_intermediate.id,
        updated_at = v_now
      where value_object.id = v_item.value_object_id_snapshot
        and value_object.owner_user_id = p_owner_user_id
        and value_object.owner_actor_id = p_owner_actor_id;
    end loop;
  end if;

  update public.value_object_tree_operation_items item
  set
    after_updated_at = value_object.updated_at,
    after_snapshot = to_jsonb(value_object)
  from public.value_objects value_object
  where item.operation_id = v_operation.id
    and item.value_object_id_snapshot = value_object.id;

  v_response := jsonb_build_object(
    'ok', true,
    'idempotentReplay', false,
    'stateAlreadySatisfied', coalesce((v_preview ->> 'stateAlreadySatisfied')::boolean, false),
    'operationId', v_operation.id,
    'operationType', p_mode,
    'targetValueObjectId', v_target.id,
    'createdValueObjectId', v_created_intermediate.id,
    'affectedValueObjectIds', coalesce(
      (
        select jsonb_agg(item.value_object_id_snapshot order by item.depth, item.value_object_id_snapshot)
        from public.value_object_tree_operation_items item
        where item.operation_id = v_operation.id
      ),
      '[]'::jsonb
    ),
    'redirectValueObjectId', coalesce(v_created_intermediate.id, v_target.id)
  );

  update public.value_object_tree_operations
  set
    status = 'applied',
    applied_at = v_now,
    after_snapshot = jsonb_build_object(
      'target', public.p8_value_object_tree_node_json(v_target.id),
      'createdIntermediate',
        case
          when v_created_intermediate.id is null then null
          else public.p8_value_object_tree_node_json(v_created_intermediate.id)
        end
    ),
    response_json = v_response
  where id = v_operation.id;

  return v_response;
end;
$function$;

create or replace function public.rollback_value_object_tree_restructure_v1(
  p_owner_user_id uuid,
  p_owner_actor_id uuid,
  p_created_by_actor_id uuid,
  p_operation_id uuid,
  p_idempotency_key text,
  p_request_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_existing_operation public.value_object_tree_operations%rowtype;
  v_original public.value_object_tree_operations%rowtype;
  v_rollback public.value_object_tree_operations%rowtype;
  v_created_item public.value_object_tree_operation_items%rowtype;
  v_response jsonb;
  v_now timestamptz := clock_timestamp();
  v_item record;
  v_newer_conflict boolean;
  v_current public.value_objects%rowtype;
  v_fk record;
  v_has_external_reference boolean;
begin
  if p_owner_user_id is null
     or p_owner_actor_id is null
     or p_created_by_actor_id is null
     or p_operation_id is null then
    raise exception using
      errcode = '22023',
      message = 'P8_ROLLBACK_REQUIRED_IDENTIFIERS_MISSING';
  end if;

  if nullif(btrim(p_idempotency_key), '') is null
     or char_length(p_idempotency_key) not between 8 and 200
     or p_request_hash !~ '^[A-F0-9]{64}$' then
    raise exception using
      errcode = '22023',
      message = 'P8_ROLLBACK_IDEMPOTENCY_INVALID';
  end if;

  select *
  into v_existing_operation
  from public.value_object_tree_operations operation
  where operation.owner_user_id = p_owner_user_id
    and operation.owner_actor_id = p_owner_actor_id
    and operation.idempotency_key = p_idempotency_key
  for update;

  if found then
    if v_existing_operation.operation_type <> 'rollback'
       or v_existing_operation.rollback_of_operation_id is distinct from p_operation_id
       or v_existing_operation.request_hash is distinct from p_request_hash then
      raise exception using
        errcode = '23505',
        message = 'P8_IDEMPOTENCY_PAYLOAD_MISMATCH';
    end if;

    return jsonb_set(
      v_existing_operation.response_json,
      '{idempotentReplay}',
      'true'::jsonb,
      true
    );
  end if;

  select *
  into v_original
  from public.value_object_tree_operations operation
  where operation.id = p_operation_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'P8_OPERATION_NOT_FOUND';
  end if;

  if v_original.owner_user_id is distinct from p_owner_user_id
     or v_original.owner_actor_id is distinct from p_owner_actor_id then
    raise exception using
      errcode = '42501',
      message = 'P8_OPERATION_OWNER_MISMATCH';
  end if;

  if v_original.operation_type not in ('reparent', 'insert_intermediate')
     or v_original.status <> 'applied' then
    raise exception using
      errcode = '23514',
      message = 'P8_OPERATION_NOT_ROLLBACK_ELIGIBLE';
  end if;

  -- Serialize the structural rollback with every concurrent value_objects write.
  lock table public.value_objects in share row exclusive mode;

  select exists (
    select 1
    from public.value_object_tree_operation_items original_item
    join public.value_object_tree_operation_items newer_item
      on newer_item.value_object_id_snapshot = original_item.value_object_id_snapshot
    join public.value_object_tree_operations newer_operation
      on newer_operation.id = newer_item.operation_id
    where original_item.operation_id = v_original.id
      and newer_operation.id <> v_original.id
      and newer_operation.status = 'applied'
      and newer_operation.created_at > v_original.created_at
  )
  into v_newer_conflict;

  if v_newer_conflict then
    raise exception using
      errcode = '40001',
      message = 'P8_ROLLBACK_BLOCKED_BY_NEWER_TREE_OPERATION';
  end if;

  for v_item in
    select *
    from public.value_object_tree_operation_items item
    where item.operation_id = v_original.id
      and item.item_role <> 'created_intermediate'
    order by item.depth, item.value_object_id_snapshot
  loop
    select *
    into v_current
    from public.value_objects value_object
    where value_object.id = v_item.value_object_id_snapshot
    for update;

    if not found then
      raise exception using
        errcode = '40001',
        message = 'P8_ROLLBACK_OBJECT_MISSING';
    end if;

    if v_current.owner_user_id is distinct from p_owner_user_id
       or v_current.owner_actor_id is distinct from p_owner_actor_id
       or v_current.parent_value_object_id is distinct from v_item.after_parent_value_object_id
       or v_current.root_value_object_id is distinct from v_item.after_root_value_object_id
       or v_current.branch_type_code is distinct from v_item.after_branch_type_code then
      raise exception using
        errcode = '40001',
        message = 'P8_ROLLBACK_CURRENT_TREE_STATE_CONFLICT';
    end if;
  end loop;

  if v_original.operation_type = 'insert_intermediate' then
    select *
    into v_created_item
    from public.value_object_tree_operation_items item
    where item.operation_id = v_original.id
      and item.item_role = 'created_intermediate';

    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'P8_ROLLBACK_CREATED_INTERMEDIATE_AUDIT_MISSING';
    end if;

    select *
    into v_current
    from public.value_objects value_object
    where value_object.id = v_created_item.value_object_id_snapshot
    for update;

    if not found
       or v_current.owner_user_id is distinct from p_owner_user_id
       or v_current.owner_actor_id is distinct from p_owner_actor_id
       or v_current.parent_value_object_id is distinct from v_created_item.after_parent_value_object_id
       or v_current.root_value_object_id is distinct from v_created_item.after_root_value_object_id
       or v_current.branch_type_code is distinct from v_created_item.after_branch_type_code
       or v_current.title is distinct from (v_created_item.after_snapshot ->> 'title')
       or v_current.description is distinct from nullif(v_created_item.after_snapshot ->> 'description', '')
       or v_current.object_kind is distinct from (v_created_item.after_snapshot ->> 'object_kind')
       or v_current.status is distinct from (v_created_item.after_snapshot ->> 'status') then
      raise exception using
        errcode = '40001',
        message = 'P8_ROLLBACK_CREATED_INTERMEDIATE_CHANGED';
    end if;

    if exists (
      select 1
      from public.value_objects child
      where child.parent_value_object_id = v_created_item.value_object_id_snapshot
        and not exists (
          select 1
          from public.value_object_tree_operation_items original_item
          where original_item.operation_id = v_original.id
            and original_item.item_role = 'selected_child'
            and original_item.value_object_id_snapshot = child.id
        )
    ) then
      raise exception using
        errcode = '40001',
        message = 'P8_ROLLBACK_CREATED_INTERMEDIATE_HAS_NEW_CHILDREN';
    end if;

    -- Deleting the P8-created intermediate must never cascade-delete later
    -- product data. Detect every simple foreign key to value_objects.id except
    -- the expected selected-child parent links and P8 audit references.
    for v_fk in
      select
        namespace.nspname as schema_name,
        relation.relname as table_name,
        attribute.attname as column_name
      from pg_constraint constraint_row
      join pg_class relation
        on relation.oid = constraint_row.conrelid
      join pg_namespace namespace
        on namespace.oid = relation.relnamespace
      join unnest(constraint_row.conkey) with ordinality local_key(attnum, ordinal)
        on true
      join unnest(constraint_row.confkey) with ordinality referenced_key(attnum, ordinal)
        on referenced_key.ordinal = local_key.ordinal
      join pg_attribute attribute
        on attribute.attrelid = constraint_row.conrelid
       and attribute.attnum = local_key.attnum
      join pg_attribute referenced_attribute
        on referenced_attribute.attrelid = constraint_row.confrelid
       and referenced_attribute.attnum = referenced_key.attnum
      where constraint_row.contype = 'f'
        and constraint_row.confrelid = 'public.value_objects'::regclass
        and referenced_attribute.attname = 'id'
        and cardinality(constraint_row.conkey) = 1
        and not (
          namespace.nspname = 'public'
          and relation.relname in (
            'value_object_tree_operations',
            'value_object_tree_operation_items'
          )
        )
        and not (
          namespace.nspname = 'public'
          and relation.relname = 'value_objects'
          and attribute.attname = 'parent_value_object_id'
        )
    loop
      execute format(
        'select exists (select 1 from %I.%I where %I = $1)',
        v_fk.schema_name,
        v_fk.table_name,
        v_fk.column_name
      )
      into v_has_external_reference
      using v_created_item.value_object_id_snapshot;

      if v_has_external_reference then
        raise exception using
          errcode = '40001',
          message = 'P8_ROLLBACK_CREATED_INTERMEDIATE_HAS_DEPENDENT_DATA',
          detail = format(
            'Dependent reference found in %I.%I.%I',
            v_fk.schema_name,
            v_fk.table_name,
            v_fk.column_name
          );
      end if;
    end loop;
  end if;

  insert into public.value_object_tree_operations (
    owner_user_id,
    owner_actor_id,
    created_by_actor_id,
    operation_type,
    status,
    target_value_object_id,
    target_value_object_id_snapshot,
    source_parent_value_object_id,
    source_parent_value_object_id_snapshot,
    destination_parent_value_object_id,
    destination_parent_value_object_id_snapshot,
    rollback_of_operation_id,
    idempotency_key,
    request_hash,
    preview_hash,
    request_payload,
    before_snapshot
  )
  values (
    p_owner_user_id,
    p_owner_actor_id,
    p_created_by_actor_id,
    'rollback',
    'applying',
    v_original.target_value_object_id,
    v_original.target_value_object_id_snapshot,
    v_original.destination_parent_value_object_id,
    v_original.destination_parent_value_object_id_snapshot,
    v_original.source_parent_value_object_id,
    v_original.source_parent_value_object_id_snapshot,
    v_original.id,
    p_idempotency_key,
    p_request_hash,
    v_original.preview_hash,
    jsonb_build_object('operationId', v_original.id),
    jsonb_build_object('originalOperation', v_original.response_json)
  )
  returning * into v_rollback;

  perform set_config('arctor.p8_tree_operation_id', v_rollback.id::text, true);

  insert into public.value_object_tree_operation_items (
    operation_id,
    value_object_id,
    value_object_id_snapshot,
    item_role,
    depth,
    before_parent_value_object_id,
    before_root_value_object_id,
    before_branch_type_code,
    before_updated_at,
    after_parent_value_object_id,
    after_root_value_object_id,
    after_branch_type_code,
    before_snapshot,
    after_snapshot
  )
  select
    v_rollback.id,
    original_item.value_object_id,
    original_item.value_object_id_snapshot,
    original_item.item_role,
    original_item.depth,
    original_item.after_parent_value_object_id,
    original_item.after_root_value_object_id,
    original_item.after_branch_type_code,
    original_item.after_updated_at,
    original_item.before_parent_value_object_id,
    original_item.before_root_value_object_id,
    original_item.before_branch_type_code,
    original_item.after_snapshot,
    original_item.before_snapshot
  from public.value_object_tree_operation_items original_item
  where original_item.operation_id = v_original.id;

  for v_item in
    select *
    from public.value_object_tree_operation_items item
    where item.operation_id = v_original.id
      and item.item_role <> 'created_intermediate'
    order by item.depth, item.value_object_id_snapshot
  loop
    update public.value_objects value_object
    set
      parent_value_object_id = v_item.before_parent_value_object_id,
      root_value_object_id = v_item.before_root_value_object_id,
      branch_type_code = v_item.before_branch_type_code,
      updated_at = v_now
    where value_object.id = v_item.value_object_id_snapshot
      and value_object.owner_user_id = p_owner_user_id
      and value_object.owner_actor_id = p_owner_actor_id;
  end loop;

  if v_original.operation_type = 'insert_intermediate' then
    delete from public.value_objects value_object
    where value_object.id = v_created_item.value_object_id_snapshot
      and value_object.owner_user_id = p_owner_user_id
      and value_object.owner_actor_id = p_owner_actor_id;
  end if;

  update public.value_object_tree_operation_items item
  set
    after_updated_at = value_object.updated_at,
    after_snapshot = to_jsonb(value_object)
  from public.value_objects value_object
  where item.operation_id = v_rollback.id
    and item.value_object_id_snapshot = value_object.id;

  v_response := jsonb_build_object(
    'ok', true,
    'idempotentReplay', false,
    'rollbackOperationId', v_rollback.id,
    'rolledBackOperationId', v_original.id,
    'restoredValueObjectIds', coalesce(
      (
        select jsonb_agg(item.value_object_id_snapshot order by item.depth, item.value_object_id_snapshot)
        from public.value_object_tree_operation_items item
        where item.operation_id = v_original.id
          and item.item_role <> 'created_intermediate'
      ),
      '[]'::jsonb
    ),
    'deletedCreatedValueObjectId',
      case
        when v_original.operation_type = 'insert_intermediate'
          then v_created_item.value_object_id_snapshot
        else null
      end,
    'redirectValueObjectId', v_original.target_value_object_id_snapshot
  );

  update public.value_object_tree_operations
  set
    status = 'rolled_back',
    rolled_back_at = v_now
  where id = v_original.id;

  update public.value_object_tree_operations
  set
    status = 'applied',
    applied_at = v_now,
    after_snapshot = jsonb_build_object('rollbackOf', v_original.id),
    response_json = v_response
  where id = v_rollback.id;

  return v_response;
end;
$function$;

revoke execute on function public.p8_value_object_tree_node_json(uuid)
  from public, anon, authenticated;
revoke execute on function public.p8_value_object_tree_path_json(uuid, uuid, uuid)
  from public, anon, authenticated;
revoke execute on function public.preview_value_object_tree_restructure_v1(uuid, uuid, uuid, text, jsonb)
  from public, anon, authenticated;
revoke execute on function public.apply_value_object_tree_restructure_v1(uuid, uuid, uuid, uuid, text, jsonb, text, text, text)
  from public, anon, authenticated;
revoke execute on function public.rollback_value_object_tree_restructure_v1(uuid, uuid, uuid, uuid, text, text)
  from public, anon, authenticated;

grant execute on function public.p8_value_object_tree_node_json(uuid)
  to service_role;
grant execute on function public.p8_value_object_tree_path_json(uuid, uuid, uuid)
  to service_role;
grant execute on function public.preview_value_object_tree_restructure_v1(uuid, uuid, uuid, text, jsonb)
  to service_role;
grant execute on function public.apply_value_object_tree_restructure_v1(uuid, uuid, uuid, uuid, text, jsonb, text, text, text)
  to service_role;
grant execute on function public.rollback_value_object_tree_restructure_v1(uuid, uuid, uuid, uuid, text, text)
  to service_role;

comment on table public.value_object_tree_operations is
  'P8 service-only audit ledger for controlled Value Object tree restructure and rollback operations.';

comment on table public.value_object_tree_operation_items is
  'P8 immutable before/after structural snapshots for every object whose path is affected by a tree operation.';

comment on function public.preview_value_object_tree_restructure_v1(uuid, uuid, uuid, text, jsonb) is
  'P8 read-only preview and stale-preview hash for reparent or insert-intermediate operations.';

comment on function public.apply_value_object_tree_restructure_v1(uuid, uuid, uuid, uuid, text, jsonb, text, text, text) is
  'P8 idempotent atomic tree restructure write gate. Updates a subtree only under a transaction-local controlled-operation context.';

comment on function public.rollback_value_object_tree_restructure_v1(uuid, uuid, uuid, uuid, text, text) is
  'P8 guarded rollback. Refuses rollback after newer overlapping tree operations or structural conflicts.';

commit;
