/*
ARCTor.app — Reality Model v2 / P3 Tree schema postcheck

SELECT-only. Run only after the P3 migration has completed.
The statement returns structural checks and compatibility counts.
It does not create, update or delete data.
*/

with recursive
expected_branch_types(branch_type_code) as (
  values
    ('external_capital'::text),
    ('internal_capability'::text),
    ('resource'::text),
    ('biological_system'::text),
    ('mediator_hormone'::text)
),
branch_type_difference as (
  (
    select branch_type_code
    from expected_branch_types

    except

    select branch_type_code
    from public.value_object_branch_types
    where status = 'active'
  )

  union all

  (
    select branch_type_code
    from public.value_object_branch_types
    where status = 'active'

    except

    select branch_type_code
    from expected_branch_types
  )
),
expected_columns(column_name) as (
  values
    ('object_kind'::text),
    ('node_role_code'::text),
    ('branch_type_code'::text),
    ('root_value_object_id'::text),
    ('parent_value_object_id'::text),
    ('instance_of_value_object_id'::text)
),
missing_columns as (
  select expected.column_name
  from expected_columns expected
  left join information_schema.columns actual
    on actual.table_schema = 'public'
   and actual.table_name = 'value_objects'
   and actual.column_name = expected.column_name
  where actual.column_name is null
),
expected_constraints(constraint_name) as (
  values
    ('value_objects_object_kind_v2_check'::text),
    ('value_objects_node_role_code_v2_check'::text),
    ('value_objects_tree_v2_complete_check'::text),
    ('value_objects_value_type_object_kind_lock_v2_check'::text),
    ('value_objects_activity_leaf_shape_v2_check'::text),
    ('value_objects_root_shape_v2_check'::text),
    ('value_objects_instance_not_self_v2_check'::text),
    ('value_objects_parent_instance_distinct_v2_check'::text),
    ('value_objects_parent_value_object_id_fkey'::text),
    ('value_objects_branch_type_code_v2_fkey'::text),
    ('value_objects_root_value_object_id_v2_fkey'::text),
    ('value_objects_instance_of_value_object_id_v2_fkey'::text)
),
missing_constraints as (
  select expected.constraint_name
  from expected_constraints expected
  left join pg_constraint actual
    on actual.conrelid = 'public.value_objects'::regclass
   and actual.conname = expected.constraint_name
  where actual.oid is null
),
tree_walk as (
  select
    value_object.id as start_id,
    value_object.id as current_id,
    value_object.parent_value_object_id,
    array[value_object.id]::uuid[] as visited_ids,
    false as has_cycle
  from public.value_objects value_object
  where value_object.node_role_code is not null

  union all

  select
    previous.start_id,
    parent.id,
    parent.parent_value_object_id,
    previous.visited_ids || parent.id,
    parent.id = any(previous.visited_ids)
  from tree_walk previous
  join public.value_objects parent
    on parent.id = previous.parent_value_object_id
  where previous.parent_value_object_id is not null
    and not previous.has_cycle
),
checks(check_name, severity, observed_count, expected_count) as (
  select
    'branch_type_registry_exact',
    'error',
    (select count(*) from branch_type_difference),
    0::bigint

  union all

  select
    'missing_tree_columns',
    'error',
    (select count(*) from missing_columns),
    0::bigint

  union all

  select
    'missing_tree_constraints',
    'error',
    (select count(*) from missing_constraints),
    0::bigint

  union all

  select
    'missing_tree_trigger',
    'error',
    (
      select count(*)
      from (values (1)) required(dummy)
      where not exists (
        select 1
        from pg_trigger
        where tgrelid = 'public.value_objects'::regclass
          and tgname = 'value_objects_tree_v2_enforce_trg'
          and not tgisinternal
      )
    ),
    0::bigint

  union all

  select
    'branch_registry_rls_disabled',
    'error',
    (
      select count(*)
      from pg_class relation
      join pg_namespace namespace
        on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public'
        and relation.relname = 'value_object_branch_types'
        and not relation.relrowsecurity
    ),
    0::bigint

  union all

  select
    'branch_registry_browser_write_grants',
    'error',
    (
      select count(*)
      from information_schema.role_table_grants
      where table_schema = 'public'
        and table_name = 'value_object_branch_types'
        and grantee in ('anon', 'authenticated')
        and privilege_type in (
          'INSERT',
          'UPDATE',
          'DELETE',
          'TRUNCATE',
          'REFERENCES',
          'TRIGGER'
        )
    ),
    0::bigint

  union all

  select
    'incomplete_v2_tree_rows',
    'error',
    count(*),
    0::bigint
  from public.value_objects
  where (
      object_kind is not null
      or node_role_code is not null
      or branch_type_code is not null
      or root_value_object_id is not null
      or instance_of_value_object_id is not null
    )
    and (
      object_kind is null
      or node_role_code is null
      or branch_type_code is null
      or root_value_object_id is null
    )

  union all

  select
    'invalid_v2_root_rows',
    'error',
    count(*),
    0::bigint
  from public.value_objects
  where node_role_code is not null
    and parent_value_object_id is null
    and (
      node_role_code <> 'structural'
      or root_value_object_id <> id
    )

  union all

  select
    'v2_parent_branch_or_root_mismatch',
    'error',
    count(*),
    0::bigint
  from public.value_objects child
  join public.value_objects parent
    on parent.id = child.parent_value_object_id
  where child.node_role_code is not null
    and (
      parent.node_role_code <> 'structural'
      or parent.branch_type_code is distinct from child.branch_type_code
      or parent.root_value_object_id is distinct from child.root_value_object_id
    )

  union all

  select
    'activity_leaf_rows_with_children',
    'error',
    count(distinct parent.id),
    0::bigint
  from public.value_objects parent
  join public.value_objects child
    on child.parent_value_object_id = parent.id
  where parent.node_role_code = 'activity_leaf'

  union all

  select
    'v2_tree_cycle_start_nodes',
    'error',
    count(distinct start_id),
    0::bigint
  from tree_walk
  where has_cycle

  union all

  select
    'v2_rows',
    'info',
    count(*),
    null::bigint
  from public.value_objects
  where node_role_code is not null

  union all

  select
    'legacy_rows_pending_cutover',
    'info',
    count(*),
    null::bigint
  from public.value_objects
  where node_role_code is null
)
select
  check_name,
  severity,
  observed_count,
  expected_count,
  case
    when expected_count is null then true
    else observed_count = expected_count
  end as ok
from checks
order by
  case severity when 'error' then 0 else 1 end,
  check_name;
