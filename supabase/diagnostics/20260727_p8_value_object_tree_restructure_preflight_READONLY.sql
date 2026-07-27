-- ARCTor.app P8 tree restructure preflight
-- READ ONLY. Run before applying 20260727100000_p8_value_object_tree_restructure.sql.

with checks as (
  select 1 as check_order, 'value_objects_exists' as check_name,
    to_regclass('public.value_objects') is not null as passed
  union all
  select 2, 'actor_public_profiles_exists',
    to_regclass('public.actor_public_profiles') is not null
  union all
  select 3, 'tree_guard_function_exists',
    to_regprocedure('public.enforce_value_object_tree_v2()') is not null
  union all
  select 4, 'tree_guard_trigger_exists', exists (
    select 1
    from pg_trigger trigger_row
    join pg_class table_row on table_row.oid = trigger_row.tgrelid
    join pg_namespace schema_row on schema_row.oid = table_row.relnamespace
    where schema_row.nspname = 'public'
      and table_row.relname = 'value_objects'
      and trigger_row.tgname = 'value_objects_tree_v2_enforce_trg'
      and not trigger_row.tgisinternal
  )
  union all
  select 5, 'node_role_column_exists', exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'value_objects'
      and column_name = 'node_role_code'
  )
  union all
  select 6, 'branch_type_column_exists', exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'value_objects'
      and column_name = 'branch_type_code'
  )
  union all
  select 7, 'root_id_column_exists', exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'value_objects'
      and column_name = 'root_value_object_id'
  )
  union all
  select 8, 'parent_id_column_exists', exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'value_objects'
      and column_name = 'parent_value_object_id'
  )
  union all
  select 9, 'owner_user_column_exists', exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'value_objects'
      and column_name = 'owner_user_id'
  )
  union all
  select 10, 'owner_actor_column_exists', exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'value_objects'
      and column_name = 'owner_actor_id'
  )
  union all
  select 11, 'old_guard_requires_controlled_flow', exists (
    select 1
    from pg_proc procedure_row
    join pg_namespace schema_row on schema_row.oid = procedure_row.pronamespace
    where schema_row.nspname = 'public'
      and procedure_row.proname = 'enforce_value_object_tree_v2'
      and pg_get_functiondef(procedure_row.oid)
        like '%VALUE_OBJECT_TREE_V2_SUBTREE_MOVE_REQUIRES_CONTROLLED_FLOW%'
  )
  union all
  select 12, 'p8_operations_table_absent',
    to_regclass('public.value_object_tree_operations') is null
  union all
  select 13, 'p8_items_table_absent',
    to_regclass('public.value_object_tree_operation_items') is null
  union all
  select 14, 'p8_preview_function_absent',
    to_regprocedure(
      'public.preview_value_object_tree_restructure_v1(uuid,uuid,uuid,text,jsonb)'
    ) is null
  union all
  select 15, 'p8_apply_function_absent',
    to_regprocedure(
      'public.apply_value_object_tree_restructure_v1(uuid,uuid,uuid,uuid,text,jsonb,text,text,text)'
    ) is null
  union all
  select 16, 'p8_rollback_function_absent',
    to_regprocedure(
      'public.rollback_value_object_tree_restructure_v1(uuid,uuid,uuid,uuid,text,text)'
    ) is null
)
select check_order, check_name, passed
from checks
order by check_order;

select
  count(*) filter (
    where node_role_code in ('structural', 'activity_leaf')
      and branch_type_code is not null
      and root_value_object_id is not null
  ) as v2_tree_rows,
  count(*) filter (
    where node_role_code = 'structural'
      and parent_value_object_id is null
      and root_value_object_id = id
  ) as root_rows,
  count(*) filter (
    where node_role_code = 'activity_leaf'
      and parent_value_object_id is not null
  ) as leaf_rows
from public.value_objects;
