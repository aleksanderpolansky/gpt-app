/*
P4.9.11-A1
Parent/child Value Object read-model audit.

Goal:
- inspect whether value_objects.parent_value_object_id is usable now;
- inspect current parent/child rows;
- join parent/child structure with value_object_cloud_profiles_v1;
- keep this step read-only.

This SQL does not modify data.
*/

WITH value_object_columns AS (
  SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'value_objects'
    AND column_name IN (
      'id',
      'parent_value_object_id',
      'entity_protocol_characteristics_json',
      'needs_user_review',
      'ui_visibility',
      'category_origin_json',
      'metadata_json',
      'created_at',
      'updated_at'
    )
  ORDER BY ordinal_position
),

value_object_parent_rows AS (
  SELECT
    vo.id AS value_object_id,
    vo.parent_value_object_id,
    vo.entity_protocol_characteristics_json,
    vo.needs_user_review,
    vo.ui_visibility,
    vo.category_origin_json,
    vo.metadata_json,
    vo.created_at,
    vo.updated_at
  FROM public.value_objects vo
  WHERE vo.parent_value_object_id IS NOT NULL
  ORDER BY vo.updated_at DESC NULLS LAST, vo.created_at DESC NULLS LAST
  LIMIT 100
),

value_object_children_count AS (
  SELECT
    vo.parent_value_object_id AS parent_value_object_id,
    count(*) AS children_count
  FROM public.value_objects vo
  WHERE vo.parent_value_object_id IS NOT NULL
  GROUP BY vo.parent_value_object_id
),

cloud_profiles_with_parent AS (
  SELECT
    cp.user_id,
    cp.value_object_id,
    vo.parent_value_object_id,
    parent_vo.id AS parent_exists_id,
    cp.contextual_category_slug,
    cp.contextual_category_name,
    cp.category_role,
    cp.usage_count,
    cp.total_exposure_minutes,
    cp.first_used_at,
    cp.last_used_at,
    cp.latest_event_id,
    cp.latest_event_title,
    cp.latest_activity_template_slug,
    vo.entity_protocol_characteristics_json,
    vo.needs_user_review,
    vo.ui_visibility,
    vo.category_origin_json,
    vo.metadata_json,
    COALESCE(vocc.children_count, 0) AS children_count
  FROM public.value_object_cloud_profiles_v1 cp
  LEFT JOIN public.value_objects vo
    ON vo.id = cp.value_object_id
  LEFT JOIN public.value_objects parent_vo
    ON parent_vo.id = vo.parent_value_object_id
  LEFT JOIN value_object_children_count vocc
    ON vocc.parent_value_object_id = cp.value_object_id
  ORDER BY cp.contextual_category_slug, cp.value_object_id
),

potential_roots_from_cloud AS (
  SELECT
    cpwp.*
  FROM cloud_profiles_with_parent cpwp
  WHERE cpwp.parent_value_object_id IS NULL
  ORDER BY cpwp.contextual_category_slug, cpwp.value_object_id
),

potential_children_from_cloud AS (
  SELECT
    cpwp.*
  FROM cloud_profiles_with_parent cpwp
  WHERE cpwp.parent_value_object_id IS NOT NULL
  ORDER BY cpwp.contextual_category_slug, cpwp.value_object_id
),

global_counts AS (
  SELECT
    (SELECT count(*) FROM public.value_objects) AS value_objects_count,
    (SELECT count(*) FROM public.value_objects WHERE parent_value_object_id IS NOT NULL) AS value_objects_with_parent_count,
    (SELECT count(DISTINCT parent_value_object_id) FROM public.value_objects WHERE parent_value_object_id IS NOT NULL) AS distinct_parent_value_objects_count,
    (SELECT count(*) FROM public.value_object_cloud_profiles_v1) AS cloud_profile_rows_count,
    (SELECT count(*) FROM cloud_profiles_with_parent WHERE parent_value_object_id IS NOT NULL) AS cloud_profiles_with_parent_count,
    (SELECT count(*) FROM cloud_profiles_with_parent WHERE parent_value_object_id IS NULL) AS cloud_profiles_without_parent_count,
    (SELECT count(*) FROM cloud_profiles_with_parent WHERE children_count > 0) AS cloud_profiles_with_children_count
)

SELECT
  '00_global_counts' AS section,
  COALESCE(jsonb_agg(to_jsonb(global_counts)), '[]'::jsonb) AS data
FROM global_counts

UNION ALL

SELECT
  '01_value_object_columns' AS section,
  COALESCE(jsonb_agg(to_jsonb(value_object_columns)), '[]'::jsonb) AS data
FROM value_object_columns

UNION ALL

SELECT
  '02_existing_parent_rows' AS section,
  COALESCE(jsonb_agg(to_jsonb(value_object_parent_rows)), '[]'::jsonb) AS data
FROM value_object_parent_rows

UNION ALL

SELECT
  '03_children_count_by_parent' AS section,
  COALESCE(jsonb_agg(to_jsonb(value_object_children_count)), '[]'::jsonb) AS data
FROM value_object_children_count

UNION ALL

SELECT
  '04_cloud_profiles_with_parent_fields' AS section,
  COALESCE(jsonb_agg(to_jsonb(cloud_profiles_with_parent)), '[]'::jsonb) AS data
FROM cloud_profiles_with_parent

UNION ALL

SELECT
  '05_potential_roots_from_cloud' AS section,
  COALESCE(jsonb_agg(to_jsonb(potential_roots_from_cloud)), '[]'::jsonb) AS data
FROM potential_roots_from_cloud

UNION ALL

SELECT
  '06_potential_children_from_cloud' AS section,
  COALESCE(jsonb_agg(to_jsonb(potential_children_from_cloud)), '[]'::jsonb) AS data
FROM potential_children_from_cloud

ORDER BY section;
