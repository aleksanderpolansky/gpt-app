-- ARCTor.app P8 tree restructure postcheck
-- READ ONLY. Run after applying 20260727100000_p8_value_object_tree_restructure.sql.

with checks as (
  select 1 as check_order, 'operations_table_exists' as check_name,
    to_regclass('public.value_object_tree_operations') is not null as passed
  union all
  select 2, 'operation_items_table_exists',
    to_regclass('public.value_object_tree_operation_items') is not null
  union all
  select 3, 'preview_function_exists',
    to_regprocedure(
      'public.preview_value_object_tree_restructure_v1(uuid,uuid,uuid,text,jsonb)'
    ) is not null
  union all
  select 4, 'apply_function_exists',
    to_regprocedure(
      'public.apply_value_object_tree_restructure_v1(uuid,uuid,uuid,uuid,text,jsonb,text,text,text)'
    ) is not null
  union all
  select 5, 'rollback_function_exists',
    to_regprocedure(
      'public.rollback_value_object_tree_restructure_v1(uuid,uuid,uuid,uuid,text,text)'
    ) is not null
  union all
  select 6, 'path_helper_exists',
    to_regprocedure(
      'public.p8_value_object_tree_path_json(uuid,uuid,uuid)'
    ) is not null
  union all
  select 7, 'node_helper_exists',
    to_regprocedure('public.p8_value_object_tree_node_json(uuid)') is not null
  union all
  select 8, 'operations_rls_enabled', exists (
    select 1 from pg_class table_row
    join pg_namespace schema_row on schema_row.oid = table_row.relnamespace
    where schema_row.nspname = 'public'
      and table_row.relname = 'value_object_tree_operations'
      and table_row.relrowsecurity
  )
  union all
  select 9, 'items_rls_enabled', exists (
    select 1 from pg_class table_row
    join pg_namespace schema_row on schema_row.oid = table_row.relnamespace
    where schema_row.nspname = 'public'
      and table_row.relname = 'value_object_tree_operation_items'
      and table_row.relrowsecurity
  )
  union all
  select 10, 'operations_no_anon_table_privileges', not has_table_privilege(
    'anon', 'public.value_object_tree_operations', 'select,insert,update,delete'
  )
  union all
  select 11, 'operations_no_authenticated_table_privileges', not has_table_privilege(
    'authenticated', 'public.value_object_tree_operations', 'select,insert,update,delete'
  )
  union all
  select 12, 'items_no_anon_table_privileges', not has_table_privilege(
    'anon', 'public.value_object_tree_operation_items', 'select,insert,update,delete'
  )
  union all
  select 13, 'items_no_authenticated_table_privileges', not has_table_privilege(
    'authenticated', 'public.value_object_tree_operation_items', 'select,insert,update,delete'
  )
  union all
  select 14, 'preview_no_anon_execute', not has_function_privilege(
    'anon',
    'public.preview_value_object_tree_restructure_v1(uuid,uuid,uuid,text,jsonb)',
    'execute'
  )
  union all
  select 15, 'preview_no_authenticated_execute', not has_function_privilege(
    'authenticated',
    'public.preview_value_object_tree_restructure_v1(uuid,uuid,uuid,text,jsonb)',
    'execute'
  )
  union all
  select 16, 'apply_no_anon_execute', not has_function_privilege(
    'anon',
    'public.apply_value_object_tree_restructure_v1(uuid,uuid,uuid,uuid,text,jsonb,text,text,text)',
    'execute'
  )
  union all
  select 17, 'apply_no_authenticated_execute', not has_function_privilege(
    'authenticated',
    'public.apply_value_object_tree_restructure_v1(uuid,uuid,uuid,uuid,text,jsonb,text,text,text)',
    'execute'
  )
  union all
  select 18, 'rollback_no_anon_execute', not has_function_privilege(
    'anon',
    'public.rollback_value_object_tree_restructure_v1(uuid,uuid,uuid,uuid,text,text)',
    'execute'
  )
  union all
  select 19, 'rollback_no_authenticated_execute', not has_function_privilege(
    'authenticated',
    'public.rollback_value_object_tree_restructure_v1(uuid,uuid,uuid,uuid,text,text)',
    'execute'
  )
  union all
  select 20, 'service_role_preview_execute', has_function_privilege(
    'service_role',
    'public.preview_value_object_tree_restructure_v1(uuid,uuid,uuid,text,jsonb)',
    'execute'
  )
  union all
  select 21, 'service_role_apply_execute', has_function_privilege(
    'service_role',
    'public.apply_value_object_tree_restructure_v1(uuid,uuid,uuid,uuid,text,jsonb,text,text,text)',
    'execute'
  )
  union all
  select 22, 'service_role_rollback_execute', has_function_privilege(
    'service_role',
    'public.rollback_value_object_tree_restructure_v1(uuid,uuid,uuid,uuid,text,text)',
    'execute'
  )
  union all
  select 23, 'tree_guard_trigger_exists', exists (
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
  select 24, 'tree_guard_has_transaction_setting', exists (
    select 1
    from pg_proc procedure_row
    join pg_namespace schema_row on schema_row.oid = procedure_row.pronamespace
    where schema_row.nspname = 'public'
      and procedure_row.proname = 'enforce_value_object_tree_v2'
      and pg_get_functiondef(procedure_row.oid)
        like '%arctor.p8_tree_operation_id%'
  )
  union all
  select 25, 'tree_guard_still_blocks_uncontrolled_subtree_move', exists (
    select 1
    from pg_proc procedure_row
    join pg_namespace schema_row on schema_row.oid = procedure_row.pronamespace
    where schema_row.nspname = 'public'
      and procedure_row.proname = 'enforce_value_object_tree_v2'
      and pg_get_functiondef(procedure_row.oid)
        like '%VALUE_OBJECT_TREE_V2_SUBTREE_MOVE_REQUIRES_CONTROLLED_FLOW%'
  )
  union all
  select 26, 'operation_type_constraint_exists', exists (
    select 1 from pg_constraint constraint_row
    where constraint_row.conname = 'value_object_tree_operations_type_check'
  )
  union all
  select 27, 'operation_idempotency_unique_exists', exists (
    select 1 from pg_constraint constraint_row
    where constraint_row.conname = 'value_object_tree_operations_idempotency_unique'
  )
  union all
  select 28, 'operation_item_unique_exists', exists (
    select 1 from pg_constraint constraint_row
    where constraint_row.conname = 'value_object_tree_operation_items_unique'
  )
)
select check_order, check_name, passed
from checks
order by check_order;

select
  count(*) as operation_rows,
  count(*) filter (where status = 'applied') as applied_rows,
  count(*) filter (where status = 'rolled_back') as rolled_back_rows
from public.value_object_tree_operations;

select
  count(*) as operation_item_rows,
  count(distinct operation_id) as operations_with_items
from public.value_object_tree_operation_items;
