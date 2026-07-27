-- ARCTor.app
-- P9A branch policy / object kind live audit
-- READ ONLY
--
-- Run in Supabase SQL Editor as role postgres.
-- Returns one result set so Supabase does not hide earlier SELECT results.

with
branch_rows as (
  select
    branch_type.branch_type_code,
    branch_type.title_key,
    branch_type.description_key,
    branch_type.display_order,
    branch_type.status,
    (
      select count(*)
      from public.value_objects value_object
      where value_object.branch_type_code =
        branch_type.branch_type_code
    ) as value_object_count,
    (
      select count(*)
      from public.value_objects value_object
      where value_object.branch_type_code =
        branch_type.branch_type_code
        and value_object.parent_value_object_id is null
        and value_object.root_value_object_id = value_object.id
    ) as root_count
  from public.value_object_branch_types branch_type
),
object_kind_rows as (
  select
    coalesce(value_object.object_kind, '<null>') as object_kind,
    count(*) as value_object_count,
    count(*) filter (
      where value_object.node_role_code = 'structural'
    ) as structural_count,
    count(*) filter (
      where value_object.node_role_code = 'activity_leaf'
    ) as activity_leaf_count
  from public.value_objects value_object
  group by coalesce(value_object.object_kind, '<null>')
),
branch_kind_rows as (
  select
    coalesce(value_object.branch_type_code, '<null>') as branch_type_code,
    coalesce(value_object.object_kind, '<null>') as object_kind,
    count(*) as value_object_count
  from public.value_objects value_object
  group by
    coalesce(value_object.branch_type_code, '<null>'),
    coalesce(value_object.object_kind, '<null>')
),
precision_rows as (
  select
    precision_preference.branch_type_code,
    count(*) as preference_count
  from public.fact_capture_precision_preferences precision_preference
  where precision_preference.scope_code = 'branch_type'
  group by precision_preference.branch_type_code
),
attribute_registry_summary as (
  select
    count(*) as registry_rows,
    count(*) filter (
      where jsonb_array_length(attribute_row.applicable_branch_type_codes) > 0
    ) as rows_restricted_by_branch,
    count(*) filter (
      where jsonb_array_length(attribute_row.applicable_object_kinds) > 0
    ) as rows_restricted_by_object_kind
  from public.value_object_attribute_registry attribute_row
),
future_relation_rows as (
  select
    relation_type.relation_type_code,
    relation_type.status,
    relation_type.from_scope_code,
    relation_type.to_scope_code
  from public.value_object_relation_types relation_type
  where relation_type.relation_type_code in (
    'threatens',
    'opportunity_for',
    'indicated_by'
  )
),
column_checks as (
  select
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'value_objects'
        and column_name = 'project_scope'
    ) as project_scope_exists,
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'value_objects'
        and column_name in (
          'semantic_group',
          'semantic_group_code',
          'meaning_group_code'
        )
    ) as semantic_group_column_exists
)

select
  '01_branch_registry' as section,
  lpad(branch_row.display_order::text, 4, '0') ||
    '_' || branch_row.branch_type_code as item,
  jsonb_build_object(
    'branchTypeCode', branch_row.branch_type_code,
    'titleKey', branch_row.title_key,
    'descriptionKey', branch_row.description_key,
    'displayOrder', branch_row.display_order,
    'status', branch_row.status,
    'valueObjectCount', branch_row.value_object_count,
    'rootCount', branch_row.root_count
  ) as details
from branch_rows branch_row

union all

select
  '02_object_kind_usage',
  object_kind_row.object_kind,
  jsonb_build_object(
    'valueObjectCount', object_kind_row.value_object_count,
    'structuralCount', object_kind_row.structural_count,
    'activityLeafCount', object_kind_row.activity_leaf_count
  )
from object_kind_rows object_kind_row

union all

select
  '03_branch_kind_usage',
  branch_kind_row.branch_type_code || '__' ||
    branch_kind_row.object_kind,
  jsonb_build_object(
    'branchTypeCode', branch_kind_row.branch_type_code,
    'objectKind', branch_kind_row.object_kind,
    'valueObjectCount', branch_kind_row.value_object_count
  )
from branch_kind_rows branch_kind_row

union all

select
  '04_branch_precision_preferences',
  coalesce(precision_row.branch_type_code, '<null>'),
  jsonb_build_object(
    'preferenceCount', precision_row.preference_count
  )
from precision_rows precision_row

union all

select
  '05_attribute_registry',
  'summary',
  jsonb_build_object(
    'registryRows', summary.registry_rows,
    'rowsRestrictedByBranch', summary.rows_restricted_by_branch,
    'rowsRestrictedByObjectKind',
      summary.rows_restricted_by_object_kind
  )
from attribute_registry_summary summary

union all

select
  '06_future_relation_type',
  future_relation.relation_type_code,
  jsonb_build_object(
    'status', future_relation.status,
    'fromScope', future_relation.from_scope_code,
    'toScope', future_relation.to_scope_code
  )
from future_relation_rows future_relation

union all

select
  '07_schema_absence_checks',
  'project_and_semantic_group',
  jsonb_build_object(
    'projectScopeExists', column_check.project_scope_exists,
    'semanticGroupColumnExists',
      column_check.semantic_group_column_exists
  )
from column_checks column_check

order by section, item;
