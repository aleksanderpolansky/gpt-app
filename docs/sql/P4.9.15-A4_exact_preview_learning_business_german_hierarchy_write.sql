/*
P4.9.15-A4
Exact preview before first controlled hierarchy write.

Target relation:
- Learning -> Business German writing practice

This SQL is READ-ONLY.
It does not INSERT.
It does not UPDATE.
It does not modify parent_value_object_id.

Purpose:
- verify that parent Learning does not already exist;
- verify that child Business German writing practice exists;
- verify that child has no parent yet;
- preview the exact insert/update/rollback plan;
- prepare for a later explicit write step.
*/

WITH constants AS (
  SELECT
    'Learning'::text AS parent_title,
    'personal_development'::text AS parent_value_type,
    'learning'::text AS parent_semantic_key,
    'Business German writing practice'::text AS child_title,
    '9177fea8-de25-446b-b418-b55a766d53db'::uuid AS expected_child_value_object_id
),

existing_parent AS (
  SELECT
    vo.id,
    vo.title,
    vo.value_type,
    vo.parent_value_object_id,
    vo.status,
    vo.commercial_usage,
    vo.created_at,
    vo.updated_at
  FROM public.value_objects vo
  JOIN constants c
    ON lower(vo.title) = lower(c.parent_title)
),

target_child AS (
  SELECT
    vo.id,
    vo.title,
    vo.value_type,
    vo.parent_value_object_id,
    vo.status,
    vo.commercial_usage,
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
    hp.contextual_category_slug,
    hp.contextual_category_name,
    hp.category_role,
    hp.usage_count,
    hp.total_exposure_minutes,
    hp.latest_activity_template_slug,
    hp.hierarchy_role,
    hp.parent_value_object_id,
    hp.children_count,
    hp.has_children
  FROM public.value_object_hierarchy_profiles_v1 hp
  JOIN constants c
    ON hp.value_object_id = c.expected_child_value_object_id
),

preflight AS (
  SELECT
    (SELECT count(*) FROM existing_parent) AS existing_learning_parent_count,
    (SELECT count(*) FROM target_child) AS target_child_count,
    (SELECT count(*) FROM target_child WHERE parent_value_object_id IS NULL) AS target_child_without_parent_count,
    (SELECT count(*) FROM child_hierarchy_profile) AS child_hierarchy_profile_rows_count,
    (SELECT count(*) FROM child_hierarchy_profile WHERE contextual_category_slug = 'business-german') AS business_german_profile_rows_count
),

decision AS (
  SELECT
    *,
    CASE
      WHEN existing_learning_parent_count > 0
        THEN 'BLOCKED_EXISTING_LEARNING_PARENT_FOUND'
      WHEN target_child_count <> 1
        THEN 'BLOCKED_TARGET_CHILD_NOT_FOUND_OR_NOT_UNIQUE'
      WHEN target_child_without_parent_count <> 1
        THEN 'BLOCKED_TARGET_CHILD_ALREADY_HAS_PARENT'
      WHEN child_hierarchy_profile_rows_count <> 1
        THEN 'BLOCKED_CHILD_HIERARCHY_PROFILE_NOT_FOUND_OR_NOT_UNIQUE'
      WHEN business_german_profile_rows_count <> 1
        THEN 'BLOCKED_CHILD_IS_NOT_BUSINESS_GERMAN_PROFILE'
      ELSE 'READY_FOR_EXACT_WRITE_SQL'
    END AS preflight_status
  FROM preflight
),

preview_parent_insert_payload AS (
  SELECT
    jsonb_build_object(
      'operation', 'FUTURE_INSERT_PARENT',
      'table', 'public.value_objects',
      'title', c.parent_title,
      'value_type', c.parent_value_type,
      'status', 'active',
      'commercial_usage', 'none',
      'needs_user_review', false,
      'ui_visibility', 'visible',
      'entity_protocol_characteristics_json', jsonb_build_object(
        'p4', jsonb_build_object(
          'step', 'P4.9.15-A5',
          'mode', 'controlled_structural_parent_seed',
          'semanticKey', c.parent_semantic_key,
          'structuralOnly', true
        )
      ),
      'category_origin_json', jsonb_build_object(
        'source', 'controlled_hierarchy_seed',
        'p4Step', 'P4.9.15-A5',
        'derivedFromChildCategorySlug', 'business-german'
      ),
      'metadata_json', jsonb_build_object(
        'createdFor', 'first controlled parent/child hierarchy test',
        'recommendedChildValueObjectId', c.expected_child_value_object_id,
        'recommendedChildTitle', c.child_title,
        'recommendedRelation', 'Learning -> Business German writing practice'
      )
    ) AS payload
  FROM constants c
),

preview_child_update_payload AS (
  SELECT
    jsonb_build_object(
      'operation', 'FUTURE_UPDATE_CHILD_PARENT',
      'table', 'public.value_objects',
      'childValueObjectId', c.expected_child_value_object_id,
      'childTitle', c.child_title,
      'newParentValueObjectId', '[new Learning parent id after insert]',
      'currentParentValueObjectId', tc.parent_value_object_id,
      'rollback', jsonb_build_object(
        'operation', 'ROLLBACK_SET_CHILD_PARENT_TO_NULL_AND_DELETE_SEEDED_PARENT',
        'childValueObjectId', c.expected_child_value_object_id,
        'restoreParentValueObjectId', tc.parent_value_object_id,
        'deleteSeededParentTitle', c.parent_title
      )
    ) AS payload
  FROM constants c
  JOIN target_child tc
    ON tc.id = c.expected_child_value_object_id
),

future_write_sql_text AS (
  SELECT
$future_sql$
-- P4.9.15-A5 FUTURE WRITE SQL PREVIEW ONLY
-- Do not run this text manually yet.
-- A separate guarded write file will be generated after this preview is confirmed.

WITH inserted_parent AS (
  INSERT INTO public.value_objects (
    title,
    value_type,
    status,
    commercial_usage,
    needs_user_review,
    ui_visibility,
    entity_protocol_characteristics_json,
    category_origin_json,
    metadata_json
  )
  VALUES (
    'Learning',
    'personal_development',
    'active',
    'none',
    false,
    'visible',
    '{"p4":{"step":"P4.9.15-A5","mode":"controlled_structural_parent_seed","semanticKey":"learning","structuralOnly":true}}'::jsonb,
    '{"source":"controlled_hierarchy_seed","p4Step":"P4.9.15-A5","derivedFromChildCategorySlug":"business-german"}'::jsonb,
    '{"createdFor":"first controlled parent/child hierarchy test","recommendedChildValueObjectId":"9177fea8-de25-446b-b418-b55a766d53db","recommendedChildTitle":"Business German writing practice","recommendedRelation":"Learning -> Business German writing practice"}'::jsonb
  )
  RETURNING id
),
updated_child AS (
  UPDATE public.value_objects child
  SET
    parent_value_object_id = inserted_parent.id,
    updated_at = now()
  FROM inserted_parent
  WHERE child.id = '9177fea8-de25-446b-b418-b55a766d53db'::uuid
    AND child.title = 'Business German writing practice'
    AND child.parent_value_object_id IS NULL
  RETURNING child.id, child.parent_value_object_id
)
SELECT
  inserted_parent.id AS inserted_parent_id,
  updated_child.id AS updated_child_id,
  updated_child.parent_value_object_id AS child_new_parent_value_object_id
FROM inserted_parent
LEFT JOIN updated_child ON true;
$future_sql$::text AS sql_text
),

future_rollback_sql_text AS (
  SELECT
$rollback_sql$
-- P4.9.15-A5 FUTURE ROLLBACK SQL PREVIEW ONLY
-- Do not run this text manually yet.
-- Replace [LEARNING_PARENT_ID] after actual write if rollback is needed.

UPDATE public.value_objects
SET
  parent_value_object_id = NULL,
  updated_at = now()
WHERE id = '9177fea8-de25-446b-b418-b55a766d53db'::uuid
  AND parent_value_object_id = '[LEARNING_PARENT_ID]'::uuid;

DELETE FROM public.value_objects
WHERE id = '[LEARNING_PARENT_ID]'::uuid
  AND title = 'Learning'
  AND value_type = 'personal_development'
  AND parent_value_object_id IS NULL;
$rollback_sql$::text AS sql_text
)

SELECT
  '00_preflight' AS section,
  jsonb_build_array(to_jsonb(decision)) AS data
FROM decision

UNION ALL

SELECT
  '01_existing_learning_parent' AS section,
  COALESCE(jsonb_agg(to_jsonb(existing_parent)), '[]'::jsonb) AS data
FROM existing_parent

UNION ALL

SELECT
  '02_target_child' AS section,
  COALESCE(jsonb_agg(to_jsonb(target_child)), '[]'::jsonb) AS data
FROM target_child

UNION ALL

SELECT
  '03_child_hierarchy_profile' AS section,
  COALESCE(jsonb_agg(to_jsonb(child_hierarchy_profile)), '[]'::jsonb) AS data
FROM child_hierarchy_profile

UNION ALL

SELECT
  '04_preview_parent_insert_payload' AS section,
  COALESCE(jsonb_agg(payload), '[]'::jsonb) AS data
FROM preview_parent_insert_payload

UNION ALL

SELECT
  '05_preview_child_update_payload' AS section,
  COALESCE(jsonb_agg(payload), '[]'::jsonb) AS data
FROM preview_child_update_payload

UNION ALL

SELECT
  '06_future_write_sql_text_preview' AS section,
  COALESCE(jsonb_agg(to_jsonb(future_write_sql_text)), '[]'::jsonb) AS data
FROM future_write_sql_text

UNION ALL

SELECT
  '07_future_rollback_sql_text_preview' AS section,
  COALESCE(jsonb_agg(to_jsonb(future_rollback_sql_text)), '[]'::jsonb) AS data
FROM future_rollback_sql_text

UNION ALL

SELECT
  '08_no_write_decision' AS section,
  jsonb_build_array(
    jsonb_build_object(
      'p4Step', 'P4.9.15-A4',
      'mode', 'exact_preview_before_first_hierarchy_write',
      'noWritePerformed', true,
      'targetRelation', 'Learning -> Business German writing practice',
      'nextRequiredDecision', 'If preflight_status is READY_FOR_EXACT_WRITE_SQL, generate guarded write SQL in P4.9.15-A5.'
    )
  ) AS data

ORDER BY section;
