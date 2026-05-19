/*
P4.9.13-A1
Controlled hierarchy candidate audit.

Purpose:
- inspect all current Value Objects;
- inspect current hierarchy profile rows;
- inspect current category links;
- generate safe parent/child candidate pairs for review;
- do not write parent_value_object_id yet.

This SQL is read-only.
*/

WITH all_value_objects AS (
  SELECT
    vo.id AS value_object_id,
    vo.parent_value_object_id,
    CASE
      WHEN vo.parent_value_object_id IS NULL THEN 'root'
      ELSE 'child'
    END AS current_hierarchy_role,
    vo.entity_protocol_characteristics_json,
    vo.needs_user_review,
    vo.ui_visibility,
    vo.category_origin_json,
    vo.metadata_json,
    vo.created_at,
    vo.updated_at,
    to_jsonb(vo) AS full_value_object_json
  FROM public.value_objects vo
),

category_links AS (
  SELECT
    cl.value_object_id,
    cl.category_table,
    cl.category_id,
    cl.category_role,
    cl.source,
    cl.confidence,
    cl.metadata_json,
    cc.slug AS contextual_category_slug,
    cc.name AS contextual_category_name,
    cc.status AS contextual_category_status,
    cc.is_active AS contextual_category_is_active
  FROM public.value_object_category_links cl
  LEFT JOIN public.contextual_categories cc
    ON cl.category_table = 'contextual_categories'
   AND cc.id = cl.category_id
),

category_links_summary AS (
  SELECT
    value_object_id,
    jsonb_agg(
      jsonb_build_object(
        'categoryTable', category_table,
        'categoryId', category_id,
        'categoryRole', category_role,
        'source', source,
        'confidence', confidence,
        'contextualCategorySlug', contextual_category_slug,
        'contextualCategoryName', contextual_category_name,
        'contextualCategoryStatus', contextual_category_status,
        'contextualCategoryIsActive', contextual_category_is_active,
        'metadataJson', metadata_json
      )
      ORDER BY contextual_category_slug NULLS LAST, category_role NULLS LAST
    ) AS categories
  FROM category_links
  GROUP BY value_object_id
),

hierarchy_rows AS (
  SELECT
    hp.user_id,
    hp.value_object_id,
    hp.parent_value_object_id,
    hp.hierarchy_role,
    hp.is_root,
    hp.is_child,
    hp.parent_exists,
    hp.children_count,
    hp.has_children,
    hp.contextual_category_slug,
    hp.contextual_category_name,
    hp.category_role,
    hp.usage_count,
    hp.total_exposure_minutes,
    hp.latest_event_id,
    hp.latest_event_title,
    hp.latest_activity_template_slug,
    hp.needs_user_review,
    hp.ui_visibility
  FROM public.value_object_hierarchy_profiles_v1 hp
),

candidate_pairs AS (
  SELECT
    child.user_id,
    parent.value_object_id AS parent_value_object_id,
    child.value_object_id AS child_value_object_id,

    parent.current_hierarchy_role AS parent_current_hierarchy_role,
    child.hierarchy_role AS child_current_hierarchy_role,

    parent.parent_value_object_id AS parent_current_parent_id,
    child.parent_value_object_id AS child_current_parent_id,

    COALESCE(parent_categories.categories, '[]'::jsonb) AS parent_categories,

    child.contextual_category_slug AS child_category_slug,
    child.contextual_category_name AS child_category_name,
    child.category_role AS child_category_role,
    child.usage_count AS child_usage_count,
    child.total_exposure_minutes AS child_total_exposure_minutes,
    child.latest_activity_template_slug AS child_latest_activity_template_slug,

    CASE
      WHEN parent.value_object_id = child.value_object_id THEN false
      WHEN child.parent_value_object_id IS NOT NULL THEN false
      ELSE true
    END AS is_safe_candidate,

    CASE
      WHEN parent.value_object_id = child.value_object_id THEN 'blocked_self_parent'
      WHEN child.parent_value_object_id IS NOT NULL THEN 'blocked_child_already_has_parent'
      ELSE 'candidate_requires_human_decision'
    END AS candidate_status,

    jsonb_build_object(
      'rule', 'P4.9.13-A1 read-only candidate generation',
      'noWritePerformed', true,
      'parentChildMeaning', 'structural_only',
      'requiresHumanDecisionBeforeWrite', true
    ) AS candidate_metadata
  FROM hierarchy_rows child
  CROSS JOIN all_value_objects parent
  LEFT JOIN category_links_summary parent_categories
    ON parent_categories.value_object_id = parent.value_object_id
  WHERE parent.value_object_id <> child.value_object_id
),

ranked_candidate_pairs AS (
  SELECT
    *,
    ROW_NUMBER() OVER (
      PARTITION BY child_value_object_id
      ORDER BY
        is_safe_candidate DESC,
        parent_value_object_id
    ) AS candidate_rank_for_child
  FROM candidate_pairs
),

counts AS (
  SELECT
    (SELECT count(*) FROM all_value_objects) AS value_objects_count,
    (SELECT count(*) FROM category_links) AS value_object_category_links_count,
    (SELECT count(*) FROM hierarchy_rows) AS hierarchy_rows_count,
    (SELECT count(*) FROM hierarchy_rows WHERE hierarchy_role = 'root') AS current_root_rows_count,
    (SELECT count(*) FROM hierarchy_rows WHERE hierarchy_role = 'child') AS current_child_rows_count,
    (SELECT count(*) FROM hierarchy_rows WHERE parent_value_object_id IS NOT NULL) AS current_rows_with_parent_count,
    (SELECT count(*) FROM ranked_candidate_pairs) AS generated_candidate_pairs_count,
    (SELECT count(*) FROM ranked_candidate_pairs WHERE is_safe_candidate = true) AS safe_candidate_pairs_count,
    (SELECT count(*) FROM ranked_candidate_pairs WHERE is_safe_candidate = false) AS blocked_candidate_pairs_count
)

SELECT
  '00_counts' AS section,
  COALESCE(jsonb_agg(to_jsonb(counts)), '[]'::jsonb) AS data
FROM counts

UNION ALL

SELECT
  '01_current_hierarchy_rows' AS section,
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
        'latestActivityTemplateSlug', latest_activity_template_slug,
        'needsUserReview', needs_user_review,
        'uiVisibility', ui_visibility
      )
      ORDER BY contextual_category_slug, value_object_id
    ),
    '[]'::jsonb
  ) AS data
FROM hierarchy_rows

UNION ALL

SELECT
  '02_all_value_objects' AS section,
  COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'valueObjectId', avo.value_object_id,
        'parentValueObjectId', avo.parent_value_object_id,
        'currentHierarchyRole', avo.current_hierarchy_role,
        'needsUserReview', avo.needs_user_review,
        'uiVisibility', avo.ui_visibility,
        'entityProtocolCharacteristicsJson', avo.entity_protocol_characteristics_json,
        'categoryOriginJson', avo.category_origin_json,
        'metadataJson', avo.metadata_json,
        'categories', COALESCE(cls.categories, '[]'::jsonb),
        'createdAt', avo.created_at,
        'updatedAt', avo.updated_at
      )
      ORDER BY avo.updated_at DESC NULLS LAST, avo.created_at DESC NULLS LAST, avo.value_object_id
    ),
    '[]'::jsonb
  ) AS data
FROM all_value_objects avo
LEFT JOIN category_links_summary cls
  ON cls.value_object_id = avo.value_object_id

UNION ALL

SELECT
  '03_value_object_category_links' AS section,
  COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'valueObjectId', value_object_id,
        'categoryTable', category_table,
        'categoryId', category_id,
        'categoryRole', category_role,
        'source', source,
        'confidence', confidence,
        'contextualCategorySlug', contextual_category_slug,
        'contextualCategoryName', contextual_category_name,
        'contextualCategoryStatus', contextual_category_status,
        'contextualCategoryIsActive', contextual_category_is_active,
        'metadataJson', metadata_json
      )
      ORDER BY contextual_category_slug NULLS LAST, value_object_id
    ),
    '[]'::jsonb
  ) AS data
FROM category_links

UNION ALL

SELECT
  '04_candidate_parent_child_pairs' AS section,
  COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'userId', user_id,
        'parentValueObjectId', parent_value_object_id,
        'childValueObjectId', child_value_object_id,
        'parentCurrentHierarchyRole', parent_current_hierarchy_role,
        'childCurrentHierarchyRole', child_current_hierarchy_role,
        'parentCurrentParentId', parent_current_parent_id,
        'childCurrentParentId', child_current_parent_id,
        'parentCategories', parent_categories,
        'childCategorySlug', child_category_slug,
        'childCategoryName', child_category_name,
        'childCategoryRole', child_category_role,
        'childUsageCount', child_usage_count,
        'childTotalExposureMinutes', child_total_exposure_minutes,
        'childLatestActivityTemplateSlug', child_latest_activity_template_slug,
        'isSafeCandidate', is_safe_candidate,
        'candidateStatus', candidate_status,
        'candidateRankForChild', candidate_rank_for_child,
        'candidateMetadata', candidate_metadata
      )
      ORDER BY child_category_slug, child_value_object_id, candidate_rank_for_child
    ),
    '[]'::jsonb
  ) AS data
FROM ranked_candidate_pairs

UNION ALL

SELECT
  '05_no_write_decision' AS section,
  jsonb_build_array(
    jsonb_build_object(
      'p4Step', 'P4.9.13-A1',
      'mode', 'read_only_candidate_audit',
      'noWritePerformed', true,
      'nextRequiredDecision', 'Choose exact parent_value_object_id and child value_object_id before any update.',
      'requiredBeforeWrite', jsonb_build_array(
        'human decision',
        'preview SQL',
        'rollback SQL',
        'single relation only',
        'post-write verification through value_object_hierarchy_profiles_v1'
      )
    )
  ) AS data

ORDER BY section;
