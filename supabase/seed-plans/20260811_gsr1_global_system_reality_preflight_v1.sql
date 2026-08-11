/*
ARCTor.app — GSR-1 Global System Reality Seed v1
DATABASE COMPATIBILITY PREFLIGHT — READ ONLY

THIS FILE IS NOT A MIGRATION.
It exists under supabase/seed-plans on purpose.
Do not move it into supabase/migrations until the machine contract and storage
parameter extensions have passed review.

Expected baseline:
main @ 220af0b45d6e91163c25d764d052658ffac32937
*/

begin read only;

select current_database() as database_name, now() as checked_at;

select
  to_regclass('public.value_objects') is not null as value_objects_exists,
  to_regclass('public.value_object_facet_registry') is not null as facet_registry_exists,
  to_regclass('public.value_object_kind_registry') is not null as kind_registry_exists,
  to_regclass('public.value_object_definition_versions') is not null as definition_versions_exists,
  to_regclass('public.value_object_parameter_definitions') is not null as parameter_definitions_exists,
  to_regclass('public.value_object_parameter_assignments') is not null as parameter_assignments_exists,
  to_regclass('public.value_object_relation_types') is not null as relation_types_exists,
  to_regclass('public.value_object_relations') is not null as relations_exists;

select
  column_name,
  is_nullable,
  data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'value_objects'
  and column_name in (
    'owner_actor_id',
    'actor_id',
    'app_user_id',
    'owner_user_id',
    'created_by_actor_id',
    'canonical_key',
    'facet_code',
    'object_kind_code',
    'ontology_node_role_code',
    'hierarchy_relation_code',
    'scope_code',
    'visibility_code',
    'privacy_class_code',
    'definition_version',
    'origin_type_code'
  )
order by ordinal_position;

select
  count(*) as ontology_ready_rows,
  count(*) filter (where scope_code = 'global') as existing_global_rows,
  count(*) filter (where scope_code = 'actor') as existing_actor_rows
from public.value_objects
where canonical_key is not null;

select
  canonical_key,
  count(*) as duplicate_count
from public.value_objects
where canonical_key is not null
group by canonical_key
having count(*) > 1
order by duplicate_count desc, canonical_key;

select
  object_kind_code,
  facet_code,
  allowed_node_roles_json,
  status,
  version
from public.value_object_kind_registry
where status = 'active'
order by facet_code, object_kind_code;

select
  parameter_code,
  dimension_code,
  value_type_code,
  canonical_unit_code,
  allowed_unit_codes,
  aggregation_method_code,
  default_window_code,
  status
from public.value_object_parameter_definitions
where scope_code = 'system'
  and status = 'active'
order by parameter_code;

select
  relation_type_code,
  status
from public.value_object_relation_types
order by relation_type_code;

select
  to_regprocedure('public.enforce_value_object_ontology_p1c()') is not null
    as ontology_guard_exists,
  to_regprocedure('public.write_value_object_definition_snapshot_p1c()') is not null
    as definition_snapshot_writer_exists;

rollback;
