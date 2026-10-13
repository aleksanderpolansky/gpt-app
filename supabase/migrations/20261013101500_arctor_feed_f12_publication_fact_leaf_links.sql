-- ARCTor FEED F1.2 / SQL APPLY / 2026-10-13
-- Intentionally applies DDL; run only after 01_PRECHECK has returned PASS.
-- Does NOT enable auto facts and does NOT rewrite the shared GSR1D executor.
-- Atomic transaction: any exception rolls back all DDL/grants.
BEGIN;
SET LOCAL lock_timeout = '8s';
SET LOCAL statement_timeout = '90s';

DO $gate$
DECLARE v_count integer;
BEGIN
  IF to_regclass('public.message_object_relations') IS NULL
     OR to_regclass('public.activity_object_facts') IS NULL
     OR to_regclass('public.activity_events') IS NULL
     OR to_regclass('public.message_objects') IS NULL
     OR to_regclass('public.value_objects') IS NULL THEN
    RAISE EXCEPTION 'ARCTOR_FEED_F12_REQUIRED_TABLE_MISSING';
  END IF;
  IF to_regprocedure('public.arctor_feed_sync_links_for_message_f12_v1(uuid)') IS NOT NULL
    OR to_regprocedure('public.arctor_feed_fact_change_trigger_f12_v1()') IS NOT NULL
    OR to_regprocedure('public.arctor_feed_event_change_trigger_f12_v1()') IS NOT NULL
    OR to_regprocedure('public.arctor_feed_message_change_trigger_f12_v1()') IS NOT NULL THEN
    RAISE EXCEPTION 'ARCTOR_FEED_F12_FUNCTION_ALREADY_INSTALLED_STOP';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND tablename='message_object_relations'
      AND indexname='message_object_relations_value_object_target_uidx'
  ) THEN RAISE EXCEPTION 'ARCTOR_FEED_F12_UNIQUE_RELATION_INDEX_MISSING'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='public.message_object_relations'::regclass
      AND conname='message_object_relations_one_target_check'
  ) THEN RAISE EXCEPTION 'ARCTOR_FEED_F12_RELATION_CONSTRAINT_MISSING'; END IF;
  SELECT count(*) INTO v_count FROM public.activity_object_facts f
  WHERE f.activity_event_id='32aac29a-f9e6-4670-9d53-225e04459c04'::uuid
    AND f.fact_status='confirmed'
    AND f.id IN (
      '2160ef44-d47a-40e5-ac9a-94bfcbd14d88'::uuid,
      'bacdd0c8-f08d-470c-9daa-253f47e57763'::uuid,
      'e3d2f40d-84a5-4dc6-ad99-119fddaae228'::uuid
    );
  IF v_count <> 3 THEN RAISE EXCEPTION 'ARCTOR_FEED_F12_BASELINE_THREE_FACTS_NOT_PRESENT'; END IF;
  IF EXISTS (SELECT 1 FROM public.message_object_relations
     WHERE relation_code='commercial_fact_leaf') THEN
     RAISE EXCEPTION 'ARCTOR_FEED_F12_CODE_ALREADY_IN_USE_REVIEW_REQUIRED';
  END IF;
END;
$gate$;

-- Pure reconciliation of direct links for a single source publication.
-- Facts/values live ONLY in activity_object_facts. Relations store references,
-- never a copied numeric price. Keeps distinct event/offer-group identifiers.
CREATE OR REPLACE FUNCTION public.arctor_feed_sync_links_for_message_f12_v1(
  p_message_object_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_message public.message_objects%ROWTYPE;
  v_group record;
  v_leaf_ids uuid[] := ARRAY[]::uuid[];
  v_after integer := 0;
  v_changed integer := 0;
  v_removed integer := 0;
  v_meta jsonb;
BEGIN
  IF p_message_object_id IS NULL THEN
    RETURN jsonb_build_object('status','ignored_null_message');
  END IF;
  PERFORM pg_advisory_xact_lock(
    pg_catalog.hashtextextended('ARCTOR_FEED_F12:' || p_message_object_id::text, 0)
  );

  SELECT * INTO v_message
  FROM public.message_objects WHERE id=p_message_object_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status','source_message_missing');
  END IF;

  IF v_message.lifecycle_status IS DISTINCT FROM 'active'
     OR v_message.audience_scope_code IS DISTINCT FROM 'public' THEN
    DELETE FROM public.message_object_relations r
      WHERE r.message_object_id=p_message_object_id
        AND r.relation_code='commercial_fact_leaf';
    GET DIAGNOSTICS v_removed = ROW_COUNT;
    RETURN jsonb_build_object('status','source_not_active_public','removed',v_removed);
  END IF;

  FOR v_group IN
    SELECT f.value_object_id AS leaf_id,
      count(*)::integer AS confirmed_fact_count,
      jsonb_agg(
        jsonb_build_object(
          'factId',f.id::text,
          'activityEventId',e.id::text,
          'parameterDefinitionId',f.parameter_definition_id::text,
          'technicalRepresentative',
            (coalesce(f.metadata #>> '{commercialPublicV257,technicalRepresentative}','')='true'
             OR f.metadata->>'selectionRule'='deterministic_first_city_store_represents_chain_only'),
          'actualStoreAddressConfirmed',
            CASE WHEN (coalesce(f.metadata #>> '{commercialPublicV257,technicalRepresentative}','')='true'
             OR f.metadata->>'selectionRule'='deterministic_first_city_store_represents_chain_only')
            THEN false ELSE NULL END,
          'sourceEvidence','published_claim_not_independently_verified'
        ) ORDER BY e.id, f.id
      ) AS fact_refs
    FROM public.activity_events e
    JOIN public.activity_object_facts f ON f.activity_event_id=e.id
    JOIN public.value_objects vo ON vo.id=f.value_object_id
    WHERE e.source_message_object_id=p_message_object_id
      AND e.activity_context_code='commercial'
      AND e.user_id=v_message.owner_user_id
      AND f.user_id=e.user_id
      AND f.fact_status='confirmed'
      AND f.fact_role_code='source'
      AND f.parameter_definition_id IS NOT NULL
      AND f.value_object_id IS NOT NULL
      AND vo.ontology_node_role_code='leaf'
      AND vo.scope_code='global'
      AND vo.origin_type_code='system_model'
      AND vo.status='active'
      AND (
        (
          f.metadata #>> '{commercialPublicV257,contract}' = 'ARCTOR_P257_COMMERCIAL_PUBLIC_FACT_V1'
          AND f.metadata #>> '{commercialPublicV257,activityEventId}' = e.id::text
          AND f.metadata #>> '{commercialPublicV257,sourceMessageObjectId}' = p_message_object_id::text
          AND f.metadata #>> '{commercialPublicV257,targetValueObjectId}' = f.value_object_id::text
          AND f.metadata #>> '{commercialPublicV257,parameterDefinitionId}' = f.parameter_definition_id::text
          AND f.metadata #>> '{commercialPublicV257,confirmationMethod}' = 'admin_manual'
          AND f.metadata #>> '{commercialPublicV257,evidenceType}' = 'public_claim_not_independently_verified'
        )
        OR
        (
          f.metadata->>'contract'='ARCTOR_COMMERCIAL_AUTO_FACT_V1'
          AND f.metadata->>'sourceMessageObjectId'=p_message_object_id::text
          AND f.metadata->>'commercialSourceReliability'='published_claim_not_independently_verified'
        )
      )
    GROUP BY f.value_object_id
    ORDER BY f.value_object_id
  LOOP
    v_leaf_ids := array_append(v_leaf_ids, v_group.leaf_id);
    v_meta := jsonb_build_object(
      'contract','ARCTOR_FEED_FACT_LEAF_LINK_F12_V1',
      'sourceMessageObjectId',p_message_object_id::text,
      'confirmedFactCount',v_group.confirmed_fact_count,
      'factRefs',v_group.fact_refs,
      'provenance','confirmed_commercial_source_facts',
      'claimVerification','not_independently_verified'
    );
    INSERT INTO public.message_object_relations (
       id,message_object_id,relation_code,target_value_object_id,metadata_json
    ) VALUES (
       pg_catalog.gen_random_uuid(),p_message_object_id,'commercial_fact_leaf',v_group.leaf_id,v_meta
    )
    ON CONFLICT (message_object_id,relation_code,target_value_object_id)
      WHERE target_value_object_id IS NOT NULL
    DO UPDATE SET metadata_json=EXCLUDED.metadata_json
      WHERE public.message_object_relations.metadata_json IS DISTINCT FROM EXCLUDED.metadata_json;
    GET DIAGNOSTICS v_after = ROW_COUNT;
    v_changed := v_changed + v_after;
  END LOOP;

  DELETE FROM public.message_object_relations r
  WHERE r.message_object_id=p_message_object_id
    AND r.relation_code='commercial_fact_leaf'
    AND (r.target_value_object_id IS NULL
       OR NOT(r.target_value_object_id=ANY(v_leaf_ids)));
  GET DIAGNOSTICS v_removed = ROW_COUNT;
  SELECT count(*) INTO v_after FROM public.message_object_relations r
    WHERE r.message_object_id=p_message_object_id
      AND r.relation_code='commercial_fact_leaf';
  RETURN jsonb_build_object(
    'ok',true,'contract','ARCTOR_FEED_FACT_LEAF_LINK_F12_V1',
    'status','synchronized','messageObjectId',p_message_object_id,
    'linkedLeaves',v_after,'changed',v_changed,'removed',v_removed
  );
END;
$function$;

-- Lock down the explicit RPC. Trigger invocations use function ownership.
REVOKE ALL ON FUNCTION public.arctor_feed_sync_links_for_message_f12_v1(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.arctor_feed_sync_links_for_message_f12_v1(uuid)
  TO service_role;

-- Fact changes are reconciled within the SAME DB transaction that writes facts.
CREATE OR REPLACE FUNCTION public.arctor_feed_fact_change_trigger_f12_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_msg uuid;
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN
    SELECT e.source_message_object_id INTO v_msg
      FROM public.activity_events e
      WHERE e.id=OLD.activity_event_id AND e.activity_context_code='commercial';
    IF v_msg IS NOT NULL THEN
      PERFORM public.arctor_feed_sync_links_for_message_f12_v1(v_msg);
    END IF;
  END IF;
  IF TG_OP IN ('INSERT','UPDATE') THEN
    SELECT e.source_message_object_id INTO v_msg
      FROM public.activity_events e
      WHERE e.id=NEW.activity_event_id AND e.activity_context_code='commercial';
    IF v_msg IS NOT NULL THEN
      PERFORM public.arctor_feed_sync_links_for_message_f12_v1(v_msg);
    END IF;
  END IF;
  RETURN NULL;
END;
$function$;
REVOKE ALL ON FUNCTION public.arctor_feed_fact_change_trigger_f12_v1()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS arctor_feed_fact_change_f12_trg ON public.activity_object_facts;
CREATE TRIGGER arctor_feed_fact_change_f12_trg
AFTER INSERT OR DELETE OR UPDATE OF
  fact_status,value_object_id,metadata,activity_event_id,
  parameter_definition_id,unit,value_numeric,value_text,value_boolean
ON public.activity_object_facts
FOR EACH ROW EXECUTE FUNCTION public.arctor_feed_fact_change_trigger_f12_v1();

-- Event reassignment/removal must not leave stale links on the former post.
CREATE OR REPLACE FUNCTION public.arctor_feed_event_change_trigger_f12_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF TG_OP IN ('DELETE','UPDATE') AND OLD.source_message_object_id IS NOT NULL THEN
    PERFORM public.arctor_feed_sync_links_for_message_f12_v1(OLD.source_message_object_id);
  END IF;
  IF TG_OP='UPDATE' AND NEW.source_message_object_id IS NOT NULL
     AND (NEW.source_message_object_id IS DISTINCT FROM OLD.source_message_object_id
       OR NEW.activity_context_code IS DISTINCT FROM OLD.activity_context_code) THEN
    PERFORM public.arctor_feed_sync_links_for_message_f12_v1(NEW.source_message_object_id);
  END IF;
  RETURN NULL;
END;
$function$;
REVOKE ALL ON FUNCTION public.arctor_feed_event_change_trigger_f12_v1()
  FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS arctor_feed_event_change_f12_trg ON public.activity_events;
CREATE TRIGGER arctor_feed_event_change_f12_trg
AFTER DELETE OR UPDATE OF source_message_object_id,activity_context_code
ON public.activity_events
FOR EACH ROW EXECUTE FUNCTION public.arctor_feed_event_change_trigger_f12_v1();

-- Hidden, restored, or reclassified posts must recompute derived links.
CREATE OR REPLACE FUNCTION public.arctor_feed_message_change_trigger_f12_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  PERFORM public.arctor_feed_sync_links_for_message_f12_v1(NEW.id);
  RETURN NULL;
END;
$function$;
REVOKE ALL ON FUNCTION public.arctor_feed_message_change_trigger_f12_v1()
  FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS arctor_feed_message_change_f12_trg ON public.message_objects;
CREATE TRIGGER arctor_feed_message_change_f12_trg
AFTER UPDATE OF lifecycle_status,audience_scope_code,owner_user_id
ON public.message_objects
FOR EACH ROW EXECUTE FUNCTION public.arctor_feed_message_change_trigger_f12_v1();

-- F1.1 SECURITY FINDING: the unguarded commercial writer was directly callable
-- by 'authenticated', bypassing the explicit OFF switch of the guarded writer.
-- All known server callers use arctor_write_commercial_auto_facts_guarded_p1_v1.
-- The owner / SECURITY DEFINER guarded function can still call this function.
REVOKE EXECUTE ON FUNCTION public.arctor_write_commercial_auto_facts_v1(uuid,jsonb)
  FROM PUBLIC, anon, authenticated;

COMMIT;
