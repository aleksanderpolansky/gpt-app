/*
P4.9.3-A2
Targeted verification after running knee-training-health-practice through current runtime.

Target event:
d13c6396-af0c-4ab2-b945-43bb4a3042dc
*/

WITH target_event AS (
  SELECT
    ae.id,
    ae.user_id,
    ae.title,
    ae.status,
    ae.duration_minutes,
    ae.started_at,
    ae.ended_at,
    ae.created_at,
    ae.updated_at,
    ae.processing_status,
    ae.activity_template_id,
    ae.activity_type_id,
    at.slug AS template_slug,
    at.title AS template_title
  FROM public.activity_events ae
  LEFT JOIN public.activity_templates at
    ON at.id = ae.activity_template_id
  WHERE ae.id = 'd13c6396-af0c-4ab2-b945-43bb4a3042dc'
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
  WHERE l.event_id = 'd13c6396-af0c-4ab2-b945-43bb4a3042dc'
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
    l.updated_at,
    l.metadata_json #>> '{mappingMetadata,classification,contextualCategoryId}' AS contextual_category_id_text,
    l.metadata_json #>> '{mappingMetadata,classification,contextualCategorySlug}' AS contextual_category_slug,
    l.metadata_json #>> '{mappingMetadata,classification,contextualCategoryName}' AS contextual_category_name,
    l.metadata_json #>> '{mappingMetadata,classification,classificationRole}' AS classification_role
  FROM public.activity_event_value_object_links l
  WHERE l.event_id = 'd13c6396-af0c-4ab2-b945-43bb4a3042dc'
  ORDER BY l.created_at DESC NULLS LAST
),

usage_aggregates_for_target AS (
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
  WHERE ua.last_event_id = 'd13c6396-af0c-4ab2-b945-43bb4a3042dc'
     OR ua.value_object_id IN (
       SELECT value_object_id
       FROM new_v42_event_vo_links
     )
  ORDER BY ua.updated_at DESC NULLS LAST
),

category_links_for_target AS (
  SELECT
    cl.id,
    cl.value_object_id,
    cl.category_table,
    cl.category_id,
    cl.category_role,
    cl.source,
    cl.confidence,
    cl.metadata_json,
    cl.created_at,
    cl.updated_at,
    cc.slug AS contextual_category_slug,
    cc.name AS contextual_category_name,
    cc.status AS contextual_category_status,
    cc.is_active AS contextual_category_is_active
  FROM public.value_object_category_links cl
  LEFT JOIN public.contextual_categories cc
    ON cl.category_table = 'contextual_categories'
   AND cc.id = cl.category_id
  WHERE cl.value_object_id IN (
    SELECT value_object_id
    FROM old_voi_links
    UNION
    SELECT value_object_id
    FROM new_v42_event_vo_links
  )
  ORDER BY cl.updated_at DESC NULLS LAST, cl.created_at DESC NULLS LAST
),

p491_projection_rows_for_target AS (
  SELECT *
  FROM new_v42_event_vo_links
  WHERE metadata_json::text ILIKE '%p491%'
     OR metadata_json::text ILIKE '%additive_v4_2_runtime_projection%'
),

p492_category_links_for_target AS (
  SELECT
    cl.id,
    cl.value_object_id,
    cl.category_table,
    cl.category_id,
    cl.category_role,
    cl.source,
    cl.confidence,
    cl.metadata_json,
    cl.created_at,
    cl.updated_at
  FROM public.value_object_category_links cl
  WHERE cl.value_object_id IN (
    SELECT value_object_id
    FROM old_voi_links
    UNION
    SELECT value_object_id
    FROM new_v42_event_vo_links
  )
    AND (
      cl.metadata_json::text ILIKE '%p492%'
      OR cl.metadata_json::text ILIKE '%runtime_category_link_from_bridge_mapping_metadata%'
    )
  ORDER BY cl.updated_at DESC NULLS LAST, cl.created_at DESC NULLS LAST
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
    sd.metric_unit,
    sd.delta_direction,
    sd.source,
    sd.confidence,
    sd.metadata_json,
    sd.created_at
  FROM public.value_object_state_deltas sd
  WHERE sd.event_id = 'd13c6396-af0c-4ab2-b945-43bb4a3042dc'
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
    da.metric_unit,
    da.source,
    da.last_event_id,
    da.last_state_delta_id,
    da.metadata_json,
    da.created_at,
    da.updated_at
  FROM public.value_object_daily_aggregates da
  WHERE da.last_event_id = 'd13c6396-af0c-4ab2-b945-43bb4a3042dc'
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
    ss.metric_unit,
    ss.source,
    ss.last_event_id,
    ss.last_state_delta_id,
    ss.metadata_json,
    ss.created_at,
    ss.updated_at
  FROM public.value_object_state_snapshots ss
  WHERE ss.last_event_id = 'd13c6396-af0c-4ab2-b945-43bb4a3042dc'
  ORDER BY ss.updated_at DESC NULLS LAST
),

counts AS (
  SELECT
    (SELECT count(*) FROM target_event) AS target_event_count,
    (SELECT count(*) FROM target_event WHERE template_slug = 'knee-training-health-practice') AS knee_target_event_count,
    (SELECT count(*) FROM old_voi_links) AS old_voi_links_for_event_count,
    (SELECT count(*) FROM new_v42_event_vo_links) AS new_v42_links_for_event_count,
    (SELECT count(*) FROM p491_projection_rows_for_target) AS p491_projection_rows_for_event_count,
    (SELECT count(*) FROM usage_aggregates_for_target) AS usage_aggregates_for_event_count,
    (SELECT count(*) FROM category_links_for_target) AS category_links_for_value_object_count,
    (SELECT count(*) FROM p492_category_links_for_target) AS p492_category_links_for_value_object_count,
    (SELECT count(*) FROM state_deltas) AS state_deltas_for_event_count,
    (SELECT count(*) FROM daily_aggregates) AS daily_aggregates_for_event_count,
    (SELECT count(*) FROM state_snapshots) AS state_snapshots_for_event_count,
    (SELECT count(*) FROM public.activity_event_value_object_links) AS global_p491_projection_rows_count,
    (SELECT count(*) FROM public.value_object_usage_aggregates) AS global_usage_aggregates_count,
    (SELECT count(*) FROM public.value_object_category_links) AS global_category_links_count
)

SELECT
  '00_counts' AS section,
  COALESCE(jsonb_agg(to_jsonb(counts)), '[]'::jsonb) AS data
FROM counts

UNION ALL

SELECT
  '01_target_event' AS section,
  COALESCE(jsonb_agg(to_jsonb(target_event)), '[]'::jsonb) AS data
FROM target_event

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
  COALESCE(jsonb_agg(to_jsonb(usage_aggregates_for_target)), '[]'::jsonb) AS data
FROM usage_aggregates_for_target

UNION ALL

SELECT
  '05_value_object_category_links_for_target_value_object' AS section,
  COALESCE(jsonb_agg(to_jsonb(category_links_for_target)), '[]'::jsonb) AS data
FROM category_links_for_target

UNION ALL

SELECT
  '06_p491_projection_rows_for_target' AS section,
  COALESCE(jsonb_agg(to_jsonb(p491_projection_rows_for_target)), '[]'::jsonb) AS data
FROM p491_projection_rows_for_target

UNION ALL

SELECT
  '07_p492_category_links_for_target' AS section,
  COALESCE(jsonb_agg(to_jsonb(p492_category_links_for_target)), '[]'::jsonb) AS data
FROM p492_category_links_for_target

UNION ALL

SELECT
  '08_value_object_state_deltas' AS section,
  COALESCE(jsonb_agg(to_jsonb(state_deltas)), '[]'::jsonb) AS data
FROM state_deltas

UNION ALL

SELECT
  '09_value_object_daily_aggregates' AS section,
  COALESCE(jsonb_agg(to_jsonb(daily_aggregates)), '[]'::jsonb) AS data
FROM daily_aggregates

UNION ALL

SELECT
  '10_value_object_state_snapshots' AS section,
  COALESCE(jsonb_agg(to_jsonb(state_snapshots)), '[]'::jsonb) AS data
FROM state_snapshots

ORDER BY section;
