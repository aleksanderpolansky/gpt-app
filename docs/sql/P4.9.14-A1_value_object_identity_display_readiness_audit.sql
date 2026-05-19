/*
P4.9.14-A1
Value Object identity/display readiness audit.

Purpose:
- inspect why 3 of 5 value_objects are not understandable yet;
- identify what display/identity data exists for each Value Object;
- inspect category links, usage aggregates, activity links and latest events;
- decide whether hierarchy writes need a better identity/display layer first.

This SQL is read-only.
It does not update value_objects.
It does not write parent_value_object_id.
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
  ORDER BY ordinal_position
),

all_value_objects AS (
  SELECT
    vo.id AS value_object_id,
    vo.parent_value_object_id,
    vo.entity_protocol_characteristics_json,
    vo.needs_user_review,
    vo.ui_visibility,
    vo.category_origin_json,
    vo.metadata_json,
    vo.created_at,
    vo.updated_at,
    to_jsonb(vo) AS full_value_object_json,

    COALESCE(
      NULLIF(to_jsonb(vo)->>'name', ''),
      NULLIF(to_jsonb(vo)->>'title', ''),
      NULLIF(to_jsonb(vo)->>'label', ''),
      NULLIF(to_jsonb(vo)->>'display_name', ''),
      NULLIF(to_jsonb(vo)->>'slug', '')
    ) AS guessed_label_from_value_object_columns
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
    count(*) AS category_links_count,
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

usage_aggregates AS (
  SELECT
    vua.value_object_id,
    count(*) AS usage_aggregate_rows_count,
    COALESCE(sum(vua.usage_count), 0) AS usage_count,
    COALESCE(sum(vua.exposure_minutes), 0) AS exposure_minutes,
    min(vua.first_used_at) AS first_used_at,
    max(vua.last_used_at) AS last_used_at,
    max(vua.updated_at) AS usage_updated_at,
    jsonb_agg(
      jsonb_build_object(
        'userId', vua.user_id,
        'usageCount', vua.usage_count,
        'exposureMinutes', vua.exposure_minutes,
        'firstUsedAt', vua.first_used_at,
        'lastUsedAt', vua.last_used_at,
        'lastEventId', vua.last_event_id,
        'source', vua.source,
        'metadataJson', vua.metadata_json
      )
      ORDER BY vua.last_used_at DESC NULLS LAST, vua.updated_at DESC NULLS LAST
    ) AS usage_rows
  FROM public.value_object_usage_aggregates vua
  GROUP BY vua.value_object_id
),

activity_links AS (
  SELECT
    aevl.value_object_id,
    count(*) AS activity_link_rows_count,
    COALESCE(sum(aevl.exposure_minutes), 0) AS linked_exposure_minutes,
    max(aevl.created_at) AS latest_link_created_at,
    jsonb_agg(
      jsonb_build_object(
        'linkId', aevl.id,
        'userId', aevl.user_id,
        'eventId', aevl.event_id,
        'exposureMinutes', aevl.exposure_minutes,
        'source', aevl.source,
        'confidence', aevl.confidence,
        'metadataJson', aevl.metadata_json,
        'linkCreatedAt', aevl.created_at,
        'eventTitle', ae.title,
        'eventStatus', ae.status,
        'eventDurationMinutes', ae.duration_minutes,
        'eventProcessingStatus', ae.processing_status,
        'activityTemplateId', ae.activity_template_id
      )
      ORDER BY aevl.created_at DESC NULLS LAST
    ) AS activity_links
  FROM public.activity_event_value_object_links aevl
  LEFT JOIN public.activity_events ae
    ON ae.id = aevl.event_id
  GROUP BY aevl.value_object_id
),

hierarchy_profiles AS (
  SELECT
    hp.value_object_id,
    count(*) AS hierarchy_profile_rows_count,
    jsonb_agg(
      jsonb_build_object(
        'userId', hp.user_id,
        'hierarchyRole', hp.hierarchy_role,
        'isRoot', hp.is_root,
        'isChild', hp.is_child,
        'parentValueObjectId', hp.parent_value_object_id,
        'parentExists', hp.parent_exists,
        'childrenCount', hp.children_count,
        'hasChildren', hp.has_children,
        'categorySlug', hp.contextual_category_slug,
        'categoryName', hp.contextual_category_name,
        'categoryRole', hp.category_role,
        'usageCount', hp.usage_count,
        'totalExposureMinutes', hp.total_exposure_minutes,
        'latestActivityTemplateSlug', hp.latest_activity_template_slug,
        'needsUserReview', hp.needs_user_review,
        'uiVisibility', hp.ui_visibility
      )
      ORDER BY hp.contextual_category_slug NULLS LAST, hp.category_role NULLS LAST
    ) AS hierarchy_profiles
  FROM public.value_object_hierarchy_profiles_v1 hp
  GROUP BY hp.value_object_id
),

identity_profiles AS (
  SELECT
    avo.value_object_id,
    avo.parent_value_object_id,

    CASE
      WHEN avo.parent_value_object_id IS NULL THEN 'root'
      ELSE 'child'
    END AS current_hierarchy_role,

    avo.guessed_label_from_value_object_columns,

    COALESCE(cls.category_links_count, 0) AS category_links_count,
    COALESCE(ua.usage_aggregate_rows_count, 0) AS usage_aggregate_rows_count,
    COALESCE(al.activity_link_rows_count, 0) AS activity_link_rows_count,
    COALESCE(hp.hierarchy_profile_rows_count, 0) AS hierarchy_profile_rows_count,

    COALESCE(ua.usage_count, 0) AS usage_count,
    COALESCE(ua.exposure_minutes, 0) AS exposure_minutes,
    COALESCE(al.linked_exposure_minutes, 0) AS linked_exposure_minutes,

    ua.first_used_at,
    ua.last_used_at,
    al.latest_link_created_at,

    avo.needs_user_review,
    avo.ui_visibility,
    avo.entity_protocol_characteristics_json,
    avo.category_origin_json,
    avo.metadata_json,

    COALESCE(cls.categories, '[]'::jsonb) AS categories,
    COALESCE(ua.usage_rows, '[]'::jsonb) AS usage_rows,
    COALESCE(al.activity_links, '[]'::jsonb) AS activity_links,
    COALESCE(hp.hierarchy_profiles, '[]'::jsonb) AS hierarchy_profiles,

    CASE
      WHEN avo.guessed_label_from_value_object_columns IS NOT NULL THEN true
      WHEN COALESCE(cls.category_links_count, 0) > 0 THEN true
      WHEN COALESCE(hp.hierarchy_profile_rows_count, 0) > 0 THEN true
      ELSE false
    END AS has_display_identity,

    CASE
      WHEN COALESCE(cls.category_links_count, 0) > 0 THEN true
      ELSE false
    END AS has_category_identity,

    CASE
      WHEN COALESCE(ua.usage_aggregate_rows_count, 0) > 0
        OR COALESCE(al.activity_link_rows_count, 0) > 0
      THEN true
      ELSE false
    END AS has_usage_or_activity_evidence,

    CASE
      WHEN avo.guessed_label_from_value_object_columns IS NOT NULL THEN 'ready_label_column'
      WHEN COALESCE(cls.category_links_count, 0) > 0 THEN 'ready_category_link'
      WHEN COALESCE(hp.hierarchy_profile_rows_count, 0) > 0 THEN 'ready_hierarchy_profile'
      WHEN COALESCE(ua.usage_aggregate_rows_count, 0) > 0
        OR COALESCE(al.activity_link_rows_count, 0) > 0 THEN 'needs_label_from_activity_evidence'
      ELSE 'unknown_identity'
    END AS identity_readiness_status,

    CASE
      WHEN avo.parent_value_object_id IS NOT NULL THEN 'already_child'
      WHEN avo.guessed_label_from_value_object_columns IS NOT NULL
        OR COALESCE(cls.category_links_count, 0) > 0
        OR COALESCE(hp.hierarchy_profile_rows_count, 0) > 0
      THEN 'can_be_reviewed_for_hierarchy'
      ELSE 'do_not_use_as_parent_until_identity_known'
    END AS hierarchy_write_readiness_status,

    avo.created_at,
    avo.updated_at,
    avo.full_value_object_json
  FROM all_value_objects avo
  LEFT JOIN category_links_summary cls
    ON cls.value_object_id = avo.value_object_id
  LEFT JOIN usage_aggregates ua
    ON ua.value_object_id = avo.value_object_id
  LEFT JOIN activity_links al
    ON al.value_object_id = avo.value_object_id
  LEFT JOIN hierarchy_profiles hp
    ON hp.value_object_id = avo.value_object_id
),

counts AS (
  SELECT
    (SELECT count(*) FROM identity_profiles) AS value_objects_count,
    (SELECT count(*) FROM identity_profiles WHERE has_display_identity = true) AS value_objects_with_display_identity_count,
    (SELECT count(*) FROM identity_profiles WHERE has_category_identity = true) AS value_objects_with_category_identity_count,
    (SELECT count(*) FROM identity_profiles WHERE has_usage_or_activity_evidence = true) AS value_objects_with_usage_or_activity_evidence_count,
    (SELECT count(*) FROM identity_profiles WHERE identity_readiness_status = 'unknown_identity') AS unknown_identity_value_objects_count,
    (SELECT count(*) FROM identity_profiles WHERE hierarchy_write_readiness_status = 'can_be_reviewed_for_hierarchy') AS hierarchy_review_ready_count,
    (SELECT count(*) FROM identity_profiles WHERE hierarchy_write_readiness_status = 'do_not_use_as_parent_until_identity_known') AS not_ready_for_parent_selection_count
)

SELECT
  '00_counts' AS section,
  COALESCE(jsonb_agg(to_jsonb(counts)), '[]'::jsonb) AS data
FROM counts

UNION ALL

SELECT
  '01_value_object_columns' AS section,
  COALESCE(jsonb_agg(to_jsonb(value_object_columns)), '[]'::jsonb) AS data
FROM value_object_columns

UNION ALL

SELECT
  '02_identity_profiles' AS section,
  COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'valueObjectId', value_object_id,
        'parentValueObjectId', parent_value_object_id,
        'currentHierarchyRole', current_hierarchy_role,
        'guessedLabelFromValueObjectColumns', guessed_label_from_value_object_columns,
        'categoryLinksCount', category_links_count,
        'usageAggregateRowsCount', usage_aggregate_rows_count,
        'activityLinkRowsCount', activity_link_rows_count,
        'hierarchyProfileRowsCount', hierarchy_profile_rows_count,
        'usageCount', usage_count,
        'exposureMinutes', exposure_minutes,
        'linkedExposureMinutes', linked_exposure_minutes,
        'firstUsedAt', first_used_at,
        'lastUsedAt', last_used_at,
        'latestLinkCreatedAt', latest_link_created_at,
        'needsUserReview', needs_user_review,
        'uiVisibility', ui_visibility,
        'hasDisplayIdentity', has_display_identity,
        'hasCategoryIdentity', has_category_identity,
        'hasUsageOrActivityEvidence', has_usage_or_activity_evidence,
        'identityReadinessStatus', identity_readiness_status,
        'hierarchyWriteReadinessStatus', hierarchy_write_readiness_status,
        'entityProtocolCharacteristicsJson', entity_protocol_characteristics_json,
        'categoryOriginJson', category_origin_json,
        'metadataJson', metadata_json,
        'categories', categories,
        'usageRows', usage_rows,
        'activityLinks', activity_links,
        'hierarchyProfiles', hierarchy_profiles
      )
      ORDER BY
        CASE hierarchy_write_readiness_status
          WHEN 'can_be_reviewed_for_hierarchy' THEN 1
          WHEN 'already_child' THEN 2
          ELSE 3
        END,
        updated_at DESC NULLS LAST,
        created_at DESC NULLS LAST,
        value_object_id
    ),
    '[]'::jsonb
  ) AS data
FROM identity_profiles

UNION ALL

SELECT
  '03_uncategorized_or_unknown_identity' AS section,
  COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'valueObjectId', value_object_id,
        'identityReadinessStatus', identity_readiness_status,
        'hierarchyWriteReadinessStatus', hierarchy_write_readiness_status,
        'activityLinkRowsCount', activity_link_rows_count,
        'usageAggregateRowsCount', usage_aggregate_rows_count,
        'usageCount', usage_count,
        'exposureMinutes', exposure_minutes,
        'activityLinks', activity_links,
        'metadataJson', metadata_json,
        'categoryOriginJson', category_origin_json,
        'entityProtocolCharacteristicsJson', entity_protocol_characteristics_json,
        'createdAt', created_at,
        'updatedAt', updated_at
      )
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, value_object_id
    ),
    '[]'::jsonb
  ) AS data
FROM identity_profiles
WHERE has_display_identity = false
   OR has_category_identity = false

UNION ALL

SELECT
  '04_no_write_decision' AS section,
  jsonb_build_array(
    jsonb_build_object(
      'p4Step', 'P4.9.14-A1',
      'mode', 'read_only_identity_display_readiness_audit',
      'noWritePerformed', true,
      'decisionPurpose', 'Decide whether Value Objects have enough identity/display data before hierarchy writes.',
      'requiredBeforeHierarchyWrite', jsonb_build_array(
        'clear parent label or category',
        'clear child label or category',
        'single parent relation preview',
        'rollback SQL',
        'post-write verification through value_object_hierarchy_profiles_v1'
      )
    )
  ) AS data

ORDER BY section;
