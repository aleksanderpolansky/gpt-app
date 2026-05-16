-- P4.7.8-R-L7.2
-- Final consolidated audit before closing P4.7.8-R.
--
-- Audits two known templates across verified route events:
-- 1) german-marketing-handwriting-practice
-- 2) knee-training-health-practice
--
-- Routes:
-- record
-- complete
-- confirm
--
-- Expected final result:
-- globalFlags.allEventsPassed = true
-- globalFlags.allTemplatesPassedAllThreeRoutes = true
-- globalFlags.templatesAuditedCountIsTwo = true
-- globalFlags.eventsAuditedCountIsSix = true

with target_events as (
  select
    'german_marketing_handwriting_practice'::text as template_key,
    'record_route'::text as route_name,
    'd42ca357-df9e-4d42-af0d-9c17898c9a05'::uuid as event_id,
    'german-marketing-handwriting-practice'::text as expected_template_slug,
    '8eef44f7-9e29-461d-8af0-3db4af1d3c92'::uuid as expected_activity_template_id,
    '80e43db3-46c4-4fd2-8c2a-de050cbaca7f'::uuid as expected_activity_type_id,
    'german_marketing_handwriting_practice_to_business_german'::text as expected_rule_key,
    5::integer as expected_impact_events

  union all

  select
    'german_marketing_handwriting_practice',
    'complete_route',
    '810fc9fc-1524-4d20-b3ca-68c8301cf5ed'::uuid,
    'german-marketing-handwriting-practice',
    '8eef44f7-9e29-461d-8af0-3db4af1d3c92'::uuid,
    '80e43db3-46c4-4fd2-8c2a-de050cbaca7f'::uuid,
    'german_marketing_handwriting_practice_to_business_german',
    5

  union all

  select
    'german_marketing_handwriting_practice',
    'confirm_route',
    '8a1de3d2-d453-43ad-ae13-1f3c09eb12d5'::uuid,
    'german-marketing-handwriting-practice',
    '8eef44f7-9e29-461d-8af0-3db4af1d3c92'::uuid,
    '80e43db3-46c4-4fd2-8c2a-de050cbaca7f'::uuid,
    'german_marketing_handwriting_practice_to_business_german',
    5

  union all

  select
    'knee_training_health_practice',
    'record_route',
    '98798c63-f07d-44e4-b3ae-64095a26e6d2'::uuid,
    'knee-training-health-practice',
    'c1698136-341e-4f61-b091-fab366a0942f'::uuid,
    '9cf78347-c607-413e-bd60-20b40c27181c'::uuid,
    'knee_training_health_practice_to_knee_exercises',
    3

  union all

  select
    'knee_training_health_practice',
    'complete_route',
    '0a4aa94a-7956-4d3e-9d1d-6629360bee5f'::uuid,
    'knee-training-health-practice',
    'c1698136-341e-4f61-b091-fab366a0942f'::uuid,
    '9cf78347-c607-413e-bd60-20b40c27181c'::uuid,
    'knee_training_health_practice_to_knee_exercises',
    3

  union all

  select
    'knee_training_health_practice',
    'confirm_route',
    'c8cbb0fd-237d-44de-b13f-468102dfc4d2'::uuid,
    'knee-training-health-practice',
    'c1698136-341e-4f61-b091-fab366a0942f'::uuid,
    '9cf78347-c607-413e-bd60-20b40c27181c'::uuid,
    'knee_training_health_practice_to_knee_exercises',
    3
),

activity_event_rows as (
  select
    t.template_key,
    t.route_name,
    t.event_id as target_event_id,
    t.expected_template_slug,
    t.expected_activity_template_id,
    t.expected_activity_type_id,
    t.expected_rule_key,
    t.expected_impact_events,
    ae.*
  from target_events t
  left join activity_events ae
    on ae.id = t.event_id
),

classification_rows as (
  select
    t.template_key,
    t.route_name,
    t.event_id as target_event_id,
    t.expected_rule_key,
    ec.*
  from target_events t
  join entity_classifications ec
    on (to_jsonb(ec)->>'entity_id') = t.event_id::text
    or (to_jsonb(ec)->>'activity_event_id') = t.event_id::text
    or (to_jsonb(ec)->>'source_event_id') = t.event_id::text
),

voi_link_rows as (
  select
    t.template_key,
    t.route_name,
    t.event_id as target_event_id,
    l.*
  from target_events t
  join activity_event_value_object_instance_links l
    on (to_jsonb(l)->>'event_id') = t.event_id::text
    or (to_jsonb(l)->>'activity_event_id') = t.event_id::text
),

voi_ids_from_links as (
  select distinct
    template_key,
    route_name,
    nullif(to_jsonb(voi_link_rows)->>'value_object_instance_id', '') as voi_id
  from voi_link_rows
  where nullif(to_jsonb(voi_link_rows)->>'value_object_instance_id', '') is not null
),

voi_rows as (
  select
    t.template_key,
    t.route_name,
    t.event_id as target_event_id,
    voi.*
  from target_events t
  join value_object_instances voi
    on (to_jsonb(voi)->>'source_event_id') = t.event_id::text
    or (to_jsonb(voi)->>'activity_event_id') = t.event_id::text
    or (to_jsonb(voi)->>'event_id') = t.event_id::text
    or (to_jsonb(voi)->>'id') in (
      select voi_id
      from voi_ids_from_links ids
      where ids.template_key = t.template_key
        and ids.route_name = t.route_name
    )
),

voi_ids as (
  select distinct
    template_key,
    route_name,
    nullif(to_jsonb(voi_rows)->>'id', '') as voi_id
  from voi_rows
  where nullif(to_jsonb(voi_rows)->>'id', '') is not null

  union

  select distinct
    template_key,
    route_name,
    voi_id
  from voi_ids_from_links
  where voi_id is not null
),

impact_event_rows as (
  select
    t.template_key,
    t.route_name,
    t.event_id as target_event_id,
    ie.*
  from target_events t
  join impact_events ie
    on (to_jsonb(ie)->>'event_id') = t.event_id::text
    or (to_jsonb(ie)->>'activity_event_id') = t.event_id::text
),

state_delta_rows as (
  select
    t.template_key,
    t.route_name,
    t.event_id as target_event_id,
    d.*
  from target_events t
  join value_object_state_deltas d
    on (to_jsonb(d)->>'event_id') = t.event_id::text
    or (to_jsonb(d)->>'activity_event_id') = t.event_id::text
    or (to_jsonb(d)->>'source_event_id') = t.event_id::text
    or (to_jsonb(d)->>'value_object_instance_id') in (
      select voi_id
      from voi_ids ids
      where ids.template_key = t.template_key
        and ids.route_name = t.route_name
    )
    or (to_jsonb(d)->>'voi_id') in (
      select voi_id
      from voi_ids ids
      where ids.template_key = t.template_key
        and ids.route_name = t.route_name
    )
),

value_object_ids as (
  select distinct
    template_key,
    route_name,
    nullif(to_jsonb(voi_rows)->>'value_object_id', '') as value_object_id
  from voi_rows
  where nullif(to_jsonb(voi_rows)->>'value_object_id', '') is not null

  union

  select distinct
    template_key,
    route_name,
    nullif(to_jsonb(state_delta_rows)->>'value_object_id', '') as value_object_id
  from state_delta_rows
  where nullif(to_jsonb(state_delta_rows)->>'value_object_id', '') is not null

  union

  select distinct
    template_key,
    route_name,
    nullif(to_jsonb(voi_link_rows)->>'value_object_id', '') as value_object_id
  from voi_link_rows
  where nullif(to_jsonb(voi_link_rows)->>'value_object_id', '') is not null
),

value_object_rows as (
  select
    ids.template_key,
    ids.route_name,
    vo.*
  from value_object_ids ids
  join value_objects vo
    on (to_jsonb(vo)->>'id') = ids.value_object_id
),

daily_aggregate_rows as (
  select
    ids.template_key,
    ids.route_name,
    a.*
  from value_object_ids ids
  join value_object_daily_aggregates a
    on (to_jsonb(a)->>'value_object_id') = ids.value_object_id
),

snapshot_rows as (
  select
    ids.template_key,
    ids.route_name,
    s.*
  from value_object_ids ids
  join value_object_state_snapshots s
    on (to_jsonb(s)->>'value_object_id') = ids.value_object_id
),

processing_log_rows as (
  select
    t.template_key,
    t.route_name,
    t.event_id as target_event_id,
    pl.*
  from target_events t
  join activity_processing_logs pl
    on (to_jsonb(pl)->>'event_id') = t.event_id::text
    or (to_jsonb(pl)->>'activity_event_id') = t.event_id::text
    or (to_jsonb(pl)->>'entity_id') = t.event_id::text
),

per_event_summary as (
  select
    t.template_key,
    t.route_name,
    t.event_id::text as event_id,
    t.expected_template_slug,
    t.expected_rule_key,
    t.expected_impact_events,

    (
      select count(*)
      from activity_event_rows ae
      where ae.template_key = t.template_key
        and ae.route_name = t.route_name
        and ae.id = t.event_id
    ) as activity_event_count,

    (
      select count(*)
      from activity_event_rows ae
      where ae.template_key = t.template_key
        and ae.route_name = t.route_name
        and ae.id = t.event_id
        and ae.status = 'completed'
        and ae.processing_status = 'processed'
        and ae.activity_template_id = t.expected_activity_template_id
        and ae.activity_type_id = t.expected_activity_type_id
    ) as completed_processed_expected_template_event_count,

    (
      select count(*)
      from classification_rows c
      where c.template_key = t.template_key
        and c.route_name = t.route_name
    ) as classification_count,

    (
      select count(*)
      from classification_rows c
      where c.template_key = t.template_key
        and c.route_name = t.route_name
        and coalesce(to_jsonb(c)->>'status', '') = 'approved'
    ) as approved_classification_count,

    (
      select count(*)
      from classification_rows c
      where c.template_key = t.template_key
        and c.route_name = t.route_name
        and coalesce(to_jsonb(c)->>'source_type', '') = 'system_seed'
    ) as system_seed_classification_count,

    (
      select count(*)
      from classification_rows c
      where c.template_key = t.template_key
        and c.route_name = t.route_name
        and coalesce(to_jsonb(c)->>'classification_role', '') = 'primary'
        and coalesce(to_jsonb(c)->>'is_primary', '') = 'true'
    ) as primary_classification_count,

    (
      select count(*)
      from classification_rows c
      where c.template_key = t.template_key
        and c.route_name = t.route_name
        and lower(to_jsonb(c)::text) like '%' || lower(t.expected_rule_key) || '%'
    ) as expected_rule_key_evidence_count,

    (
      select count(*)
      from impact_event_rows ie
      where ie.template_key = t.template_key
        and ie.route_name = t.route_name
    ) as impact_event_count,

    (
      select count(*)
      from voi_link_rows l
      where l.template_key = t.template_key
        and l.route_name = t.route_name
    ) as voi_link_count,

    (
      select count(*)
      from voi_rows voi
      where voi.template_key = t.template_key
        and voi.route_name = t.route_name
    ) as voi_count,

    (
      select count(*)
      from state_delta_rows d
      where d.template_key = t.template_key
        and d.route_name = t.route_name
    ) as state_delta_count,

    (
      select count(*)
      from daily_aggregate_rows a
      where a.template_key = t.template_key
        and a.route_name = t.route_name
    ) as daily_aggregate_count,

    (
      select count(*)
      from snapshot_rows s
      where s.template_key = t.template_key
        and s.route_name = t.route_name
    ) as snapshot_count,

    (
      select count(*)
      from processing_log_rows pl
      where pl.template_key = t.template_key
        and pl.route_name = t.route_name
    ) as processing_log_count,

    (
      select count(*)
      from processing_log_rows pl
      where pl.template_key = t.template_key
        and pl.route_name = t.route_name
        and coalesce(to_jsonb(pl)->>'processor_name', '') like '%rubricator_classification%'
        and coalesce(to_jsonb(pl)->>'processing_status', '') in ('completed', 'skipped')
    ) as rubricator_processing_log_count,

    (
      select count(*)
      from processing_log_rows pl
      where pl.template_key = t.template_key
        and pl.route_name = t.route_name
        and coalesce(to_jsonb(pl)->>'processor_name', '') like '%value_object_bridge%'
        and coalesce(to_jsonb(pl)->>'processing_status', '') in ('completed', 'skipped')
    ) as value_object_bridge_processing_log_count,

    (
      select count(*)
      from value_object_rows vo
      where vo.template_key = t.template_key
        and vo.route_name = t.route_name
    ) as value_object_count
  from target_events t
),

per_event_report as (
  select
    template_key,
    route_name,
    event_id,
    expected_template_slug,
    expected_rule_key,
    expected_impact_events,

    jsonb_build_object(
      'activityEventCount', activity_event_count,
      'completedProcessedExpectedTemplateEventCount', completed_processed_expected_template_event_count,
      'classificationCount', classification_count,
      'approvedClassificationCount', approved_classification_count,
      'systemSeedClassificationCount', system_seed_classification_count,
      'primaryClassificationCount', primary_classification_count,
      'expectedRuleKeyEvidenceCount', expected_rule_key_evidence_count,
      'impactEventCount', impact_event_count,
      'valueObjectCount', value_object_count,
      'voiCount', voi_count,
      'voiLinkCount', voi_link_count,
      'stateDeltaCount', state_delta_count,
      'dailyAggregateCount', daily_aggregate_count,
      'snapshotCount', snapshot_count,
      'processingLogCount', processing_log_count,
      'rubricatorProcessingLogCount', rubricator_processing_log_count,
      'valueObjectBridgeProcessingLogCount', value_object_bridge_processing_log_count
    ) as summary,

    jsonb_build_object(
      'hasActivityEvent', activity_event_count = 1,
      'hasCompletedProcessedExpectedTemplateEvent', completed_processed_expected_template_event_count = 1,
      'hasApprovedClassification', approved_classification_count > 0,
      'hasSystemSeedClassification', system_seed_classification_count > 0,
      'hasPrimaryClassification', primary_classification_count > 0,
      'hasExpectedRuleKeyEvidence', expected_rule_key_evidence_count > 0,
      'hasExpectedImpactEventCount', impact_event_count = expected_impact_events,
      'hasValueObject', value_object_count > 0,
      'hasVoiOrVoiLink', voi_count > 0 or voi_link_count > 0,
      'hasStateDelta', state_delta_count > 0,
      'hasDailyAggregate', daily_aggregate_count > 0,
      'hasSnapshot', snapshot_count > 0,
      'hasProcessingLogs', processing_log_count > 0,
      'hasRubricatorProcessingLog', rubricator_processing_log_count > 0,
      'hasValueObjectBridgeProcessingLog', value_object_bridge_processing_log_count > 0,
      'completeKnownTemplateChain', (
        activity_event_count = 1
        and completed_processed_expected_template_event_count = 1
        and approved_classification_count > 0
        and primary_classification_count > 0
        and impact_event_count = expected_impact_events
        and value_object_count > 0
        and (voi_count > 0 or voi_link_count > 0)
        and state_delta_count > 0
        and daily_aggregate_count > 0
        and snapshot_count > 0
        and rubricator_processing_log_count > 0
        and value_object_bridge_processing_log_count > 0
      )
    ) as flags
  from per_event_summary
),

template_report as (
  select
    template_key,
    jsonb_build_object(
      'routesAuditedCount', count(*),
      'allRoutesPassed', bool_and((flags->>'completeKnownTemplateChain')::boolean),
      'recordRoutePassed', bool_or(route_name = 'record_route' and (flags->>'completeKnownTemplateChain')::boolean),
      'completeRoutePassed', bool_or(route_name = 'complete_route' and (flags->>'completeKnownTemplateChain')::boolean),
      'confirmRoutePassed', bool_or(route_name = 'confirm_route' and (flags->>'completeKnownTemplateChain')::boolean)
    ) as template_flags
  from per_event_report
  group by template_key
)

select jsonb_pretty(
  jsonb_build_object(
    'auditName', 'P4.7.8-R-L7.2 final two-template three-route audit',
    'templatesAuditedCount', (
      select count(distinct template_key)
      from per_event_report
    ),
    'eventsAuditedCount', (
      select count(*)
      from per_event_report
    ),
    'globalFlags', jsonb_build_object(
      'allEventsPassed', (
        select bool_and((flags->>'completeKnownTemplateChain')::boolean)
        from per_event_report
      ),
      'allTemplatesPassedAllThreeRoutes', (
        select bool_and((template_flags->>'allRoutesPassed')::boolean)
        from template_report
      ),
      'templatesAuditedCountIsTwo', (
        select count(distinct template_key) = 2
        from per_event_report
      ),
      'eventsAuditedCountIsSix', (
        select count(*) = 6
        from per_event_report
      )
    ),
    'templateReports', (
      select jsonb_agg(
        jsonb_build_object(
          'templateKey', template_key,
          'flags', template_flags
        )
        order by template_key
      )
      from template_report
    ),
    'events', (
      select jsonb_agg(
        jsonb_build_object(
          'templateKey', template_key,
          'routeName', route_name,
          'eventId', event_id,
          'expectedTemplateSlug', expected_template_slug,
          'expectedRuleKey', expected_rule_key,
          'expectedImpactEvents', expected_impact_events,
          'summary', summary,
          'flags', flags
        )
        order by template_key, route_name
      )
      from per_event_report
    )
  )
) as audit_report;
