-- ARCTor STEP2 controlled commercial facts, pilot v2, 2026-10-10
-- Apply in Supabase SQL Editor only after reading the README.
-- Changes: TWO new service-only functions; narrow addition to existing fact guard.
-- No existing personal-data rows are updated; existing writer is not changed.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '90s';

DO $preflight$
DECLARE v_def text;
BEGIN
  IF to_regprocedure('public.enforce_activity_fact_actor_alignment_v2()') IS NULL
     OR to_regclass('public.activity_template_impact_profiles_v1') IS NULL
     OR to_regclass('public.activity_template_profile_parameters_v2') IS NULL
  THEN RAISE EXCEPTION 'ARCTOR_STEP2_REQUIRED_FOUNDATION_MISSING'; END IF;
  SELECT pg_get_functiondef('public.enforce_activity_fact_actor_alignment_v2()'::regprocedure) INTO v_def;
  IF position('if v_is_review_fact then' IN lower(v_def)) = 0
     OR position('GSR1D_GLOBAL_FACT_REQUIRES_SYSTEM_PARAMETER_CONTRACT' IN v_def) = 0
  THEN RAISE EXCEPTION 'ARCTOR_STEP2_GUARD_BASELINE_NOT_RECOGNIZED'; END IF;
  IF position('ARCTOR_COMMERCIAL_AUTO_FACT_V1' IN v_def) > 0
  THEN RAISE EXCEPTION 'ARCTOR_STEP2_GUARD_ALREADY_PATCHED'; END IF;
END $preflight$;

-- Validate that the ONLY permitted exception to an existing permanent
-- leaf/parameter assignment comes from an ACTIVE COMMERCIAL system template,
-- its selected intermediate branch, and a leaf descendant in that branch.
CREATE OR REPLACE FUNCTION public.arctor_validate_commercial_fact_v1(
  p_activity_event_id uuid,
  p_value_object_id uuid,
  p_parameter_definition_id uuid,
  p_intermediate_value_object_id uuid,
  p_unit text
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
WITH RECURSIVE lineage AS (
  SELECT vo.id, vo.parent_value_object_id, 0 AS depth
  FROM public.value_objects vo
  WHERE vo.id = p_value_object_id
    AND vo.scope_code = 'global'
    AND vo.origin_type_code = 'system_model'
    AND vo.status = 'active'
    AND vo.ontology_node_role_code = 'leaf'
  UNION ALL
  SELECT parent.id, parent.parent_value_object_id, child.depth + 1
  FROM public.value_objects parent
  JOIN lineage child ON child.parent_value_object_id = parent.id
  WHERE child.depth < 30
), branches AS (
  SELECT 1 AS matched
  FROM lineage WHERE id = p_intermediate_value_object_id
), template_ok AS (
  SELECT 1 AS matched
  FROM public.activity_events e
  JOIN public.activity_templates t ON t.id = e.activity_template_id
  JOIN public.activity_template_impact_profiles_v1 p
    ON p.template_id=t.id AND p.status='active'
    AND p.routing_contract_code='parameter_registry_v2'
  JOIN public.activity_template_profile_parameters_v2 pp
    ON pp.profile_id=p.id
    AND pp.parameter_definition_id=p_parameter_definition_id
  WHERE e.id=p_activity_event_id
    AND e.activity_context_code='commercial'
    AND e.source_message_object_id IS NOT NULL
    AND t.template_scope='system' AND t.status='active' AND t.is_active=true
    AND t.default_metadata_json #>> '{typicalActivityAuthoringV2,actorApplicability}' = 'commercial'
    AND t.default_metadata_json #>> '{typicalActivityAuthoringV2,acceptanceMode}' = 'auto_if_unambiguous'
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(
        coalesce(p.metadata_json->'parameterizedTargetBindingsV1','[]'::jsonb)
      ) b
      WHERE b->>'parameterDefinitionId' = p_parameter_definition_id::text
        AND b->>'intermediateValueObjectId' = p_intermediate_value_object_id::text
    )
), unit_ok AS (
  SELECT 1 AS matched
  FROM public.value_object_parameter_definitions d
  WHERE d.id=p_parameter_definition_id
    AND d.status='active' AND d.scope_code='system'
    AND d.allowed_unit_codes ? lower(p_unit)
)
SELECT EXISTS(SELECT 1 FROM branches)
   AND EXISTS(SELECT 1 FROM template_ok)
   AND EXISTS(SELECT 1 FROM unit_ok);
$function$;

-- Bounded deterministic selection: one leaf, not one per store.
CREATE OR REPLACE FUNCTION public.arctor_commercial_first_leaf_v1(p_branch_id uuid)
RETURNS TABLE(id uuid,title text,canonical_key text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=public,pg_temp
AS $function$
WITH RECURSIVE descendants AS (
  SELECT vo.id,vo.parent_value_object_id,vo.title,vo.canonical_key,
         vo.ontology_node_role_code,0 AS depth
  FROM public.value_objects vo
  WHERE vo.id=p_branch_id AND vo.status='active'
  UNION ALL
  SELECT c.id,c.parent_value_object_id,c.title,c.canonical_key,
         c.ontology_node_role_code,d.depth+1
  FROM public.value_objects c JOIN descendants d
    ON c.parent_value_object_id=d.id
  WHERE d.depth<12 AND c.status='active'
)
SELECT d.id,d.title,d.canonical_key FROM descendants d
JOIN public.value_objects leaf ON leaf.id=d.id
WHERE d.ontology_node_role_code='leaf' AND leaf.scope_code='global'
ORDER BY d.canonical_key,d.id LIMIT 1;
$function$;

-- Patch only ONE branch in the existing trigger; all personal fact guards stay.
DO $install_guard$
DECLARE
  v_original text;
  v_replacement text;
  v_new text;
BEGIN
  SELECT pg_get_functiondef('public.enforce_activity_fact_actor_alignment_v2()'::regprocedure)
  INTO v_original;
  v_replacement := $snippet$
      if coalesce(new.metadata->>'contract','')='ARCTOR_COMMERCIAL_AUTO_FACT_V1' then
        if new.is_user_confirmed is distinct from false
           or new.parameter_assignment_id is not null
           or new.parameter_definition_id is null
           or new.measure_id is null
           or new.fact_role_code is distinct from 'source'
           or new.fact_status is distinct from 'confirmed'
           or coalesce(new.semantic_match_method_code,'') <> 'rule_based'
           or not public.arctor_validate_commercial_fact_v1(
                new.activity_event_id,
                new.value_object_id,
                new.parameter_definition_id,
                (new.metadata->>'intermediateValueObjectId')::uuid,
                new.unit
              ) then
          raise exception using errcode='23514',
            message='ARCTOR_COMMERCIAL_FACT_BINDING_GUARD_FAILED';
        end if;
      elsif v_is_review_fact then
$snippet$;
  v_new := replace(v_original, 'if v_is_review_fact then', v_replacement);
  IF v_new = v_original THEN
    RAISE EXCEPTION 'ARCTOR_STEP2_GUARD_PATCH_TARGET_NOT_FOUND';
  END IF;
  EXECUTE v_new;
END $install_guard$;

CREATE OR REPLACE FUNCTION public.arctor_write_commercial_auto_facts_v1(
  p_activity_event_id uuid,
  p_facts jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,pg_temp
AS $writer$
DECLARE
  v_event public.activity_events%rowtype;
  v_row jsonb;
  v_param public.value_object_parameter_definitions%rowtype;
  v_leaf public.value_objects%rowtype;
  v_measure_id uuid;
  v_fact_id uuid;
  v_rows jsonb := '[]'::jsonb;
  v_source text;
  v_type text;
  v_unit text;
  v_value numeric;
  v_intermediate uuid;
  v_seen text[] := ARRAY[]::text[];
  v_current integer;
  v_message jsonb;
BEGIN
  IF jsonb_typeof(p_facts) <> 'array'
     OR jsonb_array_length(p_facts) < 1
     OR jsonb_array_length(p_facts) > 12
  THEN RAISE EXCEPTION 'ARCTOR_COMMERCIAL_FACTS_ARRAY_INVALID'; END IF;

  SELECT * INTO v_event FROM public.activity_events
  WHERE id=p_activity_event_id AND activity_context_code='commercial'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ARCTOR_COMMERCIAL_EVENT_NOT_FOUND'; END IF;
  IF v_event.activity_template_id IS NULL OR v_event.source_message_object_id IS NULL THEN
    RAISE EXCEPTION 'ARCTOR_COMMERCIAL_EVENT_INCOMPLETE';
  END IF;

  SELECT count(*) INTO v_current
  FROM public.activity_object_facts
  WHERE activity_event_id=v_event.id AND fact_status <> 'deleted';
  IF v_current > 0 THEN
    IF v_event.commercial_processing_status='auto_processed'
       AND v_current=jsonb_array_length(p_facts) THEN
      RETURN jsonb_build_object('ok',true,'status','idempotent_replay','factCount',v_current);
    END IF;
    RAISE EXCEPTION 'ARCTOR_COMMERCIAL_EVENT_ALREADY_HAS_FACTS';
  END IF;

  IF v_event.commercial_processing_status NOT IN ('analysis_ready','needs_review') THEN
    RAISE EXCEPTION 'ARCTOR_COMMERCIAL_EVENT_NOT_READY';
  END IF;

  SELECT to_jsonb(m) INTO v_message FROM public.message_objects m
  WHERE m.id=v_event.source_message_object_id AND m.lifecycle_status='active'
    AND m.audience_scope_code='public';
  IF v_message IS NULL THEN RAISE EXCEPTION 'ARCTOR_COMMERCIAL_SOURCE_UNAVAILABLE'; END IF;
  v_source := coalesce(v_event.input_text, v_event.title, '');

  FOR v_row IN SELECT value FROM jsonb_array_elements(p_facts) LOOP
    IF jsonb_typeof(v_row) <> 'object' THEN RAISE EXCEPTION 'ARCTOR_COMMERCIAL_ROW_INVALID'; END IF;
    IF coalesce(v_row->>'valueObjectId','') !~ '^[0-9a-fA-F-]{36}$'
       OR coalesce(v_row->>'intermediateValueObjectId','') !~ '^[0-9a-fA-F-]{36}$'
       OR coalesce(v_row->>'parameterDefinitionId','') !~ '^[0-9a-fA-F-]{36}$'
       OR jsonb_typeof(v_row->'valueNumeric') <> 'number' THEN
      RAISE EXCEPTION 'ARCTOR_COMMERCIAL_ROW_SHAPE_INVALID';
    END IF;
    v_intermediate := (v_row->>'intermediateValueObjectId')::uuid;
    v_unit := lower(btrim(v_row->>'unit'));
    v_value := (v_row->>'valueNumeric')::numeric;
    SELECT * INTO v_leaf FROM public.value_objects
      WHERE id=(v_row->>'valueObjectId')::uuid;
    SELECT * INTO v_param FROM public.value_object_parameter_definitions
      WHERE id=(v_row->>'parameterDefinitionId')::uuid;
    IF NOT FOUND OR v_leaf.id IS NULL
       OR v_param.value_type_code <> 'numeric'
       OR NOT public.arctor_validate_commercial_fact_v1(
           v_event.id,v_leaf.id,v_param.id,v_intermediate,v_unit)
    THEN RAISE EXCEPTION 'ARCTOR_COMMERCIAL_WRITER_INVALID_BINDING'; END IF;
    IF v_param.parameter_code='count' AND v_value<>1 THEN
      RAISE EXCEPTION 'ARCTOR_COMMERCIAL_COUNT_EXPECTED_ONE';
    END IF;
    IF v_value < 0 THEN RAISE EXCEPTION 'ARCTOR_COMMERCIAL_VALUE_NEGATIVE'; END IF;
    IF (v_intermediate::text || ':' || v_param.id::text) = ANY(v_seen) THEN
      RAISE EXCEPTION 'ARCTOR_COMMERCIAL_DUPLICATE_BINDING';
    END IF;
    v_seen := array_append(v_seen, v_intermediate::text || ':' || v_param.id::text);
    v_type := CASE WHEN v_param.dimension_code='money' THEN 'money'
              WHEN v_param.dimension_code='count' THEN 'count'
              ELSE 'derived_metric' END;

    INSERT INTO public.activity_event_measures(
      activity_event_id,user_id,performed_by_actor_id,acting_as_actor_id,
      acting_for_actor_id,measure_type,value_numeric,unit,source_type,
      confidence,is_derived,raw_fragment,normalized_fragment,metadata,
      parameter_definition_id
    ) VALUES (
      v_event.id,v_event.user_id,v_event.performed_by_actor_id,
      v_event.acting_as_actor_id,v_event.acting_for_actor_id,
      v_type,v_value,v_unit,'rule_based',1,false,
      coalesce(v_row->>'rawFragment',v_source),
      coalesce(v_row->>'rawFragment',v_source),
      jsonb_build_object('contract','ARCTOR_COMMERCIAL_AUTO_FACT_V1',
        'sourceMessageObjectId',v_event.source_message_object_id),
      v_param.id
    ) RETURNING id INTO v_measure_id;

    INSERT INTO public.activity_object_facts(
      activity_event_id,measure_id,user_id,performed_by_actor_id,
      acting_as_actor_id,acting_for_actor_id,value_object_id,
      semantic_object_key,semantic_object_label,measure_type,
      value_numeric,unit,period_start,period_end,fact_status,confidence,
      source_type,is_chronological_primary,is_exposure_fact,is_user_confirmed,
      metadata,semantic_match_confidence,semantic_match_method_code,
      parameter_definition_id,parameter_assignment_id
    ) VALUES (
      v_event.id,v_measure_id,v_event.user_id,v_event.performed_by_actor_id,
      v_event.acting_as_actor_id,v_event.acting_for_actor_id,v_leaf.id,
      left(trim(both '_' from regexp_replace(lower(v_leaf.canonical_key),
        '[^a-z0-9_]+','_','g')),80),v_leaf.title,v_type,
      v_value,v_unit,v_event.started_at,v_event.ended_at,'confirmed',1,
      'rule_based',false,false,false,
      jsonb_build_object('contract','ARCTOR_COMMERCIAL_AUTO_FACT_V1',
        'intermediateValueObjectId',v_intermediate,
        'activityTemplateId',v_event.activity_template_id,
        'sourceMessageObjectId',v_event.source_message_object_id,
        'reportedSeller',coalesce(v_row->>'reportedSeller',''),
        'selectionRule',coalesce(v_row->>'selectionRule','exact_match'),
        'commercialSourceReliability','published_claim_not_independently_verified'),
      1,'rule_based',v_param.id,null
    ) RETURNING id INTO v_fact_id;
    v_rows := v_rows || jsonb_build_array(jsonb_build_object(
      'factId',v_fact_id,'measureId',v_measure_id,
      'valueObjectId',v_leaf.id,'parameterDefinitionId',v_param.id));
  END LOOP;

  UPDATE public.activity_events SET
    commercial_processing_status='auto_processed',
    commercial_processing_error=null,
    updated_at=clock_timestamp()
  WHERE id=v_event.id;

  RETURN jsonb_build_object('ok',true,'status','written',
    'factCount',jsonb_array_length(v_rows),'rows',v_rows);
END
$writer$;

REVOKE ALL ON FUNCTION public.arctor_commercial_first_leaf_v1(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.arctor_commercial_first_leaf_v1(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.arctor_validate_commercial_fact_v1(uuid,uuid,uuid,uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.arctor_write_commercial_auto_facts_v1(uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.arctor_write_commercial_auto_facts_v1(uuid,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.arctor_validate_commercial_fact_v1(uuid,uuid,uuid,uuid,text) TO service_role;

-- Pilot acceptance gate: validate all three selected targets against the
-- REAL commercial event and the effective template bindings before COMMIT.
-- If any check fails, the entire SQL Editor transaction rolls back.
DO $arctor_pilot_acceptance$
DECLARE
  v_store_leaf_id uuid;
  v_event_id uuid := '32aac29a-f9e6-4670-9d53-225e04459c04'::uuid;
BEGIN
  SELECT leaf.id INTO v_store_leaf_id
  FROM public.arctor_commercial_first_leaf_v1(
    'b2748d91-6d3e-5628-a80e-8aa5e9ea4945'::uuid
  ) leaf LIMIT 1;

  IF v_store_leaf_id IS NULL THEN
    RAISE EXCEPTION 'ARCTOR_STEP2_PILOT_VALENCIA_STORE_LEAF_NOT_FOUND';
  END IF;

  IF NOT (
    public.arctor_validate_commercial_fact_v1(
      v_event_id,
      '5656572e-4ef7-54de-ac06-f417bef9421f'::uuid,
      '957fadd7-47e3-474d-a156-ce09b4e2e063'::uuid,
      '4a1ca70f-1a7b-526e-8afe-f056d5a8ea45'::uuid,
      'count'
    )
    AND public.arctor_validate_commercial_fact_v1(
      v_event_id,
      v_store_leaf_id,
      '957fadd7-47e3-474d-a156-ce09b4e2e063'::uuid,
      'ef1423a8-0ab3-595f-8330-841eb32333a4'::uuid,
      'count'
    )
    AND public.arctor_validate_commercial_fact_v1(
      v_event_id,
      '366c2c72-8d5e-5f6c-9294-9d36441001f3'::uuid,
      'ad49cf87-95b5-4839-a86a-a9a7c5b3406e'::uuid,
      '511536d4-b7d8-5ca9-86f9-b793cfcc5ef7'::uuid,
      'eur'
    )
  ) THEN
    RAISE EXCEPTION 'ARCTOR_STEP2_PILOT_THREE_BINDINGS_OR_UNITS_NOT_VALID';
  END IF;
END
$arctor_pilot_acceptance$;

COMMIT;

SELECT jsonb_pretty(jsonb_build_object(
  'contract','ARCTOR_COMMERCIAL_AUTO_FACT_V1',
  'writerPresent',to_regprocedure('public.arctor_write_commercial_auto_facts_v1(uuid,jsonb)') IS NOT NULL,
  'guardInstalled',position('ARCTOR_COMMERCIAL_AUTO_FACT_V1'
    IN pg_get_functiondef('public.enforce_activity_fact_actor_alignment_v2()'::regprocedure))>0
)) AS arctor_step2_sql_receipt;
