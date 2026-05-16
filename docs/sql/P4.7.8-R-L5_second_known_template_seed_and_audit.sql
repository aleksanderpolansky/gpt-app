-- P4.7.8-R-L5
-- Second known-template seed and audit: knee-training-health-practice
--
-- Purpose:
-- Preserve the manually verified Supabase DB seed in the repository.
--
-- This file documents the controlled DB foundation for:
-- Activity Event
-- -> Object-Action Rubricator
-- -> approved Entity Classification
-- -> Value Object Bridge
-- -> VOI / link
-- -> state_delta
-- -> aggregate / snapshot
-- -> processing logs
--
-- Template:
--   templateSlug: knee-training-health-practice
--   objectTypeCode: knee
--   actionTypeCode: train
--   contextCode: health
--   contextualCategorySlug: knee-exercises
--
-- Important:
-- This is health/activity tracking only.
-- It makes no medical diagnosis or treatment claim.

-- ============================================================
-- 1) Controlled DB seed
-- ============================================================

with seed_owner_actor as (
  select coalesce(
    (
      select owner_actor_id
      from public.value_objects
      where title = 'Business German writing practice'
        and owner_actor_id is not null
      order by created_at asc
      limit 1
    ),
    (
      select owner_actor_id
      from public.value_objects
      where owner_actor_id is not null
      order by created_at asc
      limit 1
    )
  ) as owner_actor_id
),

insert_activity_type as (
  insert into public.activity_types (
    code,
    title,
    description,
    status,
    sort_order,
    metadata_json
  )
  select
    'knee_training',
    'Knee training',
    'Knee-focused exercise or training activity used for health/activity tracking. No medical diagnosis or treatment claim.',
    'active',
    20,
    jsonb_build_object(
      'mvp_seed', true,
      'p4Step', 'P4.7.8-R-L5.3b',
      'known_template_candidate', true,
      'domain', 'health',
      'medical_claims', false
    )
  where not exists (
    select 1
    from public.activity_types existing
    where lower(existing.code) = lower('knee_training')
  )
  returning *
),

activity_type_row as (
  select *
  from insert_activity_type

  union all

  select *
  from public.activity_types existing
  where lower(existing.code) = lower('knee_training')
    and not exists (select 1 from insert_activity_type)
  limit 1
),

insert_value_object as (
  insert into public.value_objects (
    owner_actor_id,
    value_type,
    title,
    description,
    unit_type,
    default_price,
    default_currency,
    default_duration_minutes,
    is_marketplace_sellable,
    is_free_possible,
    status,
    organization_id
  )
  select
    seed_owner_actor.owner_actor_id,
    'health_activity',
    'Knee training practice',
    'Controlled P4.7.8-R-L5 value object for knee-focused exercise/training activity tracking. No medical diagnosis or treatment claim.',
    'minutes',
    null,
    null,
    10,
    false,
    false,
    'active',
    null
  from seed_owner_actor
  where not exists (
    select 1
    from public.value_objects existing
    where lower(existing.title) = lower('Knee training practice')
      and existing.value_type = 'health_activity'
  )
  returning *
),

value_object_row as (
  select *
  from insert_value_object

  union all

  select *
  from public.value_objects existing
  where lower(existing.title) = lower('Knee training practice')
    and existing.value_type = 'health_activity'
    and not exists (select 1 from insert_value_object)
  order by created_at asc
  limit 1
),

insert_activity_template as (
  insert into public.activity_templates (
    legacy_activity_code_template_id,
    owner_user_id,
    owner_actor_id,
    organization_id,
    slug,
    title,
    short_title,
    description,
    template_group,
    template_scope,
    visibility,
    source_type,
    status,
    default_activity_type_id,
    default_duration_minutes,
    quick_duration_minutes,
    default_status,
    default_source_type,
    default_privacy_scope,
    icon_key,
    color_key,
    show_in_quick_capture,
    show_in_onboarding,
    allow_manual_duration,
    allow_comment,
    allow_started_at_override,
    allow_ended_at_override,
    input_schema_json,
    ui_schema_json,
    default_metadata_json,
    sort_order,
    is_active
  )
  select
    null,
    null,
    null,
    null,
    'knee-training-health-practice',
    'Knee training health practice',
    'Knee training',
    'Template for recording knee-focused exercise/training practice as health/activity tracking. No medical diagnosis or treatment claim.',
    'health',
    'system',
    'private',
    'system_seed',
    'active',
    activity_type_row.id,
    10,
    array[5, 10, 15, 20]::integer[],
    'completed',
    'manual_form',
    'private',
    'activity',
    'green',
    true,
    true,
    true,
    true,
    true,
    true,
    jsonb_build_object(
      'fields', jsonb_build_object(
        'comment', jsonb_build_object(
          'type', 'string',
          'label', 'Comment',
          'placeholder', 'e.g. light knee mobility, controlled repetitions, no pain'
        ),
        'durationMinutes', jsonb_build_object(
          'type', 'number',
          'unit', 'minutes',
          'label', 'Duration',
          'default', 10
        )
      ),
      'required', jsonb_build_array('durationMinutes'),
      'optional', jsonb_build_array('comment', 'startedAt', 'endedAt')
    ),
    jsonb_build_object(
      'cardTitle', 'Knee training health practice',
      'cardSubtitle', 'Knee-focused activity tracking, no medical claims',
      'quickDurations', jsonb_build_array(5, 10, 15, 20),
      'primaryButtonLabel', 'Record activity'
    ),
    jsonb_build_object(
      'mvp_seed', true,
      'ai_required', false,
      'v2_template_first', true,
      'p4Step', 'P4.7.8-R-L5.3b',
      'rubricatorCandidate', jsonb_build_object(
        'objectTypeCode', 'knee',
        'actionTypeCode', 'train',
        'contextCode', 'health',
        'contextualCategorySlug', 'knee-exercises'
      ),
      'valueObjectTitle', 'Knee training practice',
      'medical_claims', false,
      'example_manual_form', jsonb_build_object(
        'templateSlug', 'knee-training-health-practice',
        'durationMinutes', 10,
        'comment', 'light controlled knee training'
      )
    ),
    20,
    true
  from activity_type_row
  where not exists (
    select 1
    from public.activity_templates existing
    where lower(existing.slug) = lower('knee-training-health-practice')
  )
  returning *
),

activity_template_row as (
  select *
  from insert_activity_template

  union all

  select *
  from public.activity_templates existing
  where lower(existing.slug) = lower('knee-training-health-practice')
    and not exists (select 1 from insert_activity_template)
  limit 1
),

impact_rule_seed as (
  select
    'knee_training_minutes'::text as rule_code,
    'Knee training minutes'::text as title,
    'Adds duration minutes to knee training practice tracking.'::text as description,
    'body_part'::text as impact_target_type,
    'knee'::text as impact_target_key,
    'training_minutes'::text as impact_metric,
    'minutes'::text as impact_unit,
    'duration_minutes'::text as impact_value_mode,
    null::numeric as impact_value_numeric,
    null::text as impact_value_text,
    'positive'::text as impact_direction,
    null::text as intensity,
    jsonb_build_object(
      'daily_metric_key', 'minutes',
      'daily_aggregate_key', 'knee_training_minutes',
      'daily_aggregate_type', 'body_load_daily',
      'medical_claims', false
    ) as metadata_json

  union all

  select
    'knee_load_minutes',
    'Knee load minutes',
    'Adds duration minutes to neutral knee load tracking.',
    'body_part',
    'knee',
    'load_minutes',
    'minutes',
    'duration_minutes',
    null::numeric,
    null::text,
    'neutral',
    null::text,
    jsonb_build_object(
      'daily_metric_key', 'minutes',
      'daily_aggregate_key', 'knee_load_minutes',
      'daily_aggregate_type', 'body_load_daily',
      'medical_claims', false
    )

  union all

  select
    'health_activity_minutes',
    'Health activity minutes',
    'Adds duration minutes to general health activity tracking.',
    'health_metric',
    'health_activity',
    'activity_minutes',
    'minutes',
    'duration_minutes',
    null::numeric,
    null::text,
    'positive',
    null::text,
    jsonb_build_object(
      'daily_metric_key', 'minutes',
      'daily_aggregate_key', 'health_activity_minutes',
      'daily_aggregate_type', 'health_daily',
      'medical_claims', false
    )
),

insert_impact_rules as (
  insert into public.impact_rules (
    template_id,
    activity_type_id,
    rule_code,
    title,
    description,
    impact_target_type,
    impact_target_key,
    impact_metric,
    impact_unit,
    impact_value_mode,
    impact_value_numeric,
    impact_value_text,
    impact_direction,
    intensity,
    rule_source,
    is_active,
    metadata_json,
    activity_template_id
  )
  select
    null,
    activity_type_row.id,
    impact_rule_seed.rule_code,
    impact_rule_seed.title,
    impact_rule_seed.description,
    impact_rule_seed.impact_target_type,
    impact_rule_seed.impact_target_key,
    impact_rule_seed.impact_metric,
    impact_rule_seed.impact_unit,
    impact_rule_seed.impact_value_mode,
    impact_rule_seed.impact_value_numeric,
    impact_rule_seed.impact_value_text,
    impact_rule_seed.impact_direction,
    impact_rule_seed.intensity,
    'system_seed',
    true,
    impact_rule_seed.metadata_json || jsonb_build_object(
      'p4Step', 'P4.7.8-R-L5.3b',
      'templateSlug', 'knee-training-health-practice'
    ),
    activity_template_row.id
  from impact_rule_seed
  cross join activity_type_row
  cross join activity_template_row
  where not exists (
    select 1
    from public.impact_rules existing
    where existing.activity_template_id = activity_template_row.id
      and lower(existing.rule_code) = lower(impact_rule_seed.rule_code)
  )
  returning *
)

select
  'seed_result' as section,
  jsonb_pretty(
    jsonb_build_object(
      'activityType', (
        select to_jsonb(activity_type_row)
        from activity_type_row
      ),
      'valueObject', (
        select to_jsonb(value_object_row)
        from value_object_row
      ),
      'activityTemplate', (
        select to_jsonb(activity_template_row)
        from activity_template_row
      ),
      'insertedImpactRulesCount', (
        select count(*)
        from insert_impact_rules
      )
    )
  ) as data;

-- ============================================================
-- 2) Post-seed verification
-- ============================================================

with template_row as (
  select *
  from public.activity_templates
  where slug = 'knee-training-health-practice'
),

activity_type_row as (
  select aty.*
  from public.activity_types aty
  where aty.code = 'knee_training'
),

value_object_row as (
  select vo.*
  from public.value_objects vo
  where lower(vo.title) = lower('Knee training practice')
    and vo.value_type = 'health_activity'
  order by vo.created_at asc
  limit 1
),

impact_rule_rows as (
  select ir.*
  from public.impact_rules ir
  join template_row t
    on t.id = ir.activity_template_id
  order by ir.rule_code
),

rubricator_dimension_check as (
  select
    (
      select count(*)
      from public.object_types
      where lower(code) = lower('knee')
        and status = 'approved'
        and is_active = true
    ) as knee_object_type_count,

    (
      select count(*)
      from public.action_types
      where lower(code) = lower('train')
        and status = 'approved'
        and is_active = true
    ) as train_action_type_count,

    (
      select count(*)
      from public.contexts
      where lower(code) = lower('health')
        and status = 'approved'
        and is_active = true
    ) as health_context_count,

    (
      select count(*)
      from public.contextual_categories cc
      join public.contexts c
        on c.id = cc.context_id
      where lower(c.code) = lower('health')
        and lower(cc.slug) = lower('knee-exercises')
        and cc.status in ('approved', 'published')
        and cc.is_active = true
    ) as knee_exercises_category_count
)

select
  'post_seed_verification' as section,
  jsonb_pretty(
    jsonb_build_object(
      'activityTemplate', (
        select to_jsonb(template_row)
        from template_row
      ),
      'activityType', (
        select to_jsonb(activity_type_row)
        from activity_type_row
      ),
      'valueObject', (
        select to_jsonb(value_object_row)
        from value_object_row
      ),
      'impactRulesCount', (
        select count(*)
        from impact_rule_rows
      ),
      'rubricatorDimensionCheck', (
        select to_jsonb(rubricator_dimension_check)
        from rubricator_dimension_check
      ),
      'readyForCodePatch', (
        (
          select count(*)
          from template_row
        ) = 1
        and (
          select count(*)
          from activity_type_row
        ) = 1
        and (
          select count(*)
          from value_object_row
        ) = 1
        and (
          select count(*)
          from impact_rule_rows
        ) = 3
        and (
          select knee_object_type_count
          from rubricator_dimension_check
        ) = 1
        and (
          select train_action_type_count
          from rubricator_dimension_check
        ) = 1
        and (
          select health_context_count
          from rubricator_dimension_check
        ) = 1
        and (
          select knee_exercises_category_count
          from rubricator_dimension_check
        ) = 1
      )
    )
  ) as data;

-- ============================================================
-- 3) Runtime audit template
-- ============================================================
--
-- Replace TARGET_EVENT_ID_HERE with a runtime event id created through:
-- POST /api/activity/record
-- templateSlug: knee-training-health-practice
--
-- Verified runtime event from L5.5:
--   98798c63-f07d-44e4-b3ae-64095a26e6d2
--
-- Expected flags:
--   completeSecondKnownTemplateChain = true
--   hasThreeImpactEvents = true
--   hasProcessingLogs = true
--
-- The full L5.5 runtime audit result is documented in:
-- docs/activity/P4.7.8-R_cross_route_verification.md
