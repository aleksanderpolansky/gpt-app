-- P4.7.8-R-L3
-- Lightweight known-template Activity -> Rubricator -> Value Object chain audit
--
-- Purpose:
-- Fast regression check for the verified chain without returning large row arrays.
--
-- Usage:
-- 1) Replace the UUID in target_event.
-- 2) Run in Supabase SQL Editor.
-- 3) Check flags.completeKnownTemplateChain.
--
-- Verified example events:
-- record route:
--   d42ca357-df9e-4d42-af0d-9c17898c9a05
-- complete route:
--   810fc9fc-1524-4d20-b3ca-68c8301cf5ed
-- confirm route:
--   8a1de3d2-d453-43ad-ae13-1f3c09eb12d5
-- L2.4 runtime record:
--   f27854d9-989d-4618-b2ce-ef3e7676f715
-- L2.4 runtime complete:
--   94bdac48-7ddf-4413-a5de-dfc6721e42ec

WITH target_event AS (
  SELECT 'f27854d9-989d-4618-b2ce-ef3e7676f715'::uuid AS event_id
),

activity_event_rows AS (
  SELECT ae.*
  FROM activity_events ae
  JOIN target_event t ON ae.id = t.event_id
),

classification_rows AS (
  SELECT ec.*
  FROM entity_classifications ec
  CROSS JOIN target_event t
  WHERE (to_jsonb(ec)->>'entity_id') = t.event_id::text
     OR (to_jsonb(ec)->>'activity_event_id') = t.event_id::text
     OR (to_jsonb(ec)->>'source_event_id') = t.event_id::text
),

voi_link_rows AS (
  SELECT l.*
  FROM activity_event_value_object_instance_links l
  CROSS JOIN target_event t
  WHERE (to_jsonb(l)->>'event_id') = t.event_id::text
     OR (to_jsonb(l)->>'activity_event_id') = t.event_id::text
),

voi_ids_from_links AS (
  SELECT DISTINCT NULLIF(to_jsonb(l)->>'value_object_instance_id', '') AS voi_id
  FROM voi_link_rows l
  WHERE NULLIF(to_jsonb(l)->>'value_object_instance_id', '') IS NOT NULL
),

voi_rows AS (
  SELECT voi.*
  FROM value_object_instances voi
  CROSS JOIN target_event t
  WHERE (to_jsonb(voi)->>'source_event_id') = t.event_id::text
     OR (to_jsonb(voi)->>'activity_event_id') = t.event_id::text
     OR (to_jsonb(voi)->>'event_id') = t.event_id::text
     OR (to_jsonb(voi)->>'id') IN (SELECT voi_id FROM voi_ids_from_links)
),

voi_ids AS (
  SELECT DISTINCT NULLIF(to_jsonb(voi)->>'id', '') AS voi_id
  FROM voi_rows voi
  WHERE NULLIF(to_jsonb(voi)->>'id', '') IS NOT NULL

  UNION

  SELECT DISTINCT voi_id
  FROM voi_ids_from_links
  WHERE voi_id IS NOT NULL
),

impact_event_rows AS (
  SELECT ie.*
  FROM impact_events ie
  CROSS JOIN target_event t
  WHERE (to_jsonb(ie)->>'event_id') = t.event_id::text
     OR (to_jsonb(ie)->>'activity_event_id') = t.event_id::text
),

state_delta_rows AS (
  SELECT d.*
  FROM value_object_state_deltas d
  CROSS JOIN target_event t
  WHERE (to_jsonb(d)->>'event_id') = t.event_id::text
     OR (to_jsonb(d)->>'activity_event_id') = t.event_id::text
     OR (to_jsonb(d)->>'source_event_id') = t.event_id::text
     OR (to_jsonb(d)->>'value_object_instance_id') IN (SELECT voi_id FROM voi_ids)
     OR (to_jsonb(d)->>'voi_id') IN (SELECT voi_id FROM voi_ids)
),

value_object_ids AS (
  SELECT DISTINCT NULLIF(to_jsonb(voi)->>'value_object_id', '') AS value_object_id
  FROM voi_rows voi
  WHERE NULLIF(to_jsonb(voi)->>'value_object_id', '') IS NOT NULL

  UNION

  SELECT DISTINCT NULLIF(to_jsonb(d)->>'value_object_id', '') AS value_object_id
  FROM state_delta_rows d
  WHERE NULLIF(to_jsonb(d)->>'value_object_id', '') IS NOT NULL

  UNION

  SELECT DISTINCT NULLIF(to_jsonb(l)->>'value_object_id', '') AS value_object_id
  FROM voi_link_rows l
  WHERE NULLIF(to_jsonb(l)->>'value_object_id', '') IS NOT NULL
),

value_object_rows AS (
  SELECT vo.*
  FROM value_objects vo
  WHERE (to_jsonb(vo)->>'id') IN (SELECT value_object_id FROM value_object_ids)
),

daily_aggregate_rows AS (
  SELECT a.*
  FROM value_object_daily_aggregates a
  CROSS JOIN target_event t
  WHERE (to_jsonb(a)->>'value_object_id') IN (SELECT value_object_id FROM value_object_ids)
     OR (to_jsonb(a)->>'event_id') = t.event_id::text
     OR (to_jsonb(a)->>'last_event_id') = t.event_id::text
     OR (to_jsonb(a)->>'source_event_id') = t.event_id::text
),

snapshot_rows AS (
  SELECT s.*
  FROM value_object_state_snapshots s
  CROSS JOIN target_event t
  WHERE (to_jsonb(s)->>'value_object_id') IN (SELECT value_object_id FROM value_object_ids)
     OR (to_jsonb(s)->>'event_id') = t.event_id::text
     OR (to_jsonb(s)->>'last_event_id') = t.event_id::text
     OR (to_jsonb(s)->>'source_event_id') = t.event_id::text
),

processing_log_rows AS (
  SELECT pl.*
  FROM activity_processing_logs pl
  CROSS JOIN target_event t
  WHERE (to_jsonb(pl)->>'event_id') = t.event_id::text
     OR (to_jsonb(pl)->>'activity_event_id') = t.event_id::text
     OR (to_jsonb(pl)->>'entity_id') = t.event_id::text
),

audit_summary AS (
  SELECT
    (SELECT event_id::text FROM target_event) AS event_id,

    (SELECT count(*) FROM activity_event_rows) AS activity_event_count,

    (SELECT count(*) FROM classification_rows) AS classification_count,

    (
      SELECT count(*)
      FROM classification_rows c
      WHERE coalesce(to_jsonb(c)->>'status', '') = 'approved'
    ) AS approved_classification_count,

    (
      SELECT count(*)
      FROM classification_rows c
      WHERE coalesce(to_jsonb(c)->>'source_type', '') = 'system_seed'
    ) AS system_seed_classification_count,

    (SELECT count(*) FROM impact_event_rows) AS impact_event_count,
    (SELECT count(*) FROM voi_link_rows) AS voi_link_count,
    (SELECT count(*) FROM voi_rows) AS voi_count,
    (SELECT count(*) FROM state_delta_rows) AS state_delta_count,
    (SELECT count(*) FROM daily_aggregate_rows) AS daily_aggregate_count,
    (SELECT count(*) FROM snapshot_rows) AS snapshot_count,
    (SELECT count(*) FROM processing_log_rows) AS processing_log_count,
    (SELECT count(*) FROM value_object_rows) AS value_object_count
)

SELECT jsonb_pretty(
  jsonb_build_object(
    'auditName', 'P4.7.8-R-L3 lightweight known-template chain audit',
    'eventId', (SELECT event_id FROM audit_summary),

    'summary', jsonb_build_object(
      'activityEventCount', (SELECT activity_event_count FROM audit_summary),
      'classificationCount', (SELECT classification_count FROM audit_summary),
      'approvedClassificationCount', (SELECT approved_classification_count FROM audit_summary),
      'systemSeedClassificationCount', (SELECT system_seed_classification_count FROM audit_summary),
      'impactEventCount', (SELECT impact_event_count FROM audit_summary),
      'valueObjectCount', (SELECT value_object_count FROM audit_summary),
      'voiCount', (SELECT voi_count FROM audit_summary),
      'voiLinkCount', (SELECT voi_link_count FROM audit_summary),
      'stateDeltaCount', (SELECT state_delta_count FROM audit_summary),
      'dailyAggregateCount', (SELECT daily_aggregate_count FROM audit_summary),
      'snapshotCount', (SELECT snapshot_count FROM audit_summary),
      'processingLogCount', (SELECT processing_log_count FROM audit_summary)
    ),

    'flags', jsonb_build_object(
      'hasActivityEvent', (SELECT activity_event_count FROM audit_summary) = 1,
      'hasApprovedClassification', (SELECT approved_classification_count FROM audit_summary) > 0,
      'hasSystemSeedClassification', (SELECT system_seed_classification_count FROM audit_summary) > 0,
      'hasVoiOrVoiLink', (
        (SELECT voi_count FROM audit_summary) > 0
        OR (SELECT voi_link_count FROM audit_summary) > 0
      ),
      'hasStateDelta', (SELECT state_delta_count FROM audit_summary) > 0,
      'hasDailyAggregate', (SELECT daily_aggregate_count FROM audit_summary) > 0,
      'hasSnapshot', (SELECT snapshot_count FROM audit_summary) > 0,
      'hasProcessingLogs', (SELECT processing_log_count FROM audit_summary) > 0,
      'completeKnownTemplateChain', (
        (SELECT activity_event_count FROM audit_summary) = 1
        AND (SELECT approved_classification_count FROM audit_summary) > 0
        AND (
          (SELECT voi_count FROM audit_summary) > 0
          OR (SELECT voi_link_count FROM audit_summary) > 0
        )
        AND (SELECT state_delta_count FROM audit_summary) > 0
        AND (SELECT daily_aggregate_count FROM audit_summary) > 0
        AND (SELECT snapshot_count FROM audit_summary) > 0
      )
    )
  )
) AS audit_report;
