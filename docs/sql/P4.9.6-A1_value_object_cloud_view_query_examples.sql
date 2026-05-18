/*
P4.9.6-A1
Diagnostic SQL examples against public.value_object_cloud_profiles_v1.

Purpose:
- verify practical read/query patterns before adding API/UI;
- keep this step read-only;
- test queries by:
  1. user
  2. category
  3. value_object
  4. latest activity
  5. snapshot/daily aggregate payloads

This SQL does not modify data.
*/

WITH detected_user AS (
  SELECT user_id
  FROM public.value_object_cloud_profiles_v1
  ORDER BY last_used_at DESC NULLS LAST
  LIMIT 1
),

category_summary AS (
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
  WHERE user_id IN (SELECT user_id FROM detected_user)
  GROUP BY
    contextual_category_slug,
    contextual_category_name,
    contextual_category_status,
    contextual_category_is_active
),

object_profiles_for_user AS (
  SELECT
    user_id,
    value_object_id,
    category_table,
    category_id,
    category_role,
    contextual_category_slug,
    contextual_category_name,
    contextual_category_status,
    contextual_category_is_active,
    usage_count,
    total_exposure_minutes,
    first_used_at,
    last_used_at,
    latest_event_id,
    latest_event_title,
    latest_event_status,
    latest_event_duration_minutes,
    latest_exposure_minutes,
    latest_activity_template_slug,
    latest_activity_template_title,
    snapshots,
    daily_aggregates
  FROM public.value_object_cloud_profiles_v1
  WHERE user_id IN (SELECT user_id FROM detected_user)
  ORDER BY contextual_category_slug, value_object_id
),

business_german_profiles AS (
  SELECT *
  FROM public.value_object_cloud_profiles_v1
  WHERE user_id IN (SELECT user_id FROM detected_user)
    AND contextual_category_slug = 'business-german'
  ORDER BY last_used_at DESC NULLS LAST
),

knee_exercises_profiles AS (
  SELECT *
  FROM public.value_object_cloud_profiles_v1
  WHERE user_id IN (SELECT user_id FROM detected_user)
    AND contextual_category_slug = 'knee-exercises'
  ORDER BY last_used_at DESC NULLS LAST
),

latest_objects AS (
  SELECT
    user_id,
    value_object_id,
    contextual_category_slug,
    contextual_category_name,
    usage_count,
    total_exposure_minutes,
    last_used_at,
    latest_event_id,
    latest_event_title,
    latest_activity_template_slug,
    latest_exposure_minutes
  FROM public.value_object_cloud_profiles_v1
  WHERE user_id IN (SELECT user_id FROM detected_user)
  ORDER BY last_used_at DESC NULLS LAST
  LIMIT 10
),

snapshot_payloads AS (
  SELECT
    user_id,
    value_object_id,
    contextual_category_slug,
    contextual_category_name,
    snapshots
  FROM public.value_object_cloud_profiles_v1
  WHERE user_id IN (SELECT user_id FROM detected_user)
  ORDER BY contextual_category_slug, value_object_id
),

daily_aggregate_payloads AS (
  SELECT
    user_id,
    value_object_id,
    contextual_category_slug,
    contextual_category_name,
    daily_aggregates
  FROM public.value_object_cloud_profiles_v1
  WHERE user_id IN (SELECT user_id FROM detected_user)
  ORDER BY contextual_category_slug, value_object_id
),

counts AS (
  SELECT
    (SELECT count(*) FROM detected_user) AS detected_user_count,
    (SELECT count(*) FROM public.value_object_cloud_profiles_v1) AS view_rows_count,
    (SELECT count(*) FROM object_profiles_for_user) AS object_profiles_for_detected_user_count,
    (SELECT count(*) FROM category_summary) AS category_summary_rows_count,
    (SELECT count(*) FROM business_german_profiles) AS business_german_profiles_count,
    (SELECT count(*) FROM knee_exercises_profiles) AS knee_exercises_profiles_count,
    (SELECT count(*) FROM latest_objects) AS latest_objects_count
)

SELECT
  '00_counts' AS section,
  COALESCE(jsonb_agg(to_jsonb(counts)), '[]'::jsonb) AS data
FROM counts

UNION ALL

SELECT
  '01_detected_user' AS section,
  COALESCE(jsonb_agg(to_jsonb(detected_user)), '[]'::jsonb) AS data
FROM detected_user

UNION ALL

SELECT
  '02_category_summary' AS section,
  COALESCE(jsonb_agg(to_jsonb(category_summary) ORDER BY contextual_category_slug), '[]'::jsonb) AS data
FROM category_summary

UNION ALL

SELECT
  '03_object_profiles_for_user' AS section,
  COALESCE(jsonb_agg(to_jsonb(object_profiles_for_user) ORDER BY contextual_category_slug, value_object_id), '[]'::jsonb) AS data
FROM object_profiles_for_user

UNION ALL

SELECT
  '04_business_german_profiles' AS section,
  COALESCE(jsonb_agg(to_jsonb(business_german_profiles)), '[]'::jsonb) AS data
FROM business_german_profiles

UNION ALL

SELECT
  '05_knee_exercises_profiles' AS section,
  COALESCE(jsonb_agg(to_jsonb(knee_exercises_profiles)), '[]'::jsonb) AS data
FROM knee_exercises_profiles

UNION ALL

SELECT
  '06_latest_objects' AS section,
  COALESCE(jsonb_agg(to_jsonb(latest_objects)), '[]'::jsonb) AS data
FROM latest_objects

UNION ALL

SELECT
  '07_snapshot_payloads' AS section,
  COALESCE(jsonb_agg(to_jsonb(snapshot_payloads)), '[]'::jsonb) AS data
FROM snapshot_payloads

UNION ALL

SELECT
  '08_daily_aggregate_payloads' AS section,
  COALESCE(jsonb_agg(to_jsonb(daily_aggregate_payloads)), '[]'::jsonb) AS data
FROM daily_aggregate_payloads

ORDER BY section;
