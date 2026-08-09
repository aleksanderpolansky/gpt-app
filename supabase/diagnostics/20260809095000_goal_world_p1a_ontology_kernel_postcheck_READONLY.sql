-- ARCTor.app Goal World P1A
-- READ ONLY POSTCHECK. Run only after the migration is applied.

with checks as (
  select '01_facet_registry_exists' as check_name,
         to_regclass('public.value_object_facet_registry') is not null as passed
  union all
  select '02_kind_registry_exists',
         to_regclass('public.value_object_kind_registry') is not null
  union all
  select '03_definition_versions_exists',
         to_regclass('public.value_object_definition_versions') is not null
  union all
  select '04_value_objects_canonical_key',
         exists (
           select 1 from information_schema.columns
           where table_schema='public'
             and table_name='value_objects'
             and column_name='canonical_key'
         )
  union all
  select '05_value_objects_facet_code',
         exists (
           select 1 from information_schema.columns
           where table_schema='public'
             and table_name='value_objects'
             and column_name='facet_code'
         )
  union all
  select '06_value_objects_object_kind_code',
         exists (
           select 1 from information_schema.columns
           where table_schema='public'
             and table_name='value_objects'
             and column_name='object_kind_code'
         )
  union all
  select '07_value_objects_ontology_node_role',
         exists (
           select 1 from information_schema.columns
           where table_schema='public'
             and table_name='value_objects'
             and column_name='ontology_node_role_code'
         )
  union all
  select '08_value_objects_hierarchy_relation',
         exists (
           select 1 from information_schema.columns
           where table_schema='public'
             and table_name='value_objects'
             and column_name='hierarchy_relation_code'
         )
  union all
  select '09_value_objects_scope',
         exists (
           select 1 from information_schema.columns
           where table_schema='public'
             and table_name='value_objects'
             and column_name='scope_code'
         )
  union all
  select '10_value_objects_privacy_axes',
         exists (
           select 1 from information_schema.columns
           where table_schema='public'
             and table_name='value_objects'
             and column_name='visibility_code'
         )
         and exists (
           select 1 from information_schema.columns
           where table_schema='public'
             and table_name='value_objects'
             and column_name='privacy_class_code'
         )
  union all
  select '11_value_objects_version_origin',
         exists (
           select 1 from information_schema.columns
           where table_schema='public'
             and table_name='value_objects'
             and column_name='definition_version'
         )
         and exists (
           select 1 from information_schema.columns
           where table_schema='public'
             and table_name='value_objects'
             and column_name='origin_type_code'
         )
  union all
  select '12_facet_seed_count',
         (select count(*) from public.value_object_facet_registry where status='active') >= 9
)
select check_name, passed
from checks
order by check_name;

select
  facet_code,
  status,
  version
from public.value_object_facet_registry
order by display_order;

select
  object_kind_code,
  facet_code,
  allowed_node_roles_json,
  status,
  version
from public.value_object_kind_registry
order by facet_code, object_kind_code;

-- P1A must not reinterpret old runtime values.
select
  count(*) filter (where node_role_code = 'structural') as legacy_structural_rows,
  count(*) filter (where node_role_code = 'activity_leaf') as legacy_activity_leaf_rows,
  count(*) filter (where ontology_node_role_code is not null) as p1a_semantic_role_rows
from public.value_objects;
