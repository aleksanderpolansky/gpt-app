/*
P4.9.15-A5
Guarded write for the first controlled Value Object hierarchy relation.

Target relation:
- Learning -> Business German writing practice

THIS SQL WRITES DATA.

It should:
- create one parent Value Object: Learning;
- update one child: Business German writing practice;
- set child.parent_value_object_id = inserted Learning id;
- return verification data;
- return rollback SQL with the actual inserted parent id.

Safety:
- this script uses a PL/pgSQL guard block;
- if the post-insert child update count is not exactly 1, it raises an exception;
- the exception aborts the write, preventing a partial persisted parent-only state.
*/

DROP TABLE IF EXISTS pg_temp.p4915_a5_result;

CREATE TEMP TABLE p4915_a5_result (
  section text NOT NULL,
  data jsonb NOT NULL
) ON COMMIT PRESERVE ROWS;

DO $$
DECLARE
  v_parent_id uuid;
  v_child_id uuid := '9177fea8-de25-446b-b418-b55a766d53db'::uuid;

  v_existing_parent_count integer;
  v_target_child_count integer;
  v_target_child_without_parent_count integer;
  v_child_hierarchy_profile_rows_count integer;
  v_business_german_profile_rows_count integer;

  v_guard_status text;
  v_updated_child_count integer;
  v_rollback_sql text;
BEGIN
  SELECT count(*)
  INTO v_existing_parent_count
  FROM public.value_objects vo
  WHERE lower(vo.title) = lower('Learning');

  SELECT count(*)
  INTO v_target_child_count
  FROM public.value_objects vo
  WHERE vo.id = v_child_id
    AND vo.title = 'Business German writing practice';

  SELECT count(*)
  INTO v_target_child_without_parent_count
  FROM public.value_objects vo
  WHERE vo.id = v_child_id
    AND vo.title = 'Business German writing practice'
    AND vo.parent_value_object_id IS NULL;

  SELECT count(*)
  INTO v_child_hierarchy_profile_rows_count
  FROM public.value_object_hierarchy_profiles_v1 hp
  WHERE hp.value_object_id = v_child_id;

  SELECT count(*)
  INTO v_business_german_profile_rows_count
  FROM public.value_object_hierarchy_profiles_v1 hp
  WHERE hp.value_object_id = v_child_id
    AND hp.contextual_category_slug = 'business-german';

  v_guard_status :=
    CASE
      WHEN v_existing_parent_count > 0
        THEN 'BLOCKED_EXISTING_LEARNING_PARENT_FOUND'
      WHEN v_target_child_count <> 1
        THEN 'BLOCKED_TARGET_CHILD_NOT_FOUND_OR_NOT_UNIQUE'
      WHEN v_target_child_without_parent_count <> 1
        THEN 'BLOCKED_TARGET_CHILD_ALREADY_HAS_PARENT'
      WHEN v_child_hierarchy_profile_rows_count <> 1
        THEN 'BLOCKED_CHILD_HIERARCHY_PROFILE_NOT_FOUND_OR_NOT_UNIQUE'
      WHEN v_business_german_profile_rows_count <> 1
        THEN 'BLOCKED_CHILD_IS_NOT_BUSINESS_GERMAN_PROFILE'
      ELSE 'READY_FOR_GUARDED_WRITE'
    END;

  IF v_guard_status <> 'READY_FOR_GUARDED_WRITE' THEN
    INSERT INTO pg_temp.p4915_a5_result(section, data)
    VALUES (
      '00_guard_decision',
      jsonb_build_array(
        jsonb_build_object(
          'guardStatus', v_guard_status,
          'existingLearningParentCount', v_existing_parent_count,
          'targetChildCount', v_target_child_count,
          'targetChildWithoutParentCount', v_target_child_without_parent_count,
          'childHierarchyProfileRowsCount', v_child_hierarchy_profile_rows_count,
          'businessGermanProfileRowsCount', v_business_german_profile_rows_count,
          'insertedParentCount', 0,
          'updatedChildCount', 0,
          'writePerformed', false
        )
      )
    );

    INSERT INTO pg_temp.p4915_a5_result(section, data)
    VALUES (
      '06_a5_decision',
      jsonb_build_array(
        jsonb_build_object(
          'p4Step', 'P4.9.15-A5',
          'mode', 'guarded_first_hierarchy_write',
          'targetRelation', 'Learning -> Business German writing practice',
          'writePerformed', false,
          'reason', v_guard_status,
          'nextRequiredStep', 'Do not retry blindly. Inspect guard decision.'
        )
      )
    );

    RETURN;
  END IF;

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
    jsonb_build_object(
      'p4',
      jsonb_build_object(
        'step', 'P4.9.15-A5',
        'mode', 'controlled_structural_parent_seed',
        'semanticKey', 'learning',
        'structuralOnly', true
      )
    ),
    jsonb_build_object(
      'source', 'controlled_hierarchy_seed',
      'p4Step', 'P4.9.15-A5',
      'derivedFromChildCategorySlug', 'business-german'
    ),
    jsonb_build_object(
      'createdFor', 'first controlled parent/child hierarchy test',
      'recommendedChildValueObjectId', v_child_id,
      'recommendedChildTitle', 'Business German writing practice',
      'recommendedRelation', 'Learning -> Business German writing practice'
    )
  )
  RETURNING id INTO v_parent_id;

  UPDATE public.value_objects child
  SET
    parent_value_object_id = v_parent_id,
    updated_at = now()
  WHERE child.id = v_child_id
    AND child.title = 'Business German writing practice'
    AND child.parent_value_object_id IS NULL;

  GET DIAGNOSTICS v_updated_child_count = ROW_COUNT;

  IF v_updated_child_count <> 1 THEN
    RAISE EXCEPTION
      'P4.9.15-A5 partial write guard failed. Expected updated child count 1, got %. Inserted parent id: %',
      v_updated_child_count,
      v_parent_id;
  END IF;

  v_rollback_sql := format(
$rollback$
-- P4.9.15-A5 ROLLBACK SQL
-- Generated with the actual inserted Learning parent id.

WITH target_parent AS (
  SELECT %L::uuid AS id
),

reset_child AS (
  UPDATE public.value_objects child
  SET
    parent_value_object_id = NULL,
    updated_at = now()
  FROM target_parent tp
  WHERE child.id = '9177fea8-de25-446b-b418-b55a766d53db'::uuid
    AND child.parent_value_object_id = tp.id
  RETURNING child.id, child.title, child.parent_value_object_id
),

deleted_parent AS (
  DELETE FROM public.value_objects parent
  USING target_parent tp
  WHERE parent.id = tp.id
    AND parent.title = 'Learning'
    AND parent.value_type = 'personal_development'
    AND parent.parent_value_object_id IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.value_objects child
      WHERE child.parent_value_object_id = parent.id
    )
  RETURNING parent.id, parent.title, parent.value_type
)

SELECT
  'rollback_result' AS section,
  jsonb_build_array(
    jsonb_build_object(
      'resetChildRows', (SELECT count(*) FROM reset_child),
      'deletedParentRows', (SELECT count(*) FROM deleted_parent),
      'resetChild', COALESCE((SELECT jsonb_agg(to_jsonb(reset_child)) FROM reset_child), '[]'::jsonb),
      'deletedParent', COALESCE((SELECT jsonb_agg(to_jsonb(deleted_parent)) FROM deleted_parent), '[]'::jsonb)
    )
  ) AS data;
$rollback$,
    v_parent_id::text
  );

  INSERT INTO pg_temp.p4915_a5_result(section, data)
  VALUES (
    '00_guard_decision',
    jsonb_build_array(
      jsonb_build_object(
        'guardStatus', v_guard_status,
        'existingLearningParentCount', v_existing_parent_count,
        'targetChildCount', v_target_child_count,
        'targetChildWithoutParentCount', v_target_child_without_parent_count,
        'childHierarchyProfileRowsCount', v_child_hierarchy_profile_rows_count,
        'businessGermanProfileRowsCount', v_business_german_profile_rows_count,
        'insertedParentCount', 1,
        'updatedChildCount', v_updated_child_count,
        'writePerformed', true,
        'insertedParentId', v_parent_id
      )
    )
  );

  INSERT INTO pg_temp.p4915_a5_result(section, data)
  SELECT
    '01_write_result',
    jsonb_build_array(
      jsonb_build_object(
        'insertedParentCount', 1,
        'updatedChildCount', v_updated_child_count,
        'insertedParentId', v_parent_id,
        'updatedChildId', v_child_id,
        'targetRelation', 'Learning -> Business German writing practice'
      )
    );

  INSERT INTO pg_temp.p4915_a5_result(section, data)
  SELECT
    '02_parent_after_write',
    COALESCE(jsonb_agg(to_jsonb(parent_rows)), '[]'::jsonb)
  FROM (
    SELECT
      vo.id,
      vo.title,
      vo.value_type,
      vo.parent_value_object_id,
      vo.status,
      vo.commercial_usage,
      vo.created_at,
      vo.updated_at,
      vo.entity_protocol_characteristics_json,
      vo.category_origin_json,
      vo.metadata_json
    FROM public.value_objects vo
    WHERE vo.id = v_parent_id
  ) parent_rows;

  INSERT INTO pg_temp.p4915_a5_result(section, data)
  SELECT
    '03_child_after_write',
    COALESCE(jsonb_agg(to_jsonb(child_rows)), '[]'::jsonb)
  FROM (
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
    WHERE vo.id = v_child_id
  ) child_rows;

  INSERT INTO pg_temp.p4915_a5_result(section, data)
  SELECT
    '04_hierarchy_after_write',
    COALESCE(jsonb_agg(to_jsonb(hierarchy_rows)), '[]'::jsonb)
  FROM (
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
    WHERE hp.value_object_id = v_child_id
  ) hierarchy_rows;

  INSERT INTO pg_temp.p4915_a5_result(section, data)
  VALUES (
    '05_rollback_sql_text',
    jsonb_build_array(
      jsonb_build_object(
        'sqlText', v_rollback_sql
      )
    )
  );

  INSERT INTO pg_temp.p4915_a5_result(section, data)
  VALUES (
    '06_a5_decision',
    jsonb_build_array(
      jsonb_build_object(
        'p4Step', 'P4.9.15-A5',
        'mode', 'guarded_first_hierarchy_write',
        'targetRelation', 'Learning -> Business German writing practice',
        'writePerformed', true,
        'insertedParentId', v_parent_id,
        'updatedChildId', v_child_id,
        'nextRequiredStep', 'Document result and verify UI/debug view.'
      )
    )
  );
END $$;

SELECT
  section,
  data
FROM pg_temp.p4915_a5_result
ORDER BY section;
