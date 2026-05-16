-- P4.7.8-R-L6
-- Second known-template cross-route audit:
-- knee-training-health-practice
--
-- Purpose:
-- Preserve the manually verified cross-route audit for the second known template.
--
-- Verified routes:
--   1) /api/activity/complete
--   2) /api/activity/intake/events/[id]/confirm
--
-- Previously verified by /api/activity/record in L5.
--
-- Template:
--   templateSlug: knee-training-health-practice
--   activity_template_id: c1698136-341e-4f61-b091-fab366a0942f
--   activity_type_id: 9cf78347-c607-413e-bd60-20b40c27181c
--   ruleKey: knee_training_health_practice_to_knee_exercises
--   value_object_id: b7acc958-7966-42c2-82c5-35c4de26d7ea
--
-- Verified runtime events:
--   complete_route event_id: 0a4aa94a-7956-4d3e-9d1d-6629360bee5f
--   confirm_route event_id:  c8cbb0fd-237d-44de-b13f-468102dfc4d2
--
-- Expected result:
--   globalFlags.allRoutesPassed = true
--   globalFlags.completeRoutePassed = true
--   globalFlags.confirmRoutePassed = true
--
-- Important:
-- This is health/activity tracking only.
-- It makes no medical diagnosis or treatment claim.

with target_events as (
  select
    'complete_route'::text as route_name,
    '0a4aa94a-7956-4d3e-9d1d-6629360bee5f'::uuid as event_id

  union all

  select
    'confirm_route'::text as route_name,
    'c8cbb0fd-237d-44de-b13f-468102dfc4d2'::uuid as event_id
),

activity_event_rows as (
  select
    t.route_name,
    ae.*
  from target_events t
  left join activity_events ae
    on ae.id = t.event_id
),

classification_rows as (
  select
    t.route_name,
    ec.*
  from target_events t
  join entity_classifications ec
    on (to_jsonb(ec)->>'entity_id') = t.event_id::text
    or (to_jsonb(ec)->>'activity_event_id') = t.event_id::text
    or (to_jsonb(ec)->>'source_event_id') = t.event_id::text
),

voi_link_rows as (
  select
    t.route_name,
    l.*
  from target_events t
  join activity_event_value_object_instance_links l
    on (to_jsonb(l)->>'event_id') = t.event_id::text
    or (to_jsonb(l)->>'activity_event_id') = t.event_id::text
),

voi_ids_from_links as (
  select distinct
    route_name,
    nullif(to_jsonb(voi_link_rows)->>'value_object_instance_id', '') as voi_id
  from voi_link_rows
  where nullif(to_jsonb(voi_link_rows)->>'value_object_instance_id', '') is not null
),

voi_rows as (
  select
    t.route_name,
    voi.*
  from target_events t
  join value_object_instances voi
    on (to_jsonb(voi)->>'source_event_id') = t.event_id::text
    or (to_jsonb(voi)->>'activity_event_id') = t.event_id::text
    or (to_jsonb(voi)->>'event_id') = t.event_id::text
    or (to_jsonb(voi)->>'id') in (
      select voi_id
      from voi_ids_from_links ids
      where ids.route_name = t.route_name
    )
),

voi_ids as (
  select distinct
    route_name,
    nullif(to_jsonb(voi_rows)->>'id', '') as voi_id
  from voi_rows
  where nullif(to_jsonb(voi_rows)->>'id', '') is not null

  union

  select distinct
    route_name,
    voi_id
  from voi_ids_from_links
  where voi_id is not null
),

impact_event_rows as (
  select
    t.route_name,
    ie.*
  from target_events t
  join impact_events ie
    on (to_jsonb(ie)->>'event_id') = t.event_id::text
    or (to_jsonb(ie)->>'activity_event_id') = t.event_id::text
),

state_delta_rows as (
  select
    t.route_name,
    d.*
  from target_events t
  join value_object_state_deltas d
    on (to_jsonb(d)->>'event_id') = t.event_id::text
    or (to_jsonb(d)->>'activity_event_id') = t.event_id::text
    or (to_jsonb(d)->>'source_event_id') = t.event_id::text
    or (to_jsonb(d)->>'value_object_instance_id') in (
      select voi_id
      from voi_ids ids
      where ids.route_name = t.route_name
    )
    or (to_jsonb(d)->>'voi_id') in (
      select voi_id
      from voi_ids ids
      where ids.route_name = t.route_name
    )
),

value_object_ids as (
  select distinct
    route_name,
    nullif(to_jsonb(voi_rows)->>'value_object_id', '') as value_object_id
  from voi_rows
  where nullif(to_jsonb(voi_rows)->>'value_object_id', '') is not null

  union

  select distinct
    route_name,
    nullif(to_jsonb(state_delta_rows)->>'value_object_id', '') as value_object_id
  from state_delta_rows
  where nullif(to_jsonb(state_delta_rows)->>'value_object_id', '') is not null

  union

  select distinct
    route_name,
    nullif(to_jsonb(voi_link_rows)->>'value_object_id', '') as value_object_id
  from voi_link_rows
  where nullif(to_jsonb(voi_link_rows)->>'value_object_id', '') is not null
),

value_object_rows as (
  select
    ids.route_name,
    vo.*
  from value_object_ids ids
  join value_objects vo
    on (to_jsonb(vo)->>'id') = ids.value_object_id
),

daily_aggregate_rows as (
  select
    ids.route_name,
    a.*
  from value_object_ids ids
  join value_object_daily_aggregates a
    on (to_jsonb(a)->>'value_object_id') = ids.value_object_id
),

snapshot_rows as (
  select
    ids.route_name,
    s.*
  from value_object_ids ids
  join value_object_state_snapshots s
    on (to_jsonb(s)->>'value_object_id') = ids.value_object_id
),

processing_log_rows as (
  select
    t.route_name,
    pl.*
  from target_events t
  join activity_processing_logs pl
    on (to_jsonb(pl)->>'event_id') = t.event_id::text
    or (to_jsonb(pl)->>'activity_event_id') = t.event_id::text
    or (to_jsonb(pl)->>'entity_id') = t.event_id::text
),

per_event_summary as (
  select
    t.route_name,
    t.event_id::text as event_id,

    (
      select count(*)
      from activity_event_rows ae
      where ae.route_name = t.route_name
        and ae.id = t.event_id
    ) as activity_event_count,

    (
      select count(*)
      from activity_event_rows ae
      where ae.route_name = t.route_name
        and ae.id = t.event_id
        and ae.status = 'completed'
        and ae.processing_status = 'processed'
        and ae.activity_template_id = 'c1698136-341e-4f61-b091-fab366a0942f'
        and ae.activity_type_id = '9cf78347-c607-413e-bd60-20b40c27181c'
    ) as completed_processed_knee_template_event_count,

    (
      select count(*)
      from classification_rows c
      where c.route_name = t.route_name
    ) as classification_count,

    (
      select count(*)
      from classification_rows c
      where c.route_name = t.route_name
        and coalesce(to_jsonb(c)->>'status', '') = 'approved'
    ) as approved_classification_count,

    (
      select count(*)
      from classification_rows c
      where c.route_name = t.route_name
        and coalesce(to_jsonb(c)->>'source_type', '') = 'system_seed'
    ) as system_seed_classification_count,

    (
      select count(*)
      from classification_rows c
      where c.route_name = t.route_name
        and coalesce(to_jsonb(c)->>'classification_role', '') = 'primary'
        and coalesce(to_jsonb(c)->>'is_primary', '') = 'true'
    ) as primary_classification_count,

    (
      select count(*)
      from impact_event_rows ie
      where ie.route_name = t.route_name
    ) as impact_event_count,

    (
      select count(*)
      from voi_link_rows l
      where l.route_name = t.route_name
    ) as voi_link_count,

    (
      select count(*)
      from voi_rows voi
      where voi.route_name = t.route_name
    ) as voi_count,

    (
      select count(*)
      from state_delta_rows d
      where d.route_name = t.route_name
    ) as state_delta_count,

    (
      select count(*)
      from daily_aggregate_rows a
      where a.route_name = t.route_name
    ) as daily_aggregate_count,

    (
      select count(*)
      from snapshot_rows s
      where s.route_name = t.route_name
    ) as snapshot_count,

    (
      select count(*)
      from processing_log_rows pl
      where pl.route_name = t.route_name
    ) as processing_log_count,

    (
      select count(*)
      from processing_log_rows pl
      where pl.route_name = t.route_name
        and coalesce(to_jsonb(pl)->>'processor_name', '') like '%rubricator_classification%'
        and coalesce(to_jsonb(pl)->>'processing_status', '') = 'completed'
    ) as rubricator_processing_log_count,

    (
      select count(*)
      from processing_log_rows pl
      where pl.route_name = t.route_name
        and coalesce(to_jsonb(pl)->>'processor_name', '') like '%value_object_bridge%'
        and coalesce(to_jsonb(pl)->>'processing_status', '') = 'completed'
    ) as value_object_bridge_processing_log_count,

    (
      select count(*)
      from value_object_rows vo
      where vo.route_name = t.route_name
    ) as value_object_count
  from target_events t
),

per_event_report as (
  select
    route_name,
    event_id,

    jsonb_build_object(
      'activityEventCount', activity_event_count,
      'completedProcessedKneeTemplateEventCount', completed_processed_knee_template_event_count,
      'classificationCount', classification_count,
      'approvedClassificationCount', approved_classification_count,
      'systemSeedClassificationCount', system_seed_classification_count,
      'primaryClassificationCount', primary_classification_count,
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
      'hasCompletedProcessedKneeTemplateEvent', completed_processed_knee_template_event_count = 1,
      'hasApprovedClassification', approved_classification_count > 0,
      'hasSystemSeedClassification', system_seed_classification_count > 0,
      'hasPrimaryClassification', primary_classification_count > 0,
      'hasThreeImpactEvents', impact_event_count = 3,
      'hasValueObject', value_object_count > 0,
      'hasVoiOrVoiLink', voi_count > 0 or voi_link_count > 0,
      'hasStateDelta', state_delta_count > 0,
      'hasDailyAggregate', daily_aggregate_count > 0,
      'hasSnapshot', snapshot_count > 0,
      'hasProcessingLogs', processing_log_count > 0,
      'hasRubricatorProcessingLog', rubricator_processing_log_count > 0,
      'hasValueObjectBridgeProcessingLog', value_object_bridge_processing_log_count > 0,
      'completeSecondKnownTemplateChain', (
        activity_event_count = 1
        and completed_processed_knee_template_event_count = 1
        and approved_classification_count > 0
        and primary_classification_count > 0
        and impact_event_count = 3
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
)

select jsonb_pretty(
  jsonb_build_object(
    'auditName', 'P4.7.8-R-L6.5 second known-template complete+confirm route audit',
    'expectedTemplate', jsonb_build_object(
      'templateSlug', 'knee-training-health-practice',
      'activityTemplateId', 'c1698136-341e-4f61-b091-fab366a0942f',
      'activityTypeId', '9cf78347-c607-413e-bd60-20b40c27181c',
      'ruleKey', 'knee_training_health_practice_to_knee_exercises',
      'valueObjectTitle', 'Knee training practice',
      'valueObjectId', 'b7acc958-7966-42c2-82c5-35c4de26d7ea'
    ),
    'events', (
      select jsonb_agg(
        jsonb_build_object(
          'routeName', route_name,
          'eventId', event_id,
          'summary', summary,
          'flags', flags
        )
        order by route_name
      )
      from per_event_report
    ),
    'globalFlags', jsonb_build_object(
      'allRoutesPassed', (
        select bool_and((flags->>'completeSecondKnownTemplateChain')::boolean)
        from per_event_report
      ),
      'routesAuditedCount', (
        select count(*)
        from per_event_report
      ),
      'completeRoutePassed', (
        select (flags->>'completeSecondKnownTemplateChain')::boolean
        from per_event_report
        where route_name = 'complete_route'
      ),
      'confirmRoutePassed', (
        select (flags->>'completeSecondKnownTemplateChain')::boolean
        from per_event_report
        where route_name = 'confirm_route'
      )
    )
  )
) as audit_report;
