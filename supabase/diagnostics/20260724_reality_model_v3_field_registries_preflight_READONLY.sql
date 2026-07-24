-- ARCTor.app Reality Model v3 / P5 field registries preflight
-- SELECT-only. No schema or data writes.

select
  'required_relations' as section,
  required_name,
  to_regclass('public.' || required_name) as relation_name
from (
  values
    ('value_objects'),
    ('value_object_branch_types'),
    ('actor_public_profiles'),
    ('actors'),
    ('app_users')
) required(required_name)
order by required_name;

select
  'value_objects_required_columns' as section,
  required.column_name,
  columns.data_type,
  columns.is_nullable,
  columns.column_default
from (
  values
    ('id'),
    ('owner_user_id'),
    ('owner_actor_id'),
    ('created_by_actor_id'),
    ('object_kind'),
    ('node_role_code'),
    ('branch_type_code'),
    ('root_value_object_id'),
    ('parent_value_object_id'),
    ('instance_of_value_object_id'),
    ('title'),
    ('description'),
    ('status'),
    ('visibility'),
    ('source')
) required(column_name)
left join information_schema.columns columns
  on columns.table_schema = 'public'
 and columns.table_name = 'value_objects'
 and columns.column_name = required.column_name
order by required.column_name;

select
  'existing_p5_relations' as section,
  candidate.relation_name,
  to_regclass('public.' || candidate.relation_name) as existing_relation
from (
  values
    ('value_object_attribute_registry'),
    ('value_object_criterion_types'),
    ('value_object_criterion_comparators'),
    ('value_object_relation_types'),
    ('value_object_target_kinds'),
    ('value_object_normalization_policies'),
    ('value_object_profile_attributes'),
    ('value_object_outcome_criteria')
) candidate(relation_name)
order by candidate.relation_name;

select
  'current_value_object_count' as section,
  count(*) as value_objects_count
from public.value_objects;

select
  'legacy_target_standards_relation' as section,
  to_regclass('public.value_object_target_standards') as relation_name;

select
  'actor_ownership_function' as section,
  to_regprocedure('public.enforce_value_object_actor_ownership_v2()') as function_name;
