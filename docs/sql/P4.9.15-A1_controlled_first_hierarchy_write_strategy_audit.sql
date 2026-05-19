/*
P4.9.15-A1
Controlled first hierarchy write strategy audit.

Purpose:
- choose the safest first parent/child hierarchy write strategy;
- inspect whether parent Value Objects like Learning or Health already exist;
- inspect required value_objects fields before any insert/update;
- preview candidate parent creation and child linking;
- do not write data yet.

This SQL is read-only.
It does not INSERT into value_objects.
It does not UPDATE parent_value_object_id.
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

value_object_required_columns AS (
  SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'value_objects'
    AND is_nullable = 'NO'
    AND column_default IS NULL
  ORDER BY ordinal_position
),

value_object_constraints AS (
  SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
  FROM information_schema.table_constraints tc
  LEFT JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.table_schema = kcu.table_schema
  LEFT JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
   AND tc.table_schema = ccu.table_schema
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'value_objects'
  ORDER BY tc.constraint_type, tc.constraint_name, kcu.ordinal_position
),

current_value_objects AS (
  SELECT
    vo.id AS value_object_id,
    vo.title,
    vo.value_type,
    vo.description,
    vo.status,
    vo.owner_actor_id,
    vo.organization_id,
    vo.commercial_usage,
    vo.parent_value_object_id,
    vo.entity_protocol_characteristics_json,
    vo.needs_user_review,
    vo.ui_visibility,
    vo.category_origin_json,
    vo.metadata_json,
    vo.created_at,
    vo.updated_at
  FROM public.value_objects vo
),

current_cloud_children AS (
  SELECT
    hp.user_id,
    hp.value_object_id,
    vo.title,
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
  JOIN public.value_objects vo
    ON vo.id = hp.value_object_id
  WHERE hp.contextual_category_slug IN ('business-german', 'knee-exercises')
),

possible_existing_parents AS (
  SELECT
    vo.value_object_id,
    vo.title,
    vo.value_type,
    vo.status,
    vo.commercial_usage,
    vo.parent_value_object_id,
    vo.needs_user_review,
    vo.ui_visibility,
    vo.category_origin_json,
    vo.metadata_json,
    vo.created_at,
    vo.updated_at,
    CASE
      WHEN lower(vo.title) IN ('learning', 'education', 'language learning') THEN 'learning_parent_candidate'
      WHEN lower(vo.title) IN ('health', 'physical health', 'knee', 'lower-limb health') THEN 'health_parent_candidate'
      WHEN lower(vo.title) IN ('german language', 'business communication', 'business german') THEN 'german_language_parent_candidate'
      WHEN lower(vo.title) IN ('massage', 'service', 'product') THEN 'commercial_parent_candidate'
      ELSE 'other'
    END AS parent_candidate_kind
  FROM current_value_objects vo
  WHERE lower(vo.title) IN (
    'learning',
    'education',
    'language learning',
    'health',
    'physical health',
    'knee',
    'lower-limb health',
    'german language',
    'business communication',
    'business german',
    'massage',
    'service',
    'product'
  )
),

child_candidates AS (
  SELECT
    cvc.user_id,
    cvc.value_object_id AS child_value_object_id,
    cvc.title AS child_title,
    cvc.contextual_category_slug,
    cvc.contextual_category_name,
    cvc.usage_count,
    cvc.total_exposure_minutes,
    cvc.latest_activity_template_slug,
    cvc.parent_value_object_id AS current_parent_value_object_id,
    CASE
      WHEN cvc.contextual_category_slug = 'business-german'
        THEN 'Learning'
      WHEN cvc.contextual_category_slug = 'knee-exercises'
        THEN 'Health'
      ELSE NULL
    END AS recommended_new_parent_title,
    CASE
      WHEN cvc.contextual_category_slug = 'business-german'
        THEN 'personal_development'
      WHEN cvc.contextual_category_slug = 'knee-exercises'
        THEN 'personal_development'
      ELSE 'personal_development'
    END AS recommended_new_parent_value_type,
    CASE
      WHEN cvc.contextual_category_slug = 'business-german'
        THEN 'learning'
      WHEN cvc.contextual_category_slug = 'knee-exercises'
        THEN 'health'
      ELSE NULL
    END AS recommended_parent_semantic_key,
    CASE
      WHEN cvc.parent_value_object_id IS NULL THEN true
      ELSE false
    END AS child_is_linkable_now
  FROM current_cloud_children cvc
),

recommended_strategies AS (
  SELECT
    cc.user_id,
    cc.child_value_object_id,
    cc.child_title,
    cc.contextual_category_slug,
    cc.contextual_category_name,
    cc.usage_count,
    cc.total_exposure_minutes,
    cc.latest_activity_template_slug,
    cc.current_parent_value_object_id,
    cc.child_is_linkable_now,
    cc.recommended_new_parent_title,
    cc.recommended_new_parent_value_type,
    cc.recommended_parent_semantic_key,

    pep.value_object_id AS existing_parent_value_object_id,
    pep.title AS existing_parent_title,

    CASE
      WHEN cc.child_is_linkable_now = false
        THEN 'blocked_child_already_has_parent'
      WHEN pep.value_object_id IS NOT NULL
        THEN 'can_link_to_existing_parent_after_preview'
      WHEN cc.recommended_new_parent_title IS NOT NULL
        THEN 'can_seed_parent_then_link_after_preview'
      ELSE 'no_safe_strategy'
    END AS strategy_status,

    CASE
      WHEN cc.child_is_linkable_now = false
        THEN 'Do not update: child already has parent.'
      WHEN pep.value_object_id IS NOT NULL
        THEN 'Preview linking child to existing parent Value Object.'
      WHEN cc.recommended_new_parent_title IS NOT NULL
        THEN 'Preview creating explicit structural parent Value Object, then linking one child.'
      ELSE 'No recommended hierarchy write.'
    END AS strategy_reason,

    jsonb_build_object(
      'noWritePerformed', true,
      'requiresHumanApproval', true,
      'requiresPreviewSql', true,
      'requiresRollbackSql', true,
      'structuralRelationOnly', true,
      'recommendedFirstWritePattern', 'seed_parent_then_link_single_child'
    ) AS strategy_metadata
  FROM child_candidates cc
  LEFT JOIN possible_existing_parents pep
    ON lower(pep.title) = lower(cc.recommended_new_parent_title)
),

insert_preview_for_new_parents AS (
  SELECT
    rs.user_id,
    rs.recommended_new_parent_title,
    rs.recommended_new_parent_value_type,
    rs.recommended_parent_semantic_key,
    rs.child_value_object_id,
    rs.child_title,
    rs.contextual_category_slug,
    rs.strategy_status,
    jsonb_build_object(
      'operation', 'PREVIEW_ONLY_INSERT_PARENT',
      'table', 'public.value_objects',
      'title', rs.recommended_new_parent_title,
      'value_type', rs.recommended_new_parent_value_type,
      'status', 'active',
      'commercial_usage', 'none',
      'needs_user_review', false,
      'ui_visibility', 'visible',
      'entity_protocol_characteristics_json', jsonb_build_object(
        'p4', jsonb_build_object(
          'step', 'P4.9.15',
          'mode', 'controlled_structural_parent_seed',
          'semanticKey', rs.recommended_parent_semantic_key,
          'structuralOnly', true
        )
      ),
      'category_origin_json', jsonb_build_object(
        'source', 'controlled_hierarchy_seed',
        'p4Step', 'P4.9.15',
        'derivedFromChildCategorySlug', rs.contextual_category_slug
      ),
      'metadata_json', jsonb_build_object(
        'createdFor', 'first controlled parent/child hierarchy test',
        'recommendedChildValueObjectId', rs.child_value_object_id,
        'recommendedChildTitle', rs.child_title
      )
    ) AS preview_insert_parent_payload
  FROM recommended_strategies rs
  WHERE rs.strategy_status = 'can_seed_parent_then_link_after_preview'
),

update_preview_for_child_link AS (
  SELECT
    rs.user_id,
    rs.child_value_object_id,
    rs.child_title,
    rs.contextual_category_slug,
    rs.recommended_new_parent_title,
    rs.existing_parent_value_object_id,
    rs.strategy_status,
    jsonb_build_object(
      'operation', 'PREVIEW_ONLY_UPDATE_CHILD_PARENT',
      'table', 'public.value_objects',
      'childValueObjectId', rs.child_value_object_id,
      'childTitle', rs.child_title,
      'newParentValueObjectId', COALESCE(
        rs.existing_parent_value_object_id::text,
        '[new parent id after controlled insert]'
      ),
      'currentParentValueObjectId', rs.current_parent_value_object_id,
      'rollback', jsonb_build_object(
        'operation', 'ROLLBACK_UPDATE_CHILD_PARENT_TO_NULL',
        'childValueObjectId', rs.child_value_object_id,
        'restoreParentValueObjectId', rs.current_parent_value_object_id
      )
    ) AS preview_update_child_payload
  FROM recommended_strategies rs
  WHERE rs.strategy_status IN (
    'can_seed_parent_then_link_after_preview',
    'can_link_to_existing_parent_after_preview'
  )
),

counts AS (
  SELECT
    (SELECT count(*) FROM current_value_objects) AS value_objects_count,
    (SELECT count(*) FROM current_cloud_children) AS current_cloud_children_count,
    (SELECT count(*) FROM possible_existing_parents) AS existing_parent_candidates_count,
    (SELECT count(*) FROM recommended_strategies) AS recommended_strategy_rows_count,
    (SELECT count(*) FROM recommended_strategies WHERE strategy_status = 'can_seed_parent_then_link_after_preview') AS seed_parent_then_link_strategy_count,
    (SELECT count(*) FROM recommended_strategies WHERE strategy_status = 'can_link_to_existing_parent_after_preview') AS link_to_existing_parent_strategy_count,
    (SELECT count(*) FROM recommended_strategies WHERE strategy_status = 'blocked_child_already_has_parent') AS blocked_child_already_has_parent_count,
    (SELECT count(*) FROM value_object_required_columns) AS required_columns_without_defaults_count
)

SELECT
  '00_counts' AS section,
  COALESCE(jsonb_agg(to_jsonb(counts)), '[]'::jsonb) AS data
FROM counts

UNION ALL

SELECT
  '01_value_object_required_columns_without_defaults' AS section,
  COALESCE(jsonb_agg(to_jsonb(value_object_required_columns)), '[]'::jsonb) AS data
FROM value_object_required_columns

UNION ALL

SELECT
  '02_value_object_constraints' AS section,
  COALESCE(jsonb_agg(to_jsonb(value_object_constraints)), '[]'::jsonb) AS data
FROM value_object_constraints

UNION ALL

SELECT
  '03_current_cloud_children' AS section,
  COALESCE(jsonb_agg(to_jsonb(current_cloud_children) ORDER BY contextual_category_slug), '[]'::jsonb) AS data
FROM current_cloud_children

UNION ALL

SELECT
  '04_possible_existing_parents' AS section,
  COALESCE(jsonb_agg(to_jsonb(possible_existing_parents) ORDER BY title), '[]'::jsonb) AS data
FROM possible_existing_parents

UNION ALL

SELECT
  '05_recommended_strategies' AS section,
  COALESCE(jsonb_agg(to_jsonb(recommended_strategies) ORDER BY contextual_category_slug), '[]'::jsonb) AS data
FROM recommended_strategies

UNION ALL

SELECT
  '06_insert_preview_for_new_parents' AS section,
  COALESCE(jsonb_agg(to_jsonb(insert_preview_for_new_parents) ORDER BY recommended_new_parent_title), '[]'::jsonb) AS data
FROM insert_preview_for_new_parents

UNION ALL

SELECT
  '07_update_preview_for_child_link' AS section,
  COALESCE(jsonb_agg(to_jsonb(update_preview_for_child_link) ORDER BY contextual_category_slug), '[]'::jsonb) AS data
FROM update_preview_for_child_link

UNION ALL

SELECT
  '08_no_write_decision' AS section,
  jsonb_build_array(
    jsonb_build_object(
      'p4Step', 'P4.9.15-A1',
      'mode', 'read_only_first_hierarchy_write_strategy_audit',
      'noWritePerformed', true,
      'nextRequiredDecision', 'Choose one strategy row and generate exact preview/write/rollback SQL in the next step.',
      'recommendedSafePath', jsonb_build_array(
        'choose one child only',
        'create or identify one explicit structural parent',
        'preview exact SQL',
        'prepare rollback SQL',
        'write one relation only',
        'verify through value_object_hierarchy_profiles_v1'
      )
    )
  ) AS data

ORDER BY section;
