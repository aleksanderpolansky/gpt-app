-- ARCTor AI Governance MVP 2 / audit labels save vs restore.
-- Supabase SQL Editor manual installation; no deployment or AI runtime changes.
-- Adds ONE scoped BEFORE INSERT trigger on existing immutable history table.
-- Does NOT edit the P4A revision-number or append-history triggers.
-- All changes transactional. Existing historical records are NEVER modified.
-- NOTE: old v1-v4 action labels were not recorded; no historical backfill.

BEGIN;

DO $audit_preflight$
DECLARE
  v_sets regclass := to_regclass('public.ai_processing_instruction_sets');
  v_history regclass := to_regclass('public.ai_processing_instruction_revisions');
  v_current_rpc oid := to_regprocedure('public.arctor_ai_governance_draft_save_v1(text,text,text,integer,uuid,text)');
BEGIN
  IF v_sets IS NULL OR v_history IS NULL OR v_current_rpc IS NULL THEN
    RAISE EXCEPTION 'MVP2_AUDIT_STOP: required P4A tables or existing RPC missing';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = v_history AND tgname = 'trg_arctor_governance_draft_audit_note_v1'
  ) THEN
    RAISE EXCEPTION 'MVP2_AUDIT_STOP: audit trigger already exists; do not reapply';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = v_history AND attname = 'change_note'
      AND atttypid = 'pg_catalog.text'::regtype AND NOT attisdropped
  ) THEN
    RAISE EXCEPTION 'MVP2_AUDIT_STOP: history.change_note must be text';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = v_sets
      AND tgname='trg_ai_processing_instruction_set_prepare_p4a'
      AND tgenabled IN ('O','A')
      AND tgfoid=to_regprocedure('public.prepare_ai_processing_instruction_set_p4a()')
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = v_sets
      AND tgname='trg_ai_processing_instruction_revision_append_p4a'
      AND tgenabled IN ('O','A')
      AND tgfoid=to_regprocedure('public.append_ai_processing_instruction_revision_p4a()')
  ) THEN
    RAISE EXCEPTION 'MVP2_AUDIT_STOP: required P4A triggers unavailable';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = v_history
      AND tgname='trg_ai_processing_instruction_revisions_immutable_p4a'
      AND tgenabled IN ('O','A')
  ) THEN
    RAISE EXCEPTION 'MVP2_AUDIT_STOP: history immutability trigger unavailable';
  END IF;
  IF (SELECT prosecdef FROM pg_proc WHERE oid=v_current_rpc) THEN
    RAISE EXCEPTION 'MVP2_AUDIT_STOP: RPC must remain SECURITY INVOKER';
  END IF;
  IF NOT (
    has_table_privilege('service_role',v_sets,'SELECT') AND
    has_table_privilege('service_role',v_sets,'INSERT') AND
    has_table_privilege('service_role',v_sets,'UPDATE') AND
    has_table_privilege('service_role',v_history,'SELECT')
  ) THEN
    RAISE EXCEPTION 'MVP2_AUDIT_STOP: service_role grants differ';
  END IF;
  RAISE NOTICE 'MVP2_AUDIT_PREFLIGHT_PASS';
END;
$audit_preflight$;

-- PostgreSQL allows transaction-local custom settings, supplied by the
-- existing restricted admin RPC, to flow through the original P4A trigger.
-- The extra trigger changes only NEW.change_note on governance_draft__ rows,
-- and only when code + locale + next revision + action all match.
-- It never touches non-governance instruction history.
CREATE FUNCTION public.arctor_governance_draft_history_note_v1()
RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $draft_note$
DECLARE
  v_action text := current_setting('arctor.draft_audit_action', true);
BEGIN
  IF LEFT(NEW.instruction_code, 18) = 'governance_draft__'
    AND v_action IN ('save','restore')
    AND current_setting('arctor.draft_audit_code', true) = NEW.instruction_code
    AND current_setting('arctor.draft_audit_locale', true) = NEW.locale_code
    AND current_setting('arctor.draft_audit_revision', true) = NEW.revision::text
  THEN
    NEW.change_note := v_action;
  END IF;
  RETURN NEW;
END;
$draft_note$;

REVOKE ALL ON FUNCTION public.arctor_governance_draft_history_note_v1() FROM PUBLIC;

CREATE TRIGGER trg_arctor_governance_draft_audit_note_v1
BEFORE INSERT ON public.ai_processing_instruction_revisions
FOR EACH ROW
EXECUTE FUNCTION public.arctor_governance_draft_history_note_v1();

-- Keep the original six-argument RPC signature, permissions and error codes.
-- Only add audit tagging, validation of restore source, and an audit postcheck.
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

    -- The BEFORE INSERT audit trigger reads these transaction-local values.
    -- Never enable execution: only label the immutable P4A history INSERT.
    PERFORM set_config('arctor.draft_audit_action', p_action, true);
    PERFORM set_config('arctor.draft_audit_code', v_storage_code, true);
    PERFORM set_config('arctor.draft_audit_locale', p_locale_code, true);
    PERFORM set_config('arctor.draft_audit_revision', '1', true);

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

    -- A restore must correspond to an actual earlier stored revision.
    -- This prevents an arbitrary new document being falsely labelled "restore".
    IF p_action = 'restore' AND NOT EXISTS (
      SELECT 1 FROM public.ai_processing_instruction_revisions h
      WHERE h.instruction_set_id = v_existing_id
        AND h.revision < v_revision
        AND h.instruction_text::jsonb = v_document
    ) THEN
      RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='GOVERNANCE_DRAFT_RESTORE_SOURCE_NOT_FOUND';
    END IF;

    PERFORM set_config('arctor.draft_audit_action', p_action, true);
    PERFORM set_config('arctor.draft_audit_code', v_storage_code, true);
    PERFORM set_config('arctor.draft_audit_locale', p_locale_code, true);
    PERFORM set_config('arctor.draft_audit_revision', (v_revision + 1)::text, true);

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
    AND r.instruction_text = p_document
    AND r.change_note = p_action;

  IF v_history_count <> 1 THEN
    RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='GOVERNANCE_DRAFT_AUDIT_INTEGRITY_FAILED';
  END IF;

  RETURN QUERY SELECT v_existing_id, v_saved_revision;
END;
$governance_rpc$;

-- Preserve the original service_role-only execution contract.
REVOKE ALL ON FUNCTION public.arctor_ai_governance_draft_save_v1(text,text,text,integer,uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.arctor_ai_governance_draft_save_v1(text,text,text,integer,uuid,text) FROM anon;
REVOKE ALL ON FUNCTION public.arctor_ai_governance_draft_save_v1(text,text,text,integer,uuid,text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.arctor_ai_governance_draft_save_v1(text,text,text,integer,uuid,text) TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Read-only postcheck: checks installation, does not write any draft.
SELECT
  'MVP2_AUDIT_SQL_INSTALLED' AS check_name,
  EXISTS (
    SELECT 1 FROM pg_trigger t
    WHERE t.tgname = 'trg_arctor_governance_draft_audit_note_v1'
      AND t.tgrelid = 'public.ai_processing_instruction_revisions'::regclass
      AND t.tgenabled IN ('O','A')
  ) AS audit_trigger_present,
  EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.oid = to_regprocedure('public.arctor_ai_governance_draft_save_v1(text,text,text,integer,uuid,text)')
      AND NOT p.prosecdef
      AND position('GOVERNANCE_DRAFT_AUDIT_INTEGRITY_FAILED' in p.prosrc) > 0
      AND position('GOVERNANCE_DRAFT_RESTORE_SOURCE_NOT_FOUND' in p.prosrc) > 0
  ) AS audit_rpc_enabled,
  has_function_privilege('anon',
     'public.arctor_ai_governance_draft_save_v1(text,text,text,integer,uuid,text)'::regprocedure,'EXECUTE') AS anon_execute,
  has_function_privilege('authenticated',
     'public.arctor_ai_governance_draft_save_v1(text,text,text,integer,uuid,text)'::regprocedure,'EXECUTE') AS authenticated_execute,
  has_function_privilege('service_role',
     'public.arctor_ai_governance_draft_save_v1(text,text,text,integer,uuid,text)'::regprocedure,'EXECUTE') AS service_role_execute;
