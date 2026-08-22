-- ARCTOR_VO_CREATE_DELETE_UX_V1
-- Safe hard-delete primitive for a newly created, unused actor-owned ontology object.
-- This function intentionally refuses to delete used, edited, commercial or system objects.

begin;

create or replace function public.delete_value_object_safe_v1(
  p_owner_user_id uuid,
  p_owner_actor_id uuid,
  p_value_object_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_target public.value_objects%rowtype;
  v_fk record;
  v_reference_column record;
  v_reference_count bigint := 0;
  v_deleted_count bigint := 0;
  v_parent_id uuid;
  v_title text;
begin
  if p_owner_user_id is null
     or p_owner_actor_id is null
     or p_value_object_id is null then
    raise exception using
      errcode = '22023',
      message = 'VO_SAFE_DELETE_ARGUMENTS_REQUIRED';
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
      message = 'VO_SAFE_DELETE_ACTOR_NOT_OWNED_BY_USER';
  end if;

  select *
  into v_target
  from public.value_objects value_object
  where value_object.id = p_value_object_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'VO_SAFE_DELETE_NOT_FOUND';
  end if;

  if v_target.owner_user_id is distinct from p_owner_user_id
     or v_target.owner_actor_id is distinct from p_owner_actor_id
     or v_target.scope_code is distinct from 'actor' then
    raise exception using
      errcode = '42501',
      message = 'VO_SAFE_DELETE_ACCESS_DENIED';
  end if;

  -- Only current manual ontology authoring rows are eligible.
  if v_target.source is distinct from 'manual'
     or v_target.origin_type_code is distinct from 'user_declared'
     or v_target.branch_type_code is distinct from 'ontology_v1'
     or v_target.usage_scope is distinct from 'private'
     or v_target.organization_id is not null
     or coalesce(v_target.commercial_usage, 'none') <> 'none'
     or v_target.object_kind in ('product_type', 'service_type') then
    raise exception using
      errcode = '23514',
      message = 'VO_SAFE_DELETE_ONLY_PRIVATE_MANUAL_ONTOLOGY';
  end if;

  -- Hard delete is deliberately limited to the initial definition.
  -- Edited/restructured objects must use lifecycle/retirement workflows instead.
  if coalesce(v_target.definition_version, 0) <> 1
     or v_target.status not in ('draft', 'active') then
    raise exception using
      errcode = '23514',
      message = 'VO_SAFE_DELETE_ONLY_UNUSED_INITIAL_VERSION';
  end if;

  v_parent_id := v_target.parent_value_object_id;
  v_title := v_target.title;

  select count(*)
  into v_reference_count
  from public.value_objects child
  where child.parent_value_object_id = p_value_object_id
    and child.id <> p_value_object_id;

  if v_reference_count > 0 then
    return jsonb_build_object(
      'ok', false,
      'errorCode', 'VALUE_OBJECT_DELETE_HAS_CHILDREN',
      'error', 'This observation object has child objects and cannot be deleted.',
      'blocker', jsonb_build_object(
        'table', 'value_objects',
        'column', 'parent_value_object_id',
        'count', v_reference_count
      )
    );
  end if;

  -- Self references other than the target row itself are semantic dependencies.
  select count(*)
  into v_reference_count
  from public.value_objects other_object
  where other_object.id <> p_value_object_id
    and (
      other_object.root_value_object_id = p_value_object_id
      or other_object.instance_of_value_object_id = p_value_object_id
    );

  if v_reference_count > 0 then
    return jsonb_build_object(
      'ok', false,
      'errorCode', 'VALUE_OBJECT_DELETE_HAS_TREE_OR_INSTANCE_REFERENCES',
      'error', 'This observation object is still referenced by another observation object.',
      'blocker', jsonb_build_object(
        'table', 'value_objects',
        'column', 'root_value_object_id/instance_of_value_object_id',
        'count', v_reference_count
      )
    );
  end if;

  -- Guard legacy/non-FK reference columns as well. Older ARCTor layers contain
  -- several semantic/analytics tables whose value-object columns may not have an FK.
  -- Any row in any ordinary public table with a column ending in value_object_id
  -- blocks hard delete, except the target object's own intrinsic creation-ledger tables.
  for v_reference_column in
    select
      namespace_row.nspname as schema_name,
      table_row.relname as table_name,
      attribute_row.attname as column_name
    from pg_class table_row
    join pg_namespace namespace_row
      on namespace_row.oid = table_row.relnamespace
    join pg_attribute attribute_row
      on attribute_row.attrelid = table_row.oid
     and attribute_row.attnum > 0
     and not attribute_row.attisdropped
    where namespace_row.nspname = 'public'
      and table_row.relkind in ('r', 'p')
      and attribute_row.attname like '%value_object_id'
      and table_row.relname not in (
        'value_objects',
        'value_object_definition_versions',
        'value_object_hierarchy_events',
        'value_object_ontology_write_requests'
      )
    order by table_row.relname, attribute_row.attname
  loop
    execute format(
      'select count(*) from %I.%I where %I::text = $1',
      v_reference_column.schema_name,
      v_reference_column.table_name,
      v_reference_column.column_name
    )
    into v_reference_count
    using p_value_object_id::text;

    if v_reference_count > 0 then
      return jsonb_build_object(
        'ok', false,
        'errorCode', 'VALUE_OBJECT_DELETE_BLOCKED_REFERENCE_COLUMN',
        'error', 'This observation object is already referenced by stored data and cannot be deleted safely.',
        'blocker', jsonb_build_object(
          'table', v_reference_column.table_name,
          'column', v_reference_column.column_name,
          'count', v_reference_count
        )
      );
    end if;
  end loop;

  -- concept_aliases is polymorphic and deliberately has no Value Object FK.
  -- A published/draft alias is still meaningful usage and therefore blocks hard delete.
  if to_regclass('public.concept_aliases') is not null
     and exists (
       select 1
       from information_schema.columns column_row
       where column_row.table_schema = 'public'
         and column_row.table_name = 'concept_aliases'
         and column_row.column_name = 'concept_id'
     ) then
    execute
      'select count(*) from public.concept_aliases where concept_type = ''value_object'' and concept_id::text = $1'
    into v_reference_count
    using p_value_object_id::text;

    if v_reference_count > 0 then
      return jsonb_build_object(
        'ok', false,
        'errorCode', 'VALUE_OBJECT_DELETE_BLOCKED_ALIAS',
        'error', 'This observation object already has aliases and cannot be deleted safely.',
        'blocker', jsonb_build_object(
          'table', 'concept_aliases',
          'column', 'concept_id',
          'count', v_reference_count
        )
      );
    end if;
  end if;

  -- Fail closed if a future schema introduces a composite FK to value_objects.
  if exists (
    select 1
    from pg_constraint constraint_row
    where constraint_row.contype = 'f'
      and constraint_row.confrelid = 'public.value_objects'::regclass
      and cardinality(constraint_row.conkey) <> 1
  ) then
    raise exception using
      errcode = '55000',
      message = 'VO_SAFE_DELETE_UNSUPPORTED_COMPOSITE_REFERENCE';
  end if;

  -- Discover every current direct FK to value_objects. Any dependency is a blocker
  -- unless it is one of the object's own creation-ledger rows explicitly removed below.
  for v_fk in
    select
      namespace_row.nspname as schema_name,
      table_row.relname as table_name,
      attribute_row.attname as column_name,
      constraint_row.conname as constraint_name
    from pg_constraint constraint_row
    join pg_class table_row
      on table_row.oid = constraint_row.conrelid
    join pg_namespace namespace_row
      on namespace_row.oid = table_row.relnamespace
    join pg_attribute attribute_row
      on attribute_row.attrelid = constraint_row.conrelid
     and attribute_row.attnum = constraint_row.conkey[1]
    where constraint_row.contype = 'f'
      and constraint_row.confrelid = 'public.value_objects'::regclass
      and constraint_row.conrelid <> 'public.value_objects'::regclass
      and cardinality(constraint_row.conkey) = 1
    order by namespace_row.nspname, table_row.relname, constraint_row.conname
  loop
    v_reference_count := 0;

    -- Own immutable definition snapshots are intrinsic to the object.
    if v_fk.schema_name = 'public'
       and v_fk.table_name = 'value_object_definition_versions'
       and v_fk.column_name = 'value_object_id' then
      continue;
    end if;

    -- Own hierarchy events are intrinsic. Events of OTHER children that point
    -- to this object as old/new parent are meaningful history and block deletion.
    if v_fk.schema_name = 'public'
       and v_fk.table_name = 'value_object_hierarchy_events'
       and v_fk.column_name = 'child_value_object_id' then
      continue;
    end if;

    -- The create RPC writes an idempotency/request ledger row for this object.
    if v_fk.schema_name = 'public'
       and v_fk.table_name = 'value_object_ontology_write_requests'
       and v_fk.column_name = 'value_object_id' then
      continue;
    end if;

    if v_fk.schema_name = 'public'
       and v_fk.table_name = 'value_object_definition_versions'
       and v_fk.column_name in ('parent_value_object_id', 'root_value_object_id') then
      execute format(
        'select count(*) from %I.%I where %I = $1 and value_object_id <> $1',
        v_fk.schema_name,
        v_fk.table_name,
        v_fk.column_name
      )
      into v_reference_count
      using p_value_object_id;
    elsif v_fk.schema_name = 'public'
       and v_fk.table_name = 'value_object_hierarchy_events'
       and v_fk.column_name in ('old_parent_value_object_id', 'new_parent_value_object_id') then
      execute format(
        'select count(*) from %I.%I where %I = $1 and child_value_object_id <> $1',
        v_fk.schema_name,
        v_fk.table_name,
        v_fk.column_name
      )
      into v_reference_count
      using p_value_object_id;
    else
      execute format(
        'select count(*) from %I.%I where %I = $1',
        v_fk.schema_name,
        v_fk.table_name,
        v_fk.column_name
      )
      into v_reference_count
      using p_value_object_id;
    end if;

    if v_reference_count > 0 then
      return jsonb_build_object(
        'ok', false,
        'errorCode', 'VALUE_OBJECT_DELETE_BLOCKED_DEPENDENCY',
        'error', 'This observation object is already in use and cannot be deleted safely.',
        'blocker', jsonb_build_object(
          'table', v_fk.table_name,
          'column', v_fk.column_name,
          'constraint', v_fk.constraint_name,
          'count', v_reference_count
        )
      );
    end if;
  end loop;

  -- Remove only intrinsic creation-ledger rows. All meaningful dependencies
  -- have already been proven absent. This function is one atomic transaction.
  delete from public.value_object_ontology_write_requests request
  where request.value_object_id = p_value_object_id
    and request.owner_user_id = p_owner_user_id
    and request.owner_actor_id = p_owner_actor_id;

  delete from public.value_object_definition_versions definition_row
  where definition_row.value_object_id = p_value_object_id;

  delete from public.value_object_hierarchy_events hierarchy_event
  where hierarchy_event.child_value_object_id = p_value_object_id;

  delete from public.value_objects value_object
  where value_object.id = p_value_object_id
    and value_object.owner_user_id = p_owner_user_id
    and value_object.owner_actor_id = p_owner_actor_id;

  get diagnostics v_deleted_count = row_count;

  if v_deleted_count <> 1 then
    raise exception using
      errcode = '40001',
      message = 'VO_SAFE_DELETE_CONCURRENT_STATE_CHANGE';
  end if;

  return jsonb_build_object(
    'ok', true,
    'deletionMode', 'hard_delete_unused_v1',
    'deletedId', p_value_object_id,
    'deletedTitle', v_title,
    'parentValueObjectId', v_parent_id
  );
end;
$function$;

revoke all on function public.delete_value_object_safe_v1(uuid, uuid, uuid)
  from public, anon, authenticated, service_role;

grant execute on function public.delete_value_object_safe_v1(uuid, uuid, uuid)
  to service_role;

comment on function public.delete_value_object_safe_v1(uuid, uuid, uuid) is
  'ARCTOR_VO_CREATE_DELETE_UX_V1: hard-delete only a private actor-owned manual ontology object at definition_version=1 when all non-intrinsic FK dependencies are absent. Commercial/system/used objects fail closed.';

commit;
