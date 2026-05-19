/*
P4.9.15-A6
Read-only verification after first controlled Value Object hierarchy write.

Target relation:
- Learning -> Business German writing practice

This SQL is READ-ONLY.
It does not INSERT.
It does not UPDATE.
It does not DELETE.

Purpose:
- verify that Learning exists as parent;
- verify that Business German writing practice points to Learning;
- verify hierarchy read model shows Business German writing practice as child;
- verify the second candidate relation was not touched;
- decide whether A5 is fully verified.
*/

WITH constants AS (
  SELECT
    '112bab0b-2a53-4f7a-bd62-b9fe760d0b54'::uuid AS expected_parent_value_object_id,
    '9177fea8-de25-446b-b418-b55a766d53db'::uuid AS expected_child_value_object_id,
    'b7acc958-7966-42c2-82c5-35c4de26d7ea'::uuid AS second_candidate_child_value_object_id
),

learning_parent AS (
  SELECT
    vo.id,
    vo.title,
    vo.value_type,
    vo.status,
    vo.commercial_usage,
    vo.parent_value_object_id,
    vo.created_at,
    vo.updated_at,
    vo.needs_user_review,
    vo.ui_visibility,
    vo.entity_protocol_characteristics_json,
    vo.category_origin_json,
    vo.metadata_json
  FROM public.value_objects vo
  JOIN constants c
    ON vo.id = c.expected_parent_value_object_id
  WHERE vo.title = 'Learning'
    AND vo.value_type = 'personal_development'
),

business_german_child AS (
  SELECT
    vo.id,
    vo.title,
    vo.value_type,
    vo.status,
    vo.commercial_usage,
    vo.parent_value_object_id,
    vo.created_at,
    vo.updated_at,
    vo.needs_user_review,
    vo.ui_visibility,
    vo.entity_protocol_characteristics_json,
    vo.category_origin_json,
    vo.metadata_json
  FROM public.value_objects vo
  JOIN constants c
    ON vo.id = c.expected_child_value_object_id
  WHERE vo.title = 'Business German writing practice'
),

children_of_learning AS (
  SELECT
    child.id,
    child.title,
    child.value_type,
    child.status,
    child.commercial_usage,
    child.parent_value_object_id,
    child.created_at,
    child.updated_at
  FROM public.value_objects child
  JOIN constants c
    ON child.parent_value_object_id = c.expected_parent_value_object_id
),

business_german_hierarchy_profile AS (
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
    hp.latest_activity_template_slug,
    hp.ui_visibility,
    hp.needs_user_review
  FROM public.value_object_hierarchy_profiles_v1 hp
  JOIN constants c
    ON hp.value_object_id = c.expected_child_value_object_id
),

learning_parent_as_parent_reference AS (
  SELECT
    parent.id,
    parent.title,
    parent.value_type,
    parent.status,
    parent.commercial_usage
  FROM public.value_objects parent
  JOIN business_german_child child
    ON child.parent_value_object_id = parent.id
),

second_candidate_integrity AS (
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
    ON vo.id = c.second_candidate_child_value_object_id
),

second_candidate_hierarchy_profile AS (
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
    ON hp.value_object_id = c.second_candidate_child_value_object_id
),

counts AS (
  SELECT
    (SELECT count(*) FROM learning_parent) AS learning_parent_count,
    (SELECT count(*) FROM business_german_child) AS business_german_child_count,
    (
      SELECT count(*)
      FROM business_german_child bgc
      JOIN constants c
        ON bgc.parent_value_object_id = c.expected_parent_value_object_id
    ) AS business_german_points_to_learning_count,
    (SELECT count(*) FROM children_of_learning) AS children_of_learning_count,
    (
      SELECT count(*)
      FROM children_of_learning col
      JOIN constants c
        ON col.id = c.expected_child_value_object_id
    ) AS expected_child_among_learning_children_count,
    (SELECT count(*) FROM business_german_hierarchy_profile) AS business_german_hierarchy_profile_count,
    (
      SELECT count(*)
      FROM business_german_hierarchy_profile hp
      JOIN constants c
        ON hp.parent_value_object_id = c.expected_parent_value_object_id
       AND hp.parent_exists = true
       AND hp.hierarchy_role = 'child'
       AND hp.is_child = true
       AND hp.is_root = false
    ) AS hierarchy_child_state_verified_count,
    (SELECT count(*) FROM learning_parent_as_parent_reference) AS parent_reference_resolves_count,
    (SELECT count(*) FROM second_candidate_integrity) AS second_candidate_count,
    (
      SELECT count(*)
      FROM second_candidate_integrity sci
      WHERE sci.parent_value_object_id IS NULL
    ) AS second_candidate_parent_null_count,
    (
      SELECT count(*)
      FROM second_candidate_hierarchy_profile schp
      WHERE schp.hierarchy_role = 'root'
        AND schp.is_root = true
        AND schp.is_child = false
        AND schp.parent_value_object_id IS NULL
    ) AS second_candidate_still_root_count
),

verification_decision AS (
  SELECT
    *,
    CASE
      WHEN learning_parent_count <> 1
        THEN 'FAILED_LEARNING_PARENT_NOT_FOUND_OR_NOT_UNIQUE'
      WHEN business_german_child_count <> 1
        THEN 'FAILED_BUSINESS_GERMAN_CHILD_NOT_FOUND_OR_NOT_UNIQUE'
      WHEN business_german_points_to_learning_count <> 1
        THEN 'FAILED_CHILD_DOES_NOT_POINT_TO_LEARNING'
      WHEN expected_child_among_learning_children_count <> 1
        THEN 'FAILED_CHILD_NOT_LISTED_UNDER_LEARNING'
      WHEN business_german_hierarchy_profile_count <> 1
        THEN 'FAILED_HIERARCHY_PROFILE_NOT_FOUND_OR_NOT_UNIQUE'
      WHEN hierarchy_child_state_verified_count <> 1
        THEN 'FAILED_HIERARCHY_PROFILE_NOT_CHILD_STATE'
      WHEN parent_reference_resolves_count <> 1
        THEN 'FAILED_PARENT_REFERENCE_DOES_NOT_RESOLVE'
      WHEN second_candidate_count <> 1
        THEN 'FAILED_SECOND_CANDIDATE_NOT_FOUND_OR_NOT_UNIQUE'
      WHEN second_candidate_parent_null_count <> 1
        THEN 'FAILED_SECOND_CANDIDATE_WAS_TOUCHED'
      WHEN second_candidate_still_root_count <> 1
        THEN 'FAILED_SECOND_CANDIDATE_HIERARCHY_CHANGED'
      ELSE 'VERIFIED_FIRST_HIERARCHY_WRITE_SUCCESSFUL'
    END AS verification_status
  FROM counts
)

SELECT
  '00_verification_decision' AS section,
  jsonb_build_array(to_jsonb(verification_decision)) AS data
FROM verification_decision

UNION ALL

SELECT
  '01_learning_parent' AS section,
  COALESCE(jsonb_agg(to_jsonb(learning_parent)), '[]'::jsonb) AS data
FROM learning_parent

UNION ALL

SELECT
  '02_business_german_child' AS section,
  COALESCE(jsonb_agg(to_jsonb(business_german_child)), '[]'::jsonb) AS data
FROM business_german_child

UNION ALL

SELECT
  '03_children_of_learning' AS section,
  COALESCE(jsonb_agg(to_jsonb(children_of_learning) ORDER BY title), '[]'::jsonb) AS data
FROM children_of_learning

UNION ALL

SELECT
  '04_business_german_hierarchy_profile' AS section,
  COALESCE(jsonb_agg(to_jsonb(business_german_hierarchy_profile)), '[]'::jsonb) AS data
FROM business_german_hierarchy_profile

UNION ALL

SELECT
  '05_learning_parent_as_parent_reference' AS section,
  COALESCE(jsonb_agg(to_jsonb(learning_parent_as_parent_reference)), '[]'::jsonb) AS data
FROM learning_parent_as_parent_reference

UNION ALL

SELECT
  '06_second_candidate_integrity' AS section,
  COALESCE(jsonb_agg(to_jsonb(second_candidate_integrity)), '[]'::jsonb) AS data
FROM second_candidate_integrity

UNION ALL

SELECT
  '07_second_candidate_hierarchy_profile' AS section,
  COALESCE(jsonb_agg(to_jsonb(second_candidate_hierarchy_profile)), '[]'::jsonb) AS data
FROM second_candidate_hierarchy_profile

UNION ALL

SELECT
  '08_next_action' AS section,
  jsonb_build_array(
    jsonb_build_object(
      'p4Step', 'P4.9.15-A6',
      'mode', 'read_only_verification_after_first_hierarchy_write',
      'noWritePerformed', true,
      'expectedVerificationStatus', 'VERIFIED_FIRST_HIERARCHY_WRITE_SUCCESSFUL',
      'nextRequiredStepIfVerified', 'Document A6 result, then verify debug UI/API.',
      'nextRequiredStepIfFailed', 'Do not continue. Inspect failed verification section.'
    )
  ) AS data

ORDER BY section;
