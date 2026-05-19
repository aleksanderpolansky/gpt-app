/*
P4.9.15-A5
Rollback template for Learning -> Business German writing practice.

Use this only if the A5 guarded write must be reverted.

This template does not require manually pasting the parent id.
It finds the seeded Learning parent by exact controlled metadata.
*/

WITH target_parent AS (
  SELECT
    vo.id
  FROM public.value_objects vo
  WHERE vo.title = 'Learning'
    AND vo.value_type = 'personal_development'
    AND vo.parent_value_object_id IS NULL
    AND vo.metadata_json->>'createdFor' = 'first controlled parent/child hierarchy test'
    AND vo.metadata_json->>'recommendedChildValueObjectId' = '9177fea8-de25-446b-b418-b55a766d53db'
    AND vo.metadata_json->>'recommendedRelation' = 'Learning -> Business German writing practice'
    AND vo.entity_protocol_characteristics_json #>> '{p4,step}' = 'P4.9.15-A5'
  ORDER BY vo.created_at DESC
  LIMIT 1
),

reset_child AS (
  UPDATE public.value_objects child
  SET
    parent_value_object_id = NULL,
    updated_at = now()
  FROM target_parent tp
  WHERE child.id = '9177fea8-de25-446b-b418-b55a766d53db'::uuid
    AND child.parent_value_object_id = tp.id
  RETURNING
    child.id,
    child.title,
    child.parent_value_object_id
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
  RETURNING
    parent.id,
    parent.title,
    parent.value_type
)

SELECT
  'rollback_result' AS section,
  jsonb_build_array(
    jsonb_build_object(
      'targetParent', COALESCE((SELECT jsonb_agg(to_jsonb(target_parent)) FROM target_parent), '[]'::jsonb),
      'resetChildRows', (SELECT count(*) FROM reset_child),
      'deletedParentRows', (SELECT count(*) FROM deleted_parent),
      'resetChild', COALESCE((SELECT jsonb_agg(to_jsonb(reset_child)) FROM reset_child), '[]'::jsonb),
      'deletedParent', COALESCE((SELECT jsonb_agg(to_jsonb(deleted_parent)) FROM deleted_parent), '[]'::jsonb)
    )
  ) AS data;
