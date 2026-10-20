-- ARCTor AI Governance MVP 2 / draft RPC trigger compatibility fix.
-- Purpose: replace only public.arctor_ai_governance_draft_save_v1, preserving
-- existing P4A triggers, grants, RLS, immutable history and API signature.
-- The BEFORE trigger owns revision numbers. The AFTER trigger owns the single
-- immutable history INSERT (as SECURITY DEFINER).
-- No new tables, no test data writes, no AI, no wallet operations.
-- Run once in ARCTor Supabase SQL Editor under the usual SQL Editor role.

BEGIN;

DO $preflight$
DECLARE
  v_base regclass := to_regclass('public.ai_processing_instruction_sets');
  v_history regclass := to_regclass('public.ai_processing_instruction_revisions');
BEGIN
  IF v_base IS NULL OR v_history IS NULL THEN
    RAISE EXCEPTION 'MVP2_FIX_STOP: required table is missing';
  END IF;

  IF to_regprocedure('public.arctor_ai_governance_draft_save_v1(text,text,text,integer,uuid,text)') IS NULL THEN
    RAISE EXCEPTION 'MVP2_FIX_STOP: original RPC signature was not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    WHERE t.tgrelid = v_base
      AND t.tgname = 'trg_ai_processing_instruction_set_prepare_p4a'
      AND t.tgenabled IN ('O','A')
      AND t.tgfoid = to_regprocedure('public.prepare_ai_processing_instruction_set_p4a()')
  ) THEN
    RAISE EXCEPTION 'MVP2_FIX_STOP: P4A BEFORE revision trigger missing or disabled';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    WHERE t.tgrelid = v_base
      AND t.tgname = 'trg_ai_processing_instruction_revision_append_p4a'
      AND t.tgenabled IN ('O','A')
      AND t.tgfoid = to_regprocedure('public.append_ai_processing_instruction_revision_p4a()')
  ) THEN
    RAISE EXCEPTION 'MVP2_FIX_STOP: P4A AFTER history trigger missing or disabled';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
    WHERE a.attrelid = v_history AND a.attname = 'id'
  ) THEN
    RAISE EXCEPTION 'MVP2_FIX_STOP: history id has no DEFAULT; existing P4A trigger needs one';
  END IF;

  IF NOT (
    has_table_privilege('service_role', v_base, 'SELECT')
    AND has_table_privilege('service_role', v_base, 'INSERT')
    AND has_table_privilege('service_role', v_base, 'UPDATE')
    AND has_table_privilege('service_role', v_history, 'SELECT')
  ) THEN
    RAISE EXCEPTION 'MVP2_FIX_STOP: required service_role privileges are missing';
  END IF;

  RAISE NOTICE 'MVP2_TRIGGER_COMPAT_PREFLIGHT_PASS';
END;
$preflight$;

CREATE OR REPLACE FUNCTION public.arctor_ai_governance_draft_save_v1(
  p_rule_code text,
  p_locale_code text,
  p_document text,
  p_expected_revision integer,
  p_changed_by_app_user_id uuid,
  p_action text
) RETURNS TABLE(saved_id uuid, saved_revision integer)
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public, pg_temp
AS $governance_rpc$
DECLARE
  v_storage_code text;
  v_existing_id uuid;
  v_revision integer;
  v_status text;
  v_saved_revision integer;
  v_existing_document text;
  v_document jsonb;
  v_history_count bigint;
BEGIN
  IF p_rule_code IS NULL OR p_rule_code !~ '^[a-z][a-z0-9_]{2,48}$'
     OR p_locale_code IS NULL OR p_locale_code NOT IN ('ru','pl','uk','en','de','es','cs')
     OR COALESCE(p_action,'') NOT IN ('save','restore')
     OR p_expected_revision IS NULL OR p_expected_revision < 0 OR p_expected_revision > 1000000
     OR p_changed_by_app_user_id IS NULL
     OR p_document IS NULL OR length(p_document) > 40000
  THEN
    RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='GOVERNANCE_DRAFT_INPUT_INVALID';
  END IF;

  v_storage_code := 'governance_draft__' || p_rule_code;
  v_document := p_document::jsonb;

  IF jsonb_typeof(v_document) IS DISTINCT FROM 'object'
     OR v_document->>'version' IS DISTINCT FROM 'ai_governance_rule_draft_v1'
     OR v_document->>'locale' IS DISTINCT FROM p_locale_code
     OR COALESCE(v_document->>'kind','') NOT IN ('activity_phrase','publication_price_marker')
     OR COALESCE(v_document->>'ownerScope','') NOT IN ('platform','personal')
     OR COALESCE(v_document->>'inputMode','') NOT IN ('voice_command','text_activity','feed_post')
     OR COALESCE(v_document->>'matchMode','') NOT IN ('exact_phrase','contains_phrase')
     OR jsonb_typeof(v_document->'phrase') IS DISTINCT FROM 'string'
     OR jsonb_typeof(v_document->'proposedOutput') IS DISTINCT FROM 'string'
  THEN
    RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='GOVERNANCE_DRAFT_DOCUMENT_INVALID';
  END IF;

  -- Serialize concurrent saves to the same draft + locale.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_storage_code || ':' || p_locale_code, 0));

  SELECT s.id, s.current_revision, s.status, s.current_instruction_text
    INTO v_existing_id, v_revision, v_status, v_existing_document
  FROM public.ai_processing_instruction_sets s
  WHERE s.instruction_code = v_storage_code AND s.locale_code = p_locale_code
  FOR UPDATE;

  IF v_existing_id IS NULL THEN
    IF p_expected_revision <> 0 OR p_action <> 'save' THEN
      RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='GOVERNANCE_DRAFT_REVISION_CONFLICT';
    END IF;

    v_existing_id := gen_random_uuid();
    INSERT INTO public.ai_processing_instruction_sets (
      id, instruction_code, locale_code, purpose_text, current_revision,
      current_instruction_text, status, updated_by_app_user_id, created_at, updated_at
    ) VALUES (
      v_existing_id, v_storage_code, p_locale_code,
      'governance_draft_simulation_only', 1, p_document, 'inactive',
      p_changed_by_app_user_id, now(), now()
    ) RETURNING current_revision INTO v_saved_revision;

  ELSE
    IF v_status <> 'inactive' OR p_expected_revision <> v_revision THEN
      RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='GOVERNANCE_DRAFT_REVISION_CONFLICT';
    END IF;

    -- P4A increments the revision ONLY when text changes. Never invent
    -- a revision when the submitted document is byte-identical.
    IF v_existing_document IS NOT DISTINCT FROM p_document THEN
      RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='GOVERNANCE_DRAFT_UNCHANGED';
    END IF;

    UPDATE public.ai_processing_instruction_sets
      SET current_instruction_text = p_document,
          purpose_text = 'governance_draft_simulation_only',
          status = 'inactive',
          updated_by_app_user_id = p_changed_by_app_user_id
    WHERE id = v_existing_id
    RETURNING current_revision INTO v_saved_revision;
  END IF;

  -- IMPORTANT: Do not INSERT into ai_processing_instruction_revisions.
  -- trg_ai_processing_instruction_revision_append_p4a already does so once
  -- per changed set, under its SECURITY DEFINER privileges.
  SELECT count(*) INTO v_history_count
  FROM public.ai_processing_instruction_revisions r
  WHERE r.instruction_set_id = v_existing_id
    AND r.revision = v_saved_revision
    AND r.instruction_text = p_document;

  IF v_history_count <> 1 THEN
    RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='GOVERNANCE_DRAFT_HISTORY_INTEGRITY_FAILED';
  END IF;

  RETURN QUERY SELECT v_existing_id, v_saved_revision;
END;
$governance_rpc$;

-- Maintain existing administrative execution boundary exactly.
REVOKE ALL ON FUNCTION public.arctor_ai_governance_draft_save_v1(text,text,text,integer,uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.arctor_ai_governance_draft_save_v1(text,text,text,integer,uuid,text) FROM anon;
REVOKE ALL ON FUNCTION public.arctor_ai_governance_draft_save_v1(text,text,text,integer,uuid,text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.arctor_ai_governance_draft_save_v1(text,text,text,integer,uuid,text) TO service_role;

COMMIT;

-- Ask PostgREST to refresh its schema cache (no data mutation).
NOTIFY pgrst, 'reload schema';

-- Read-only postcheck. No draft is created by this script.
SELECT
  p.proname,
  NOT p.prosecdef AS security_invoker,
  has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
  has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute,
  has_function_privilege('service_role',p.oid,'EXECUTE') AS service_role_execute,
  position('GOVERNANCE_DRAFT_HISTORY_INTEGRITY_FAILED' in p.prosrc) > 0 AS trigger_history_guard_present,
  position('INSERT INTO public.ai_processing_instruction_revisions' in p.prosrc) = 0 AS no_manual_history_insert
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'arctor_ai_governance_draft_save_v1';
