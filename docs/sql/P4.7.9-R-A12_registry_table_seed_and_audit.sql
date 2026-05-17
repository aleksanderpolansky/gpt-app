-- P4.7.9-R-A12c/A12d
-- Seed and audit known-template registry table from activity_templates.default_metadata_json.
--
-- Important:
--   This SQL seeds public.activity_template_known_registry_rules from the current
--   transitional DB-backed registry v0.1 stored in activity_templates.default_metadata_json.
--
--   It does NOT switch runtime resolver behavior.
--   It does NOT modify knownTemplateRegistry / rubricatorCandidate / valueObjectMapping
--   inside activity_templates.default_metadata_json.
--
-- Expected known templates:
--   1) german-marketing-handwriting-practice
--   2) knee-training-health-practice

begin;

with source_templates as (
  select
    t.id as activity_template_id,
    t.slug as template_slug,
    t.default_metadata_json::jsonb as metadata
  from public.activity_templates t
  where t.slug in (
    'german-marketing-handwriting-practice',
    'knee-training-health-practice'
  )
    and t.default_metadata_json is not null
    and t.default_metadata_json::jsonb ? 'knownTemplateRegistry'
    and t.default_metadata_json::jsonb ? 'rubricatorCandidate'
    and t.default_metadata_json::jsonb ? 'valueObjectMapping'
),
prepared_registry_rows as (
  select
    activity_template_id,
    template_slug,

    coalesce(
      nullif(metadata #>> '{knownTemplateRegistry,enabled}', '')::boolean,
      true
    ) as enabled,

    nullif(metadata #>> '{knownTemplateRegistry,ruleKey}', '') as rule_key,

    coalesce(
      nullif(metadata #>> '{knownTemplateRegistry,sourceType}', ''),
      'system_seed'
    ) as source_type,

    coalesce(
      nullif(metadata #>> '{knownTemplateRegistry,classificationRole}', ''),
      'primary'
    ) as classification_role,

    coalesce(
      nullif(metadata #>> '{knownTemplateRegistry,confidence}', '')::numeric,
      1.0000
    ) as confidence,

    nullif(metadata #>> '{knownTemplateRegistry,registryVersion}', '') as registry_version,

    100 as priority,

    nullif(metadata #>> '{rubricatorCandidate,objectTypeCode}', '') as object_type_code,
    nullif(metadata #>> '{rubricatorCandidate,actionTypeCode}', '') as action_type_code,
    nullif(metadata #>> '{rubricatorCandidate,contextCode}', '') as context_code,
    nullif(metadata #>> '{rubricatorCandidate,contextualCategorySlug}', '') as contextual_category_slug,

    nullif(metadata #>> '{valueObjectMapping,valueObjectTitle}', '') as value_object_title,
    nullif(metadata #>> '{valueObjectMapping,valueObjectType}', '') as value_object_type,
    nullif(metadata #>> '{valueObjectMapping,relationType}', '') as relation_type,
    nullif(metadata #>> '{valueObjectMapping,metricKey}', '') as metric_key,
    nullif(metadata #>> '{valueObjectMapping,metricUnit}', '') as metric_unit,
    nullif(metadata #>> '{valueObjectMapping,deltaDirection}', '') as delta_direction,
    nullif(metadata #>> '{valueObjectMapping,aggregateType}', '') as aggregate_type,

    jsonb_build_object(
      'seedStep', 'P4.7.9-R-A12c',
      'source', 'activity_templates.default_metadata_json',
      'sourceRegistryVersion', metadata #>> '{knownTemplateRegistry,registryVersion}',
      'knownTemplateRegistry', metadata -> 'knownTemplateRegistry',
      'rubricatorCandidate', metadata -> 'rubricatorCandidate',
      'valueObjectMapping', metadata -> 'valueObjectMapping'
    ) as metadata_json
  from source_templates
)
insert into public.activity_template_known_registry_rules (
  activity_template_id,
  template_slug,
  enabled,
  rule_key,
  source_type,
  classification_role,
  confidence,
  registry_version,
  priority,
  object_type_code,
  action_type_code,
  context_code,
  contextual_category_slug,
  value_object_title,
  value_object_type,
  relation_type,
  metric_key,
  metric_unit,
  delta_direction,
  aggregate_type,
  metadata_json
)
select
  activity_template_id,
  template_slug,
  enabled,
  rule_key,
  source_type,
  classification_role,
  confidence,
  registry_version,
  priority,
  object_type_code,
  action_type_code,
  context_code,
  contextual_category_slug,
  value_object_title,
  value_object_type,
  relation_type,
  metric_key,
  metric_unit,
  delta_direction,
  aggregate_type,
  metadata_json
from prepared_registry_rows
on conflict (activity_template_id, classification_role)
do update set
  template_slug = excluded.template_slug,
  enabled = excluded.enabled,
  rule_key = excluded.rule_key,
  source_type = excluded.source_type,
  confidence = excluded.confidence,
  registry_version = excluded.registry_version,
  priority = excluded.priority,
  object_type_code = excluded.object_type_code,
  action_type_code = excluded.action_type_code,
  context_code = excluded.context_code,
  contextual_category_slug = excluded.contextual_category_slug,
  value_object_title = excluded.value_object_title,
  value_object_type = excluded.value_object_type,
  relation_type = excluded.relation_type,
  metric_key = excluded.metric_key,
  metric_unit = excluded.metric_unit,
  delta_direction = excluded.delta_direction,
  aggregate_type = excluded.aggregate_type,
  metadata_json = excluded.metadata_json,
  updated_at = now();

commit;

-- A12d audit: table rows after seed.
select
  'registry_rows_after_seed' as section,
  jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'activity_template_id', r.activity_template_id,
      'template_slug', r.template_slug,
      'enabled', r.enabled,
      'rule_key', r.rule_key,
      'source_type', r.source_type,
      'classification_role', r.classification_role,
      'confidence', r.confidence,
      'registry_version', r.registry_version,
      'object_type_code', r.object_type_code,
      'action_type_code', r.action_type_code,
      'context_code', r.context_code,
      'contextual_category_slug', r.contextual_category_slug,
      'value_object_title', r.value_object_title,
      'value_object_type', r.value_object_type,
      'relation_type', r.relation_type,
      'metric_key', r.metric_key,
      'metric_unit', r.metric_unit,
      'delta_direction', r.delta_direction,
      'aggregate_type', r.aggregate_type
    )
    order by r.template_slug
  ) as result
from public.activity_template_known_registry_rules r
where r.template_slug in (
  'german-marketing-handwriting-practice',
  'knee-training-health-practice'
);

-- A12d audit: compare registry table with activity_templates.default_metadata_json.
with expected as (
  select
    t.id as activity_template_id,
    t.slug as template_slug,
    t.default_metadata_json::jsonb as metadata,

    coalesce(
      nullif(t.default_metadata_json::jsonb #>> '{knownTemplateRegistry,enabled}', '')::boolean,
      true
    ) as enabled,

    t.default_metadata_json::jsonb #>> '{knownTemplateRegistry,ruleKey}' as rule_key,

    coalesce(
      nullif(t.default_metadata_json::jsonb #>> '{knownTemplateRegistry,sourceType}', ''),
      'system_seed'
    ) as source_type,

    coalesce(
      nullif(t.default_metadata_json::jsonb #>> '{knownTemplateRegistry,classificationRole}', ''),
      'primary'
    ) as classification_role,

    coalesce(
      nullif(t.default_metadata_json::jsonb #>> '{knownTemplateRegistry,confidence}', '')::numeric,
      1.0000
    ) as confidence,

    t.default_metadata_json::jsonb #>> '{knownTemplateRegistry,registryVersion}' as registry_version,

    t.default_metadata_json::jsonb #>> '{rubricatorCandidate,objectTypeCode}' as object_type_code,
    t.default_metadata_json::jsonb #>> '{rubricatorCandidate,actionTypeCode}' as action_type_code,
    t.default_metadata_json::jsonb #>> '{rubricatorCandidate,contextCode}' as context_code,
    t.default_metadata_json::jsonb #>> '{rubricatorCandidate,contextualCategorySlug}' as contextual_category_slug,

    t.default_metadata_json::jsonb #>> '{valueObjectMapping,valueObjectTitle}' as value_object_title,
    t.default_metadata_json::jsonb #>> '{valueObjectMapping,valueObjectType}' as value_object_type,
    t.default_metadata_json::jsonb #>> '{valueObjectMapping,relationType}' as relation_type,
    t.default_metadata_json::jsonb #>> '{valueObjectMapping,metricKey}' as metric_key,
    t.default_metadata_json::jsonb #>> '{valueObjectMapping,metricUnit}' as metric_unit,
    t.default_metadata_json::jsonb #>> '{valueObjectMapping,deltaDirection}' as delta_direction,
    t.default_metadata_json::jsonb #>> '{valueObjectMapping,aggregateType}' as aggregate_type
  from public.activity_templates t
  where t.slug in (
    'german-marketing-handwriting-practice',
    'knee-training-health-practice'
  )
),
actual as (
  select *
  from public.activity_template_known_registry_rules
  where template_slug in (
    'german-marketing-handwriting-practice',
    'knee-training-health-practice'
  )
),
comparison as (
  select
    e.template_slug,
    e.activity_template_id as expected_activity_template_id,
    a.activity_template_id as actual_activity_template_id,

    (a.activity_template_id = e.activity_template_id) as activity_template_id_ok,
    (a.enabled = e.enabled) as enabled_ok,
    (a.rule_key = e.rule_key) as rule_key_ok,
    (a.source_type = e.source_type) as source_type_ok,
    (a.classification_role = e.classification_role) as classification_role_ok,
    (a.confidence = e.confidence) as confidence_ok,
    (a.registry_version = e.registry_version) as registry_version_ok,

    (a.object_type_code = e.object_type_code) as object_type_code_ok,
    (a.action_type_code = e.action_type_code) as action_type_code_ok,
    (a.context_code = e.context_code) as context_code_ok,
    (a.contextual_category_slug = e.contextual_category_slug) as contextual_category_slug_ok,

    (a.value_object_title = e.value_object_title) as value_object_title_ok,
    (a.value_object_type = e.value_object_type) as value_object_type_ok,
    (a.relation_type = e.relation_type) as relation_type_ok,
    (a.metric_key = e.metric_key) as metric_key_ok,
    (a.metric_unit = e.metric_unit) as metric_unit_ok,
    (a.delta_direction = e.delta_direction) as delta_direction_ok,
    (a.aggregate_type = e.aggregate_type) as aggregate_type_ok
  from expected e
  left join actual a
    on a.activity_template_id = e.activity_template_id
   and a.classification_role = e.classification_role
)
select
  'table_vs_default_metadata_json_audit' as section,
  jsonb_build_object(
    'expectedCount', (select count(*) from expected),
    'actualCount', (select count(*) from actual),
    'allMatched',
      coalesce(bool_and(
        activity_template_id_ok
        and enabled_ok
        and rule_key_ok
        and source_type_ok
        and classification_role_ok
        and confidence_ok
        and registry_version_ok
        and object_type_code_ok
        and action_type_code_ok
        and context_code_ok
        and contextual_category_slug_ok
        and value_object_title_ok
        and value_object_type_ok
        and relation_type_ok
        and metric_key_ok
        and metric_unit_ok
        and delta_direction_ok
        and aggregate_type_ok
      ), false),
    'perTemplate',
      jsonb_agg(
        jsonb_build_object(
          'templateSlug', template_slug,
          'activityTemplateIdOk', activity_template_id_ok,
          'enabledOk', enabled_ok,
          'ruleKeyOk', rule_key_ok,
          'sourceTypeOk', source_type_ok,
          'classificationRoleOk', classification_role_ok,
          'confidenceOk', confidence_ok,
          'registryVersionOk', registry_version_ok,
          'objectTypeCodeOk', object_type_code_ok,
          'actionTypeCodeOk', action_type_code_ok,
          'contextCodeOk', context_code_ok,
          'contextualCategorySlugOk', contextual_category_slug_ok,
          'valueObjectTitleOk', value_object_title_ok,
          'valueObjectTypeOk', value_object_type_ok,
          'relationTypeOk', relation_type_ok,
          'metricKeyOk', metric_key_ok,
          'metricUnitOk', metric_unit_ok,
          'deltaDirectionOk', delta_direction_ok,
          'aggregateTypeOk', aggregate_type_ok
        )
        order by template_slug
      )
  ) as result
from comparison;

-- A12d audit: compact closure flags.
select
  'a12c_a12d_closure_flags' as section,
  jsonb_build_object(
    'tableExists', to_regclass('public.activity_template_known_registry_rules') is not null,
    'totalRegistryRowsForKnownTemplates',
      (
        select count(*)
        from public.activity_template_known_registry_rules
        where template_slug in (
          'german-marketing-handwriting-practice',
          'knee-training-health-practice'
        )
      ),
    'rlsEnabled',
      (
        select c.relrowsecurity
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relname = 'activity_template_known_registry_rules'
      ),
    'runtimeSwitchPerformed', false,
    'resolverChanged', false,
    'seedSource', 'activity_templates.default_metadata_json'
  ) as result;
