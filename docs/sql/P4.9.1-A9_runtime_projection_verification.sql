/*
P4.9.1-A9b
Runtime verification after first v4.2 projection integration

Fix:
- public.activity_event_value_object_instance_links has created_at but no updated_at.
- Removed l.updated_at from old_voi_links.
*/

WITH recent_events AS (
  SELECT
    ae.id,
    ae.user_id,
    ae.title,
    ae.status,
    ae.duration_minutes,
    ae.started_at,
    ae.ended_at,
    ae.created_at,
    ae.updated_at
  FROM public.activity_events ae
  WHERE ae.created_at >= now() - interval '2 hours'
     OR ae.updated_at >= now() - interval '2 hours'
  ORDER BY greatest(ae.created_at, ae.updated_at) DESC NULLS LAST
  LIMIT 20
),

old_voi_links AS (
  SELECT
    l.id,
    l.user_id,
    l.event_id,
    l.value_object_instance_id,
    voi.value_object_id,
    l.relation_type,
    l.weight,
    l.confidence,
    l.source,
    l.metadata_json,
    l.created_at
  FROM public.activity_event_value_object_instance_links l
  LEFT JOIN public.value_object_instances voi
    ON voi.id = l.value_object_instance_id
  WHERE l.event_id IN (SELECT id FROM recent_events)
  ORDER BY l.created_at DESC NULLS LAST
),

new_v42_event_vo_links AS (
  SELECT
    l.id,
    l.user_id,
    l.event_id,
    l.value_object_id,
    l.exposure_minutes,
    l.source,
    l.confidence,
    l.metadata_json,
    l.created_at,
    l.updated_at
  FROM public.activity_event_value_object_links l
  WHERE l.event_id IN (SELECT id FROM recent_events)
  ORDER BY l.created_at DESC NULLS LAST
),

usage_aggregates_for_recent_events AS (
  SELECT
    ua.id,
    ua.user_id,
    ua.value_object_id,
    ua.usage_count,
    ua.exposure_minutes,
    ua.first_used_at,
    ua.last_used_at,
    ua.last_event_id,
    ua.source,
    ua.metadata_json,
    ua.created_at,
    ua.updated_at
  FROM public.value_object_usage_aggregates ua
  WHERE ua.last_event_id IN (SELECT id FROM recent_events)
     OR ua.value_object_id IN (
       SELECT value_object_id
       FROM new_v42_event_vo_links
     )
  ORDER BY ua.updated_at DESC NULLS LAST
),

state_deltas AS (
  SELECT
    sd.id,
    sd.user_id,
    sd.event_id,
    sd.value_object_instance_id,
    sd.value_object_id,
    sd.metric_key,
    sd.delta_value_numeric,
    sd.delta_value_text,
    sd.delta_direction,
    sd.source,
    sd.confidence,
    sd.created_at
  FROM public.value_object_state_deltas sd
  WHERE sd.event_id IN (SELECT id FROM recent_events)
  ORDER BY sd.created_at DESC NULLS LAST
),

daily_aggregates AS (
  SELECT
    da.id,
    da.user_id,
    da.value_object_id,
    da.aggregate_date,
    da.aggregate_type,
    da.aggregate_key,
    da.metric_key,
    da.metric_value_numeric,
    da.metric_value_text,
    da.last_event_id,
    da.last_state_delta_id,
    da.updated_at
  FROM public.value_object_daily_aggregates da
  WHERE da.last_event_id IN (SELECT id FROM recent_events)
  ORDER BY da.updated_at DESC NULLS LAST
),

state_snapshots AS (
  SELECT
    ss.id,
    ss.user_id,
    ss.value_object_id,
    ss.metric_key,
    ss.metric_value_numeric,
    ss.metric_value_text,
    ss.last_event_id,
    ss.last_state_delta_id,
    ss.updated_at
  FROM public.value_object_state_snapshots ss
  WHERE ss.last_event_id IN (SELECT id FROM recent_events)
  ORDER BY ss.updated_at DESC NULLS LAST
)

SELECT
  '01_recent_events' AS section,
  COALESCE(jsonb_agg(to_jsonb(recent_events)), '[]'::jsonb) AS data
FROM recent_events

UNION ALL

SELECT
  '02_old_activity_event_value_object_instance_links' AS section,
  COALESCE(jsonb_agg(to_jsonb(old_voi_links)), '[]'::jsonb) AS data
FROM old_voi_links

UNION ALL

SELECT
  '03_new_activity_event_value_object_links' AS section,
  COALESCE(jsonb_agg(to_jsonb(new_v42_event_vo_links)), '[]'::jsonb) AS data
FROM new_v42_event_vo_links

UNION ALL

SELECT
  '04_value_object_usage_aggregates' AS section,
  COALESCE(jsonb_agg(to_jsonb(usage_aggregates_for_recent_events)), '[]'::jsonb) AS data
FROM usage_aggregates_for_recent_events

UNION ALL

SELECT
  '05_value_object_state_deltas' AS section,
  COALESCE(jsonb_agg(to_jsonb(state_deltas)), '[]'::jsonb) AS data
FROM state_deltas

UNION ALL

SELECT
  '06_value_object_daily_aggregates' AS section,
  COALESCE(jsonb_agg(to_jsonb(daily_aggregates)), '[]'::jsonb) AS data
FROM daily_aggregates

UNION ALL

SELECT
  '07_value_object_state_snapshots' AS section,
  COALESCE(jsonb_agg(to_jsonb(state_snapshots)), '[]'::jsonb) AS data
FROM state_snapshots

ORDER BY section;
