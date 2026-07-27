-- ARCTor.app P8 hotfix postcheck
-- READ ONLY

with checks as (
  select
    1 as check_order,
    'extensions_digest_exists' as check_name,
    to_regprocedure('extensions.digest(bytea,text)') is not null as passed

  union all

  select
    2,
    'preview_search_path_includes_extensions',
    exists (
      select 1
      from pg_proc procedure_row
      join pg_namespace schema_row
        on schema_row.oid = procedure_row.pronamespace
      where schema_row.nspname = 'public'
        and procedure_row.oid = to_regprocedure(
          'public.preview_value_object_tree_restructure_v1(uuid,uuid,uuid,text,jsonb)'
        )
        and procedure_row.proconfig @>
          array['search_path=public, extensions, pg_temp']::text[]
    )

  union all

  select
    3,
    'operations_created_at_uses_clock_timestamp',
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'value_object_tree_operations'
        and column_name = 'created_at'
        and column_default = 'clock_timestamp()'
    )

  union all

  select
    4,
    'operation_items_created_at_uses_clock_timestamp',
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'value_object_tree_operation_items'
        and column_name = 'created_at'
        and column_default = 'clock_timestamp()'
    )

  union all

  select
    5,
    'rollback_newer_guard_filters_structural_operations',
    exists (
      select 1
      from pg_proc procedure_row
      join pg_namespace schema_row
        on schema_row.oid = procedure_row.pronamespace
      where schema_row.nspname = 'public'
        and procedure_row.oid = to_regprocedure(
          'public.rollback_value_object_tree_restructure_v1(uuid,uuid,uuid,uuid,text,text)'
        )
        and pg_get_functiondef(procedure_row.oid)
          like '%newer_operation.operation_type in (''reparent'', ''insert_intermediate'')%'
    )

  union all

  select
    6,
    'hierarchy_events_excluded_from_generic_dependency_scan',
    exists (
      select 1
      from pg_proc procedure_row
      join pg_namespace schema_row
        on schema_row.oid = procedure_row.pronamespace
      where schema_row.nspname = 'public'
        and procedure_row.oid = to_regprocedure(
          'public.rollback_value_object_tree_restructure_v1(uuid,uuid,uuid,uuid,text,text)'
        )
        and pg_get_functiondef(procedure_row.oid)
          like '%''value_object_hierarchy_events''%'
    )

  union all

  select
    7,
    'hierarchy_child_event_fk_cascade',
    exists (
      select 1
      from pg_constraint constraint_row
      where constraint_row.conname =
        'value_object_hierarchy_events_child_value_object_id_fkey'
        and constraint_row.confdeltype = 'c'
    )

  union all

  select
    8,
    'hierarchy_old_parent_fk_set_null',
    exists (
      select 1
      from pg_constraint constraint_row
      where constraint_row.conname =
        'value_object_hierarchy_events_old_parent_value_object_id_fkey'
        and constraint_row.confdeltype = 'n'
    )

  union all

  select
    9,
    'hierarchy_new_parent_fk_set_null',
    exists (
      select 1
      from pg_constraint constraint_row
      where constraint_row.conname =
        'value_object_hierarchy_events_new_parent_value_object_id_fkey'
        and constraint_row.confdeltype = 'n'
    )
)
select
  check_order,
  check_name,
  passed
from checks
order by check_order;
