-- P4.7.9-R-A3
-- Known-template metadata normalization and post-normalization audit.
--
-- Date: 2026-05-16
-- Scope:
--   1) Normalize activity_templates.default_metadata_json for two known templates.
--   2) Keep changes limited to default_metadata_json.
--   3) Verify metadata can work as transitional DB-backed registry v0.1.
--
-- Templates:
--   - german-marketing-handwriting-practice
--   - knee-training-health-practice
--
-- Safety:
--   - Updates ONLY public.activity_templates.default_metadata_json.
--   - Does NOT touch activity_events.
--   - Does NOT touch entity_classifications.
--   - Does NOT touch value_objects.
--   - Does NOT touch impact_rules.
--   - Idempotent: repeated run should update 0 rows after first successful run.
--
-- Verified result from live DB:
--   bothTemplatesHaveKnownTemplateRegistry = true
--   bothTemplatesHaveRubricatorCandidate = true
--   bothTemplatesHaveValueObjectTitle = true
--   bothTemplatesHaveValueObjectMapping = true
--   a3cReadyToDocumentAndCommit = true

-- ============================================================
-- A3b: idempotent metadata normalization
-- ============================================================

drop table if exists pg_temp.p479_a3b_before;
drop table if exists pg_temp.p479_a3b_desired;
drop table if exists pg_temp.p479_a3b_updated;

create temp table pg_temp.p479_a3b_before as
select
  t.id,
  t.slug,
  t.default_metadata_json as before_metadata
from public.activity_templates t
where t.slug in (
  'german-marketing-handwriting-practice',
  'knee-training-health-practice'
);

create temp table pg_temp.p479_a3b_desired as
select
  t.id,
  t.slug,
  case
    when t.slug = 'german-marketing-handwriting-practice' then
      coalesce(t.default_metadata_json, '{}'::jsonb)
      || jsonb_build_object(
        'knownTemplateRegistry', jsonb_build_object(
          'enabled', true,
          'ruleKey', 'german_marketing_handwriting_practice_to_business_german',
          'templateSlug', 'german-marketing-handwriting-practice',
          'sourceType', 'system_seed',
          'classificationRole', 'primary',
          'confidence', 1,
          'registryVersion', 'v0.1-default_metadata_json'
        ),
        'rubricatorCandidate', jsonb_build_object(
          'objectTypeCode', 'German_language',
          'actionTypeCode', 'practice',
          'contextCode', 'learning',
          'contextualCategorySlug', 'business-german'
        ),
        'valueObjectTitle', 'Business German writing practice',
        'valueObjectMapping', jsonb_build_object(
          'valueObjectTitle', 'Business German writing practice',
          'valueObjectType', 'skill',
          'relationType', 'executes',
          'metricKey', 'duration_minutes',
          'metricUnit', 'minutes',
          'deltaDirection', 'increase',
          'aggregateType', 'value_object'
        )
      )

    when t.slug = 'knee-training-health-practice' then
      coalesce(t.default_metadata_json, '{}'::jsonb)
      || jsonb_build_object(
        'knownTemplateRegistry', jsonb_build_object(
          'enabled', true,
          'ruleKey', 'knee_training_health_practice_to_knee_exercises',
          'templateSlug', 'knee-training-health-practice',
          'sourceType', 'system_seed',
          'classificationRole', 'primary',
          'confidence', 1,
          'registryVersion', 'v0.1-default_metadata_json'
        ),
        'rubricatorCandidate', jsonb_build_object(
          'objectTypeCode', 'knee',
          'actionTypeCode', 'train',
          'contextCode', 'health',
          'contextualCategorySlug', 'knee-exercises'
        ),
        'valueObjectTitle', 'Knee training practice',
        'valueObjectMapping', jsonb_build_object(
          'valueObjectTitle', 'Knee training practice',
          'valueObjectType', 'health_activity',
          'relationType', 'executes',
          'metricKey', 'duration_minutes',
          'metricUnit', 'minutes',
          'deltaDirection', 'increase',
          'aggregateType', 'value_object'
        )
      )

    else
      t.default_metadata_json
  end as desired_metadata
from public.activity_templates t
where t.slug in (
  'german-marketing-handwriting-practice',
  'knee-training-health-practice'
);

create temp table pg_temp.p479_a3b_updated (
  id uuid,
  slug text,
  before_metadata jsonb,
  after_metadata jsonb
);

with updated as (
  update public.activity_templates t
  set default_metadata_json = d.desired_metadata
  from pg_temp.p479_a3b_desired d
  where t.id = d.id
    and t.default_metadata_json is distinct from d.desired_metadata
  returning
    t.id,
    t.slug,
    t.default_metadata_json as after_metadata
)
insert into pg_temp.p479_a3b_updated (
  id,
  slug,
  before_metadata,
  after_metadata
)
select
  u.id,
  u.slug,
  b.before_metadata,
  u.after_metadata
from updated u
join pg_temp.p479_a3b_before b
  on b.id = u.id;

select
  'p479_a3b_update_summary' as section,
  jsonb_pretty(
    jsonb_build_object(
      'updated_rows_count', (
        select count(*)
        from pg_temp.p479_a3b_updated
      ),
      'updated_templates', (
        select coalesce(
          jsonb_agg(slug order by slug),
          '[]'::jsonb
        )
        from pg_temp.p479_a3b_updated
      ),
      'note', 'Expected first run: 2 updated templates. Expected repeated run: 0 updated templates.'
    )
  ) as data;

select
  'p479_a3b_post_metadata_key_audit' as section,
  jsonb_pretty(
    jsonb_agg(
      jsonb_build_object(
        'slug', t.slug,
        'has_default_metadata_json', t.default_metadata_json is not null,
        'has_knownTemplateRegistry', coalesce(t.default_metadata_json, '{}'::jsonb) ? 'knownTemplateRegistry',
        'has_rubricatorCandidate', coalesce(t.default_metadata_json, '{}'::jsonb) ? 'rubricatorCandidate',
        'has_valueObjectTitle', coalesce(t.default_metadata_json, '{}'::jsonb) ? 'valueObjectTitle',
        'has_valueObjectMapping', coalesce(t.default_metadata_json, '{}'::jsonb) ? 'valueObjectMapping',
        'knownTemplateRegistry', t.default_metadata_json -> 'knownTemplateRegistry',
        'rubricatorCandidate', t.default_metadata_json -> 'rubricatorCandidate',
        'valueObjectTitle', t.default_metadata_json -> 'valueObjectTitle',
        'valueObjectMapping', t.default_metadata_json -> 'valueObjectMapping'
      )
      order by t.slug
    )
  ) as data
from public.activity_templates t
where t.slug in (
  'german-marketing-handwriting-practice',
  'knee-training-health-practice'
);

select
  'p479_a3b_strict_flags' as section,
  jsonb_pretty(
    jsonb_build_object(
      'templates_count', count(*),

      'bothTemplatesHaveKnownTemplateRegistry',
        bool_and(coalesce(default_metadata_json, '{}'::jsonb) ? 'knownTemplateRegistry'),

      'bothTemplatesHaveRubricatorCandidate',
        bool_and(coalesce(default_metadata_json, '{}'::jsonb) ? 'rubricatorCandidate'),

      'bothTemplatesHaveValueObjectTitle',
        bool_and(coalesce(default_metadata_json, '{}'::jsonb) ? 'valueObjectTitle'),

      'bothTemplatesHaveValueObjectMapping',
        bool_and(coalesce(default_metadata_json, '{}'::jsonb) ? 'valueObjectMapping'),

      'germanRuleKeyOk',
        bool_or(
          slug = 'german-marketing-handwriting-practice'
          and default_metadata_json #>> '{knownTemplateRegistry,ruleKey}'
            = 'german_marketing_handwriting_practice_to_business_german'
        ),

      'germanRubricatorCandidateOk',
        bool_or(
          slug = 'german-marketing-handwriting-practice'
          and default_metadata_json #>> '{rubricatorCandidate,objectTypeCode}' = 'German_language'
          and default_metadata_json #>> '{rubricatorCandidate,actionTypeCode}' = 'practice'
          and default_metadata_json #>> '{rubricatorCandidate,contextCode}' = 'learning'
          and default_metadata_json #>> '{rubricatorCandidate,contextualCategorySlug}' = 'business-german'
        ),

      'germanValueObjectMappingOk',
        bool_or(
          slug = 'german-marketing-handwriting-practice'
          and default_metadata_json #>> '{valueObjectMapping,valueObjectTitle}'
            = 'Business German writing practice'
          and default_metadata_json #>> '{valueObjectMapping,valueObjectType}'
            = 'skill'
          and default_metadata_json #>> '{valueObjectMapping,metricKey}'
            = 'duration_minutes'
        ),

      'kneeRuleKeyOk',
        bool_or(
          slug = 'knee-training-health-practice'
          and default_metadata_json #>> '{knownTemplateRegistry,ruleKey}'
            = 'knee_training_health_practice_to_knee_exercises'
        ),

      'kneeRubricatorCandidateOk',
        bool_or(
          slug = 'knee-training-health-practice'
          and default_metadata_json #>> '{rubricatorCandidate,objectTypeCode}' = 'knee'
          and default_metadata_json #>> '{rubricatorCandidate,actionTypeCode}' = 'train'
          and default_metadata_json #>> '{rubricatorCandidate,contextCode}' = 'health'
          and default_metadata_json #>> '{rubricatorCandidate,contextualCategorySlug}' = 'knee-exercises'
        ),

      'kneeValueObjectMappingOk',
        bool_or(
          slug = 'knee-training-health-practice'
          and default_metadata_json #>> '{valueObjectMapping,valueObjectTitle}'
            = 'Knee training practice'
          and default_metadata_json #>> '{valueObjectMapping,valueObjectType}'
            = 'health_activity'
          and default_metadata_json #>> '{valueObjectMapping,metricKey}'
            = 'duration_minutes'
        )
    )
  ) as data
from public.activity_templates
where slug in (
  'german-marketing-handwriting-practice',
  'knee-training-health-practice'
);

-- ============================================================
-- A3c: read-only post-normalization audit
-- ============================================================

with target_templates as (
  select
    t.id,
    t.slug,
    t.title,
    t.default_metadata_json
  from public.activity_templates t
  where t.slug in (
    'german-marketing-handwriting-practice',
    'knee-training-health-practice'
  )
),

metadata_expanded as (
  select
    t.id,
    t.slug,
    t.title,
    t.default_metadata_json,

    t.default_metadata_json #>> '{knownTemplateRegistry,enabled}' as registry_enabled,
    t.default_metadata_json #>> '{knownTemplateRegistry,ruleKey}' as rule_key,
    t.default_metadata_json #>> '{knownTemplateRegistry,templateSlug}' as registry_template_slug,
    t.default_metadata_json #>> '{knownTemplateRegistry,sourceType}' as registry_source_type,
    t.default_metadata_json #>> '{knownTemplateRegistry,classificationRole}' as classification_role,
    t.default_metadata_json #>> '{knownTemplateRegistry,confidence}' as registry_confidence,
    t.default_metadata_json #>> '{knownTemplateRegistry,registryVersion}' as registry_version,

    t.default_metadata_json #>> '{rubricatorCandidate,objectTypeCode}' as object_type_code,
    t.default_metadata_json #>> '{rubricatorCandidate,actionTypeCode}' as action_type_code,
    t.default_metadata_json #>> '{rubricatorCandidate,contextCode}' as context_code,
    t.default_metadata_json #>> '{rubricatorCandidate,contextualCategorySlug}' as contextual_category_slug,

    t.default_metadata_json #>> '{valueObjectTitle}' as value_object_title,

    t.default_metadata_json #>> '{valueObjectMapping,valueObjectTitle}' as mapped_value_object_title,
    t.default_metadata_json #>> '{valueObjectMapping,valueObjectType}' as mapped_value_object_type,
    t.default_metadata_json #>> '{valueObjectMapping,relationType}' as mapped_relation_type,
    t.default_metadata_json #>> '{valueObjectMapping,metricKey}' as mapped_metric_key,
    t.default_metadata_json #>> '{valueObjectMapping,metricUnit}' as mapped_metric_unit,
    t.default_metadata_json #>> '{valueObjectMapping,deltaDirection}' as mapped_delta_direction,
    t.default_metadata_json #>> '{valueObjectMapping,aggregateType}' as mapped_aggregate_type
  from target_templates t
),

joined_audit as (
  select
    m.*,

    ot.id as object_type_id,
    ot.status as object_type_status,
    ot.is_active as object_type_is_active,

    act.id as action_type_id,
    act.status as action_type_status,
    act.is_active as action_type_is_active,

    ctx.id as context_id,
    ctx.status as context_status,
    ctx.is_active as context_is_active,

    cc.id as contextual_category_id,
    cc.status as contextual_category_status,
    cc.is_active as contextual_category_is_active,

    vo.id as value_object_id,
    vo.status as value_object_status,
    vo.value_type as value_object_type,
    vo.unit_type as value_object_unit_type,

    (
      select count(*)
      from public.impact_rules ir
      where ir.activity_template_id = m.id
    ) as impact_rules_count

  from metadata_expanded m
  left join public.object_types ot
    on ot.code = m.object_type_code
  left join public.action_types act
    on act.code = m.action_type_code
  left join public.contexts ctx
    on ctx.code = m.context_code
  left join public.contextual_categories cc
    on cc.slug = m.contextual_category_slug
  left join public.value_objects vo
    on vo.title = m.mapped_value_object_title
),

per_template_flags as (
  select
    j.*,

    (
      j.registry_enabled = 'true'
      and j.rule_key is not null
      and j.registry_template_slug = j.slug
      and j.registry_source_type = 'system_seed'
      and j.classification_role = 'primary'
      and j.registry_confidence = '1'
      and j.registry_version = 'v0.1-default_metadata_json'
    ) as registry_ok,

    (
      j.object_type_id is not null
      and j.object_type_status = 'approved'
      and j.object_type_is_active = true
      and j.action_type_id is not null
      and j.action_type_status = 'approved'
      and j.action_type_is_active = true
      and j.context_id is not null
      and j.context_status = 'approved'
      and j.context_is_active = true
      and j.contextual_category_id is not null
      and j.contextual_category_status = 'approved'
      and j.contextual_category_is_active = true
    ) as rubricator_refs_ok,

    (
      j.value_object_id is not null
      and j.value_object_status = 'active'
      and j.value_object_title = j.mapped_value_object_title
      and j.mapped_metric_key = 'duration_minutes'
      and j.mapped_metric_unit = 'minutes'
      and j.mapped_delta_direction = 'increase'
      and j.mapped_aggregate_type = 'value_object'
    ) as value_object_mapping_ok,

    (
      case
        when j.slug = 'german-marketing-handwriting-practice'
          then j.impact_rules_count = 5
        when j.slug = 'knee-training-health-practice'
          then j.impact_rules_count = 3
        else false
      end
    ) as impact_rules_count_ok

  from joined_audit j
)

select
  'p479_a3c_per_template_audit' as section,
  jsonb_pretty(
    jsonb_agg(
      jsonb_build_object(
        'slug', slug,
        'templateId', id,
        'ruleKey', rule_key,
        'registryOk', registry_ok,
        'rubricatorRefsOk', rubricator_refs_ok,
        'valueObjectMappingOk', value_object_mapping_ok,
        'impactRulesCount', impact_rules_count,
        'impactRulesCountOk', impact_rules_count_ok,
        'objectType', jsonb_build_object(
          'code', object_type_code,
          'id', object_type_id,
          'status', object_type_status,
          'isActive', object_type_is_active
        ),
        'actionType', jsonb_build_object(
          'code', action_type_code,
          'id', action_type_id,
          'status', action_type_status,
          'isActive', action_type_is_active
        ),
        'context', jsonb_build_object(
          'code', context_code,
          'id', context_id,
          'status', context_status,
          'isActive', context_is_active
        ),
        'contextualCategory', jsonb_build_object(
          'slug', contextual_category_slug,
          'id', contextual_category_id,
          'status', contextual_category_status,
          'isActive', contextual_category_is_active
        ),
        'valueObject', jsonb_build_object(
          'title', mapped_value_object_title,
          'id', value_object_id,
          'status', value_object_status,
          'valueType', value_object_type,
          'unitType', value_object_unit_type
        )
      )
      order by slug
    )
  ) as data
from per_template_flags

union all

select
  'p479_a3c_final_flags' as section,
  jsonb_pretty(
    jsonb_build_object(
      'templatesCount', count(*),
      'allRegistriesOk', bool_and(registry_ok),
      'allRubricatorRefsOk', bool_and(rubricator_refs_ok),
      'allValueObjectMappingsOk', bool_and(value_object_mapping_ok),
      'allImpactRulesCountsOk', bool_and(impact_rules_count_ok),
      'germanOk', bool_or(
        slug = 'german-marketing-handwriting-practice'
        and registry_ok
        and rubricator_refs_ok
        and value_object_mapping_ok
        and impact_rules_count_ok
      ),
      'kneeOk', bool_or(
        slug = 'knee-training-health-practice'
        and registry_ok
        and rubricator_refs_ok
        and value_object_mapping_ok
        and impact_rules_count_ok
      ),
      'a3cReadyToDocumentAndCommit',
        count(*) = 2
        and bool_and(registry_ok)
        and bool_and(rubricator_refs_ok)
        and bool_and(value_object_mapping_ok)
        and bool_and(impact_rules_count_ok)
    )
  ) as data
from per_template_flags;
