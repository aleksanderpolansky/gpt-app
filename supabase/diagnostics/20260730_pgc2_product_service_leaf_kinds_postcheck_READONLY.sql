-- ARCTor.app PGC2 product/service leaf kinds postcheck.
-- READ ONLY. No writes, no function execution.

with function_defs as (
  select
    p.proname,
    string_agg(pg_get_functiondef(p.oid), E'\n' order by p.oid) as definition
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      'enforce_value_object_tree_v2',
      'enforce_value_object_parameter_assignment_v3',
      'save_value_object_parameter_assignment_v2',
      'enforce_value_object_target_standard_v2',
      'preview_value_object_tree_restructure_v1'
    )
  group by p.proname
),
checks as (
  select
    '01_activity_leaf_constraint_present'::text as check_code,
    exists (
      select 1
      from pg_catalog.pg_constraint c
      join pg_catalog.pg_class t on t.oid = c.conrelid
      join pg_catalog.pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public'
        and t.relname = 'value_objects'
        and c.conname = 'value_objects_activity_leaf_shape_v3_check'
        and pg_get_constraintdef(c.oid, true) like '%product_type%'
        and pg_get_constraintdef(c.oid, true) like '%service_type%'
    ) as passed

  union all

  select
    '02_structural_leaf_kind_constraint_present',
    exists (
      select 1
      from pg_catalog.pg_constraint c
      join pg_catalog.pg_class t on t.oid = c.conrelid
      join pg_catalog.pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public'
        and t.relname = 'value_objects'
        and c.conname = 'value_objects_structural_kind_v3_check'
        and pg_get_constraintdef(c.oid, true) like '%product_type%'
        and pg_get_constraintdef(c.oid, true) like '%service_type%'
    )

  union all

  select
    '03_old_activity_leaf_constraint_removed',
    not exists (
      select 1
      from pg_catalog.pg_constraint c
      join pg_catalog.pg_class t on t.oid = c.conrelid
      join pg_catalog.pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public'
        and t.relname = 'value_objects'
        and c.conname = 'value_objects_activity_leaf_shape_v2_check'
    )

  union all

  select
    '04_no_invalid_leaf_rows',
    not exists (
      select 1
      from public.value_objects
      where node_role_code = 'activity_leaf'
        and (
          object_kind not in (
            'activity_pattern',
            'product_type',
            'service_type'
          )
          or parent_value_object_id is null
        )
    )

  union all

  select
    '05_no_structural_rows_with_leaf_kind',
    not exists (
      select 1
      from public.value_objects
      where node_role_code = 'structural'
        and object_kind in (
          'activity_pattern',
          'product_type',
          'service_type'
        )
    )

  union all

  select
    '06_tree_guard_knows_product_service',
    exists (
      select 1
      from function_defs
      where proname = 'enforce_value_object_tree_v2'
        and definition like '%product_type%'
        and definition like '%service_type%'
        and definition like '%VALUE_OBJECT_TREE_V2_STRUCTURAL_KIND_INVALID%'
    )

  union all

  select
    '07_parameter_guard_knows_product_service',
    exists (
      select 1
      from function_defs
      where proname = 'enforce_value_object_parameter_assignment_v3'
        and definition like '%product_type%'
        and definition like '%service_type%'
    )

  union all

  select
    '08_parameter_writer_knows_product_service',
    exists (
      select 1
      from function_defs
      where proname = 'save_value_object_parameter_assignment_v2'
        and definition like '%product_type%'
        and definition like '%service_type%'
    )

  union all

  select
    '09_target_guard_knows_product_service',
    exists (
      select 1
      from function_defs
      where proname = 'enforce_value_object_target_standard_v2'
        and definition like '%product_type%'
        and definition like '%service_type%'
    )

  union all

  select
    '10_restructure_preview_rejects_leaf_only_intermediate_kinds',
    exists (
      select 1
      from function_defs
      where proname = 'preview_value_object_tree_restructure_v1'
        and definition like '%product_type%'
        and definition like '%service_type%'
        and definition like '%P8_INTERMEDIATE_OBJECT_KIND_INVALID%'
    )

  union all

  select
    '11_existing_assignments_point_only_to_supported_leaves',
    not exists (
      select 1
      from public.value_object_parameter_assignments a
      join public.value_objects v on v.id = a.value_object_id
      where v.node_role_code is distinct from 'activity_leaf'
         or coalesce(v.object_kind, '') not in (
           'activity_pattern',
           'product_type',
           'service_type'
         )
    )

  union all

  select
    '12_existing_targets_point_only_to_supported_leaves',
    not exists (
      select 1
      from public.value_object_target_standard_versions t
      join public.value_object_parameter_assignments a
        on a.id = t.parameter_assignment_id
      join public.value_objects v on v.id = a.value_object_id
      where v.node_role_code is distinct from 'activity_leaf'
         or coalesce(v.object_kind, '') not in (
           'activity_pattern',
           'product_type',
           'service_type'
         )
    )
)
select
  check_code,
  passed
from checks
order by check_code;

select jsonb_build_object(
  'valueObjectCount', (
    select count(*) from public.value_objects
  ),
  'leafCounts', (
    select coalesce(
      jsonb_object_agg(object_kind, row_count order by object_kind),
      '{}'::jsonb
    )
    from (
      select object_kind, count(*) as row_count
      from public.value_objects
      where node_role_code = 'activity_leaf'
      group by object_kind
    ) leaf_rows
  ),
  'assignmentCount', (
    select count(*) from public.value_object_parameter_assignments
  ),
  'targetVersionCount', (
    select count(*) from public.value_object_target_standard_versions
  )
) as pgc2_summary;
