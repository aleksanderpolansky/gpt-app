/*
P4.9.15-A5-D1
Read-only diagnostic after failed guarded write.

Purpose:
- check whether the failed A5 query persisted anything;
- check whether Learning was inserted;
- check whether Business German writing practice got parent_value_object_id;
- decide whether rollback is needed or whether we can safely rewrite A5.

This SQL is READ-ONLY.
It does not INSERT.
It does not UPDATE.
It does not DELETE.
*/

WITH constants AS (
  SELECT
    'Learning'::text AS parent_title,
    'Business German writing practice'::text AS child_title,
    '9177fea8-de25-446b-b418-b55a766d53db'::uuid AS expected_child_value_object_id
),

all_learning_rows AS (
  SELECT
    vo.id,
    vo.title,
    vo.value_type,
    vo.status,
    vo.commercial_usage,
    vo.parent_value_object_id,
    vo.created_at,
    vo.updated_at,
    vo.entity_protocol_characteristics_json,
    vo.category_origin_json,
    vo.metadata_json
  FROM public.value_objects vo
  JOIN constants c
    ON lower(vo.title) = lower(c.parent_title)
),

controlled_learning_rows AS (
  SELECT
    vo.id,
    vo.title,
    vo.value_type,
    vo.status,
    vo.commercial_usage,
    vo.parent_value_object_id,
    vo.created_at,
    vo.updated_at,
    vo.entity_protocol_characteristics_json,
    vo.category_origin_json,
    vo.metadata_json
  FROM public.value_objects vo
  JOIN constants c
    ON lower(vo.title) = lower(c.parent_title)
  WHERE vo.value_type = 'personal_development'
    AND vo.parent_value_object_id IS NULL
    AND vo.metadata_json->>'createdFor' = 'first controlled parent/child hierarchy test'
    AND vo.metadata_json->>'recommendedChildValueObjectId' = '9177fea8-de25-446b-b418-b55a766d53db'
    AND vo.metadata_json->>'recommendedRelation' = 'Learning -> Business German writing practice'
    AND vo.entity_protocol_characteristics_json #>> '{p4,step}' = 'P4.9.15-A5'
),

target_child AS (
  SELECT
    vo.id,
    vo.title,
    vo.value_type,
    vo.status,
    vo.commercial_usage,
    vo.parent_value_object_id,
    vo.created_at,
    vo.updated_at
  FROM public.value_objects vo
  JOIN constants c
    ON vo.id = c.expected_child_value_object_id
   AND vo.title = c.child_title
),

child_hierarchy_profile AS (
  SELECT
    hp.user_id,
    hp.value_object_id,
    hp.parent_value_object_id,
    hp.parent_exists,
    hp.hierarchy_role,
    hp.is_root,
    hp.is_child,
    hp.children_count,
    hp.has_children,
    hp.contextual_category_slug,
    hp.contextual_category_name,
    hp.category_role,
    hp.usage_count,
    hp.total_exposure_minutes,
    hp.latest_activity_template_slug
  FROM public.value_object_hierarchy_profiles_v1 hp
  JOIN constants c
    ON hp.value_object_id = c.expected_child_value_object_id
),

children_pointing_to_any_learning AS (
  SELECT
    child.id,
    child.title,
    child.value_type,
    child.parent_value_object_id,
    parent.title AS parent_title,
    parent.value_type AS parent_value_type
  FROM public.value_objects child
  JOIN all_learning_rows parent
    ON parent.id = child.parent_value_object_id
),

counts AS (
  SELECT
    (SELECT count(*) FROM all_learning_rows) AS all_learning_rows_count,
    (SELECT count(*) FROM controlled_learning_rows) AS controlled_learning_rows_count,
    (SELECT count(*) FROM target_child) AS target_child_count,
    (SELECT count(*) FROM target_child WHERE parent_value_object_id IS NULL) AS target_child_parent_null_count,
    (
      SELECT count(*)
      FROM target_child
      WHERE parent_value_object_id IN (SELECT id FROM controlled_learning_rows)
    ) AS target_child_points_to_controlled_learning_count,
    (SELECT count(*) FROM child_hierarchy_profile) AS child_hierarchy_profile_rows_count,
    (SELECT count(*) FROM child_hierarchy_profile WHERE contextual_category_slug = 'business-german') AS business_german_profile_rows_count,
    (SELECT count(*) FROM children_pointing_to_any_learning) AS children_pointing_to_any_learning_count
),

diagnosis AS (
  SELECT
    *,
    CASE
      WHEN controlled_learning_rows_count = 0
       AND target_child_count = 1
       AND target_child_parent_null_count = 1
        THEN 'NO_PERSISTED_CHANGES_SAFE_TO_REWRITE_A5'

      WHEN controlled_learning_rows_count = 1
       AND target_child_points_to_controlled_learning_count = 1
        THEN 'WRITE_APPEARS_PERSISTED_DOCUMENT_AND_VERIFY'

      WHEN controlled_learning_rows_count >= 1
       AND target_child_parent_null_count = 1
        THEN 'PARENT_ONLY_PERSISTED_ROLLBACK_NEEDED'

      WHEN controlled_learning_rows_count = 0
       AND target_child_parent_null_count = 0
        THEN 'CHILD_HAS_OTHER_PARENT_INVESTIGATE'

      ELSE 'INVESTIGATE_MANUALLY'
    END AS diagnostic_status
  FROM counts
)

SELECT
  '00_diagnosis' AS section,
  jsonb_build_array(to_jsonb(diagnosis)) AS data
FROM diagnosis

UNION ALL

SELECT
  '01_all_learning_rows' AS section,
  COALESCE(jsonb_agg(to_jsonb(all_learning_rows)), '[]'::jsonb) AS data
FROM all_learning_rows

UNION ALL

SELECT
  '02_controlled_learning_rows' AS section,
  COALESCE(jsonb_agg(to_jsonb(controlled_learning_rows)), '[]'::jsonb) AS data
FROM controlled_learning_rows

UNION ALL

SELECT
  '03_target_child' AS section,
  COALESCE(jsonb_agg(to_jsonb(target_child)), '[]'::jsonb) AS data
FROM target_child

UNION ALL

SELECT
  '04_child_hierarchy_profile' AS section,
  COALESCE(jsonb_agg(to_jsonb(child_hierarchy_profile)), '[]'::jsonb) AS data
FROM child_hierarchy_profile

UNION ALL

SELECT
  '05_children_pointing_to_any_learning' AS section,
  COALESCE(jsonb_agg(to_jsonb(children_pointing_to_any_learning)), '[]'::jsonb) AS data
FROM children_pointing_to_any_learning

UNION ALL

SELECT
  '06_next_action' AS section,
  jsonb_build_array(
    jsonb_build_object(
      'p4Step', 'P4.9.15-A5-D1',
      'mode', 'read_only_diagnostic_after_failed_guarded_write',
      'noWritePerformed', true,
      'ifStatusNoPersistedChanges', 'Rewrite A5 without division-by-zero assert, then run guarded write again.',
      'ifStatusParentOnlyPersisted', 'Run rollback template before retrying.',
      'ifStatusWritePersisted', 'Do not retry write; document and verify hierarchy/UI.'
    )
  ) AS data

ORDER BY section;
