/*
P4.9.5-A1
Create reusable object-cloud read interface.

Creates:
- public.value_object_cloud_profiles_v1

Purpose:
- reusable read model over v4.2 runtime foundation;
- one row per user + Value Object + contextual category link;
- combines usage, category, latest exposure, snapshots and daily aggregates.

Tables used:
- value_object_category_links
- contextual_categories
- value_object_usage_aggregates
- activity_event_value_object_links
- activity_events
- activity_templates
- value_object_state_snapshots
- value_object_daily_aggregates

Important:
- This is a read interface.
- It does not change runtime writer logic.
- It does not replace old VOI pipeline.
*/

CREATE OR REPLACE VIEW public.value_object_cloud_profiles_v1 AS
WITH object_category_cloud AS (
  SELECT
    cl.value_object_id,
    cl.category_table,
    cl.category_id,
    cl.category_role,
    cl.source AS category_link_source,
    cl.confidence AS category_link_confidence,
    cl.created_at AS category_link_created_at,
    cl.updated_at AS category_link_updated_at,
    cl.metadata_json AS category_link_metadata_json,
    cc.slug AS contextual_category_slug,
    cc.name AS contextual_category_name,
    cc.status AS contextual_category_status,
    cc.is_active AS contextual_category_is_active
  FROM public.value_object_category_links cl
  LEFT JOIN public.contextual_categories cc
    ON cl.category_table = 'contextual_categories'
   AND cc.id = cl.category_id
),

object_usage AS (
  SELECT
    ua.id AS usage_aggregate_id,
    ua.user_id,
    ua.value_object_id,
    ua.usage_count,
    ua.exposure_minutes,
    ua.first_used_at,
    ua.last_used_at,
    ua.last_event_id,
    ua.source AS usage_source,
    ua.metadata_json AS usage_metadata_json,
    ua.created_at AS usage_created_at,
    ua.updated_at AS usage_updated_at
  FROM public.value_object_usage_aggregates ua
),

latest_event_exposures AS (
  SELECT
    l.id AS event_value_object_link_id,
    l.user_id,
    l.event_id,
    l.value_object_id,
    l.exposure_minutes,
    l.source AS exposure_source,
    l.confidence AS exposure_confidence,
    l.metadata_json AS exposure_metadata_json,
    l.created_at AS exposure_created_at,
    l.updated_at AS exposure_updated_at,
    ae.title AS event_title,
    ae.status AS event_status,
    ae.duration_minutes AS event_duration_minutes,
    ae.started_at AS event_started_at,
    ae.ended_at AS event_ended_at,
    ae.created_at AS event_created_at,
    ae.updated_at AS event_updated_at,
    at.slug AS activity_template_slug,
    at.title AS activity_template_title,
    ROW_NUMBER() OVER (
      PARTITION BY l.user_id, l.value_object_id
      ORDER BY l.created_at DESC NULLS LAST
    ) AS rn
  FROM public.activity_event_value_object_links l
  LEFT JOIN public.activity_events ae
    ON ae.id = l.event_id
  LEFT JOIN public.activity_templates at
    ON at.id = ae.activity_template_id
),

latest_exposure_per_object AS (
  SELECT *
  FROM latest_event_exposures
  WHERE rn = 1
),

state_snapshot_summary AS (
  SELECT
    ss.user_id,
    ss.value_object_id,
    jsonb_agg(
      jsonb_build_object(
        'snapshotId', ss.id,
        'metricKey', ss.metric_key,
        'metricValueNumeric', ss.metric_value_numeric,
        'metricValueText', ss.metric_value_text,
        'metricUnit', ss.metric_unit,
        'source', ss.source,
        'lastEventId', ss.last_event_id,
        'lastStateDeltaId', ss.last_state_delta_id,
        'updatedAt', ss.updated_at
      )
      ORDER BY ss.updated_at DESC NULLS LAST
    ) AS snapshots
  FROM public.value_object_state_snapshots ss
  GROUP BY ss.user_id, ss.value_object_id
),

daily_aggregate_summary AS (
  SELECT
    da.user_id,
    da.value_object_id,
    jsonb_agg(
      jsonb_build_object(
        'dailyAggregateId', da.id,
        'aggregateDate', da.aggregate_date,
        'aggregateType', da.aggregate_type,
        'aggregateKey', da.aggregate_key,
        'metricKey', da.metric_key,
        'metricValueNumeric', da.metric_value_numeric,
        'metricValueText', da.metric_value_text,
        'metricUnit', da.metric_unit,
        'source', da.source,
        'lastEventId', da.last_event_id,
        'lastStateDeltaId', da.last_state_delta_id,
        'updatedAt', da.updated_at
      )
      ORDER BY da.aggregate_date DESC NULLS LAST, da.updated_at DESC NULLS LAST
    ) AS daily_aggregates
  FROM public.value_object_daily_aggregates da
  GROUP BY da.user_id, da.value_object_id
)

SELECT
  ou.user_id,
  occ.value_object_id,
  occ.category_table,
  occ.category_id,
  occ.category_role,
  occ.contextual_category_slug,
  occ.contextual_category_name,
  occ.contextual_category_status,
  occ.contextual_category_is_active,
  occ.category_link_source,
  occ.category_link_confidence,
  occ.category_link_created_at,
  occ.category_link_updated_at,
  ou.usage_aggregate_id,
  ou.usage_count,
  ou.exposure_minutes AS total_exposure_minutes,
  ou.first_used_at,
  ou.last_used_at,
  ou.last_event_id,
  ou.usage_source,
  ou.usage_created_at,
  ou.usage_updated_at,
  le.event_value_object_link_id AS latest_event_value_object_link_id,
  le.event_id AS latest_event_id,
  le.event_title AS latest_event_title,
  le.event_status AS latest_event_status,
  le.event_duration_minutes AS latest_event_duration_minutes,
  le.exposure_minutes AS latest_exposure_minutes,
  le.activity_template_slug AS latest_activity_template_slug,
  le.activity_template_title AS latest_activity_template_title,
  sss.snapshots,
  das.daily_aggregates
FROM object_usage ou
JOIN object_category_cloud occ
  ON occ.value_object_id = ou.value_object_id
LEFT JOIN latest_exposure_per_object le
  ON le.user_id = ou.user_id
 AND le.value_object_id = ou.value_object_id
LEFT JOIN state_snapshot_summary sss
  ON sss.user_id = ou.user_id
 AND sss.value_object_id = ou.value_object_id
LEFT JOIN daily_aggregate_summary das
  ON das.user_id = ou.user_id
 AND das.value_object_id = ou.value_object_id;

COMMENT ON VIEW public.value_object_cloud_profiles_v1 IS
'P4.9.5-A1 reusable read model for v4.2 Value Object object-cloud profile. Combines category links, usage aggregates, latest exposures, snapshots and daily aggregates.';

SELECT
  '00_view_exists' AS section,
  jsonb_build_array(
    jsonb_build_object(
      'view_schema', table_schema,
      'view_name', table_name
    )
  ) AS data
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name = 'value_object_cloud_profiles_v1'

UNION ALL

SELECT
  '01_counts' AS section,
  jsonb_build_array(
    jsonb_build_object(
      'view_rows_count', (SELECT count(*) FROM public.value_object_cloud_profiles_v1),
      'distinct_users_count', (SELECT count(DISTINCT user_id) FROM public.value_object_cloud_profiles_v1),
      'distinct_value_objects_count', (SELECT count(DISTINCT value_object_id) FROM public.value_object_cloud_profiles_v1),
      'distinct_categories_count', (SELECT count(DISTINCT contextual_category_slug) FROM public.value_object_cloud_profiles_v1)
    )
  ) AS data

UNION ALL

SELECT
  '02_category_summary_from_view' AS section,
  COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'contextualCategorySlug', contextual_category_slug,
        'contextualCategoryName', contextual_category_name,
        'contextualCategoryStatus', contextual_category_status,
        'contextualCategoryIsActive', contextual_category_is_active,
        'valueObjectsCount', value_objects_count,
        'totalUsageCount', total_usage_count,
        'totalExposureMinutes', total_exposure_minutes,
        'lastUsedAt', last_used_at
      )
      ORDER BY contextual_category_slug
    ),
    '[]'::jsonb
  ) AS data
FROM (
  SELECT
    contextual_category_slug,
    contextual_category_name,
    contextual_category_status,
    contextual_category_is_active,
    count(DISTINCT value_object_id) AS value_objects_count,
    COALESCE(sum(usage_count), 0) AS total_usage_count,
    COALESCE(sum(total_exposure_minutes), 0) AS total_exposure_minutes,
    max(last_used_at) AS last_used_at
  FROM public.value_object_cloud_profiles_v1
  GROUP BY
    contextual_category_slug,
    contextual_category_name,
    contextual_category_status,
    contextual_category_is_active
) category_summary

UNION ALL

SELECT
  '03_profiles_from_view' AS section,
  COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'userId', user_id,
        'valueObjectId', value_object_id,
        'categorySlug', contextual_category_slug,
        'categoryName', contextual_category_name,
        'categoryRole', category_role,
        'usageCount', usage_count,
        'totalExposureMinutes', total_exposure_minutes,
        'latestEventId', latest_event_id,
        'latestEventTitle', latest_event_title,
        'latestActivityTemplateSlug', latest_activity_template_slug,
        'latestExposureMinutes', latest_exposure_minutes,
        'snapshots', snapshots,
        'dailyAggregates', daily_aggregates
      )
      ORDER BY contextual_category_slug, value_object_id
    ),
    '[]'::jsonb
  ) AS data
FROM public.value_object_cloud_profiles_v1

ORDER BY section;
