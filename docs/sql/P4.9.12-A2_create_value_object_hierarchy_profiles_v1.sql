/*
P4.9.12-A2
Create read-only Value Object hierarchy profile view.

Creates:
- public.value_object_hierarchy_profiles_v1

Purpose:
- expose root/child status for Value Objects in the object-cloud read stack;
- keep parent/child relation structural only;
- work even when no parent_value_object_id links exist yet;
- do not write parent/child data.

Important:
- This view does not create hierarchy.
- This view only reads value_objects.parent_value_object_id and joins it with value_object_cloud_profiles_v1.
*/

CREATE OR REPLACE VIEW public.value_object_hierarchy_profiles_v1 AS
WITH children_count AS (
  SELECT
    child.parent_value_object_id AS value_object_id,
    count(*) AS children_count
  FROM public.value_objects child
  WHERE child.parent_value_object_id IS NOT NULL
  GROUP BY child.parent_value_object_id
),

parent_cloud_summary AS (
  SELECT
    cp.user_id,
    cp.value_object_id,
    jsonb_agg(
      jsonb_build_object(
        'categoryTable', cp.category_table,
        'categoryId', cp.category_id,
        'categoryRole', cp.category_role,
        'contextualCategorySlug', cp.contextual_category_slug,
        'contextualCategoryName', cp.contextual_category_name,
        'usageCount', cp.usage_count,
        'totalExposureMinutes', cp.total_exposure_minutes,
        'latestActivityTemplateSlug', cp.latest_activity_template_slug
      )
      ORDER BY cp.contextual_category_slug NULLS LAST, cp.category_role NULLS LAST
    ) AS parent_cloud_categories
  FROM public.value_object_cloud_profiles_v1 cp
  GROUP BY cp.user_id, cp.value_object_id
)

SELECT
  cp.user_id,
  cp.value_object_id,
  vo.parent_value_object_id,

  CASE
    WHEN vo.parent_value_object_id IS NULL THEN 'root'
    ELSE 'child'
  END AS hierarchy_role,

  CASE
    WHEN vo.parent_value_object_id IS NULL THEN true
    ELSE false
  END AS is_root,

  CASE
    WHEN vo.parent_value_object_id IS NULL THEN false
    ELSE true
  END AS is_child,

  CASE
    WHEN vo.parent_value_object_id IS NULL THEN false
    WHEN parent_vo.id IS NOT NULL THEN true
    ELSE false
  END AS parent_exists,

  parent_vo.id AS parent_exists_id,

  COALESCE(cc.children_count, 0) AS children_count,

  CASE
    WHEN COALESCE(cc.children_count, 0) > 0 THEN true
    ELSE false
  END AS has_children,

  cp.category_table,
  cp.category_id,
  cp.category_role,
  cp.contextual_category_slug,
  cp.contextual_category_name,
  cp.contextual_category_status,
  cp.contextual_category_is_active,

  cp.usage_count,
  cp.total_exposure_minutes,
  cp.first_used_at,
  cp.last_used_at,
  cp.latest_event_id,
  cp.latest_event_title,
  cp.latest_activity_template_slug,
  cp.latest_activity_template_title,

  vo.entity_protocol_characteristics_json,
  vo.needs_user_review,
  vo.ui_visibility,
  vo.category_origin_json,
  vo.metadata_json,
  vo.created_at AS value_object_created_at,
  vo.updated_at AS value_object_updated_at,

  parent_vo.entity_protocol_characteristics_json AS parent_entity_protocol_characteristics_json,
  parent_vo.needs_user_review AS parent_needs_user_review,
  parent_vo.ui_visibility AS parent_ui_visibility,
  parent_vo.category_origin_json AS parent_category_origin_json,
  parent_vo.metadata_json AS parent_metadata_json,
  parent_vo.created_at AS parent_value_object_created_at,
  parent_vo.updated_at AS parent_value_object_updated_at,

  pcs.parent_cloud_categories,

  cp.snapshots,
  cp.daily_aggregates
FROM public.value_object_cloud_profiles_v1 cp
LEFT JOIN public.value_objects vo
  ON vo.id = cp.value_object_id
LEFT JOIN public.value_objects parent_vo
  ON parent_vo.id = vo.parent_value_object_id
LEFT JOIN children_count cc
  ON cc.value_object_id = cp.value_object_id
LEFT JOIN parent_cloud_summary pcs
  ON pcs.user_id = cp.user_id
 AND pcs.value_object_id = vo.parent_value_object_id;

COMMENT ON VIEW public.value_object_hierarchy_profiles_v1 IS
'P4.9.12-A2 read-only hierarchy profile view for Value Objects. Adds root/child status, parent pointer fields and children_count over public.value_object_cloud_profiles_v1 without writing hierarchy data.';

WITH view_rows AS (
  SELECT *
  FROM public.value_object_hierarchy_profiles_v1
),

category_summary AS (
  SELECT
    contextual_category_slug,
    contextual_category_name,
    hierarchy_role,
    count(*) AS rows_count,
    count(DISTINCT value_object_id) AS value_objects_count,
    COALESCE(sum(usage_count), 0) AS total_usage_count,
    COALESCE(sum(total_exposure_minutes), 0) AS total_exposure_minutes,
    max(last_used_at) AS last_used_at
  FROM view_rows
  GROUP BY
    contextual_category_slug,
    contextual_category_name,
    hierarchy_role
),

counts AS (
  SELECT
    (SELECT count(*) FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'value_object_hierarchy_profiles_v1') AS view_exists_count,
    (SELECT count(*) FROM view_rows) AS hierarchy_view_rows_count,
    (SELECT count(DISTINCT user_id) FROM view_rows) AS distinct_users_count,
    (SELECT count(DISTINCT value_object_id) FROM view_rows) AS distinct_value_objects_count,
    (SELECT count(*) FROM view_rows WHERE hierarchy_role = 'root') AS root_rows_count,
    (SELECT count(*) FROM view_rows WHERE hierarchy_role = 'child') AS child_rows_count,
    (SELECT count(*) FROM view_rows WHERE parent_value_object_id IS NOT NULL) AS rows_with_parent_count,
    (SELECT count(*) FROM view_rows WHERE children_count > 0) AS rows_with_children_count,
    (SELECT count(*) FROM view_rows WHERE parent_exists = false AND parent_value_object_id IS NOT NULL) AS broken_parent_reference_rows_count
)

SELECT
  '00_counts' AS section,
  COALESCE(jsonb_agg(to_jsonb(counts)), '[]'::jsonb) AS data
FROM counts

UNION ALL

SELECT
  '01_category_summary' AS section,
  COALESCE(jsonb_agg(to_jsonb(category_summary) ORDER BY contextual_category_slug, hierarchy_role), '[]'::jsonb) AS data
FROM category_summary

UNION ALL

SELECT
  '02_hierarchy_profiles' AS section,
  COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'userId', user_id,
        'valueObjectId', value_object_id,
        'parentValueObjectId', parent_value_object_id,
        'hierarchyRole', hierarchy_role,
        'isRoot', is_root,
        'isChild', is_child,
        'parentExists', parent_exists,
        'childrenCount', children_count,
        'hasChildren', has_children,
        'categorySlug', contextual_category_slug,
        'categoryName', contextual_category_name,
        'categoryRole', category_role,
        'usageCount', usage_count,
        'totalExposureMinutes', total_exposure_minutes,
        'latestEventId', latest_event_id,
        'latestEventTitle', latest_event_title,
        'latestActivityTemplateSlug', latest_activity_template_slug,
        'needsUserReview', needs_user_review,
        'uiVisibility', ui_visibility,
        'parentCloudCategories', parent_cloud_categories
      )
      ORDER BY contextual_category_slug, value_object_id
    ),
    '[]'::jsonb
  ) AS data
FROM view_rows

ORDER BY section;
