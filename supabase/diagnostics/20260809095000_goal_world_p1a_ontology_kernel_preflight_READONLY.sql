-- ARCTor.app Goal World P1A
-- READ ONLY PRE-FLIGHT. No writes.

select
  current_database() as database_name,
  current_user as database_user,
  now() as checked_at;

select
  to_regclass('public.value_objects') is not null as value_objects_exists,
  to_regclass('public.actors') is not null as actors_exists,
  to_regclass('public.value_object_relation_types') is not null as relation_registry_exists,
  to_regclass('public.value_object_parameter_definitions') is not null as parameter_registry_exists,
  to_regclass('public.value_object_parameter_assignments') is not null as parameter_assignments_exists;

select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'value_objects'
  and column_name in (
    'id',
    'owner_actor_id',
    'parent_value_object_id',
    'root_value_object_id',
    'object_kind',
    'node_role_code',
    'branch_type_code',
    'status',
    'visibility',
    'privacy_level',
    'sensitivity_level'
  )
order by ordinal_position;

select
  branch_type_code,
  status
from public.value_object_branch_types
order by display_order, branch_type_code;

select
  count(*) as current_value_object_rows
from public.value_objects;

select
  count(*) filter (where node_role_code = 'structural') as legacy_structural_rows,
  count(*) filter (where node_role_code = 'activity_leaf') as legacy_activity_leaf_rows,
  count(*) filter (where node_role_code is null) as legacy_null_role_rows
from public.value_objects;
