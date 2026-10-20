-- ARCTor AI Governance MVP2: reuse existing tables. NO new tables, no RLS changes.
-- Run manually in Supabase SQL Editor BEFORE testing Save from the production UI.
-- Idempotent function deployment; strictly SECURITY INVOKER, callable by service_role only.
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
  v_next integer;
  v_document jsonb;
BEGIN
  IF p_rule_code IS NULL OR p_rule_code !~ '^[a-z][a-z0-9_]{2,48}$'
     OR p_locale_code IS NULL OR p_locale_code NOT IN ('ru','pl','uk','en','de','es','cs')
     OR p_action NOT IN ('save','restore')
     OR p_expected_revision IS NULL OR p_expected_revision < 0 OR p_expected_revision > 1000000
     OR p_changed_by_app_user_id IS NULL
     OR p_document IS NULL OR length(p_document) > 40000
  THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='GOVERNANCE_DRAFT_INPUT_INVALID'; END IF;
  v_storage_code := 'governance_draft__' || p_rule_code;
  v_document := p_document::jsonb;
  IF jsonb_typeof(v_document) <> 'object'
     OR v_document->>'version' IS DISTINCT FROM 'ai_governance_rule_draft_v1'
     OR v_document->>'locale' IS DISTINCT FROM p_locale_code
     OR v_document->>'kind' NOT IN ('activity_phrase','publication_price_marker')
     OR v_document->>'ownerScope' NOT IN ('platform','personal')
     OR v_document->>'inputMode' NOT IN ('voice_command','text_activity','feed_post')
     OR v_document->>'matchMode' NOT IN ('exact_phrase','contains_phrase')
     OR jsonb_typeof(v_document->'phrase') <> 'string'
     OR jsonb_typeof(v_document->'proposedOutput') <> 'string'
  THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='GOVERNANCE_DRAFT_DOCUMENT_INVALID'; END IF;
  -- Concurrency: lock a unique draft code+locale in this transaction.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_storage_code || ':' || p_locale_code, 0));
  SELECT s.id, s.current_revision, s.status
    INTO v_existing_id, v_revision, v_status
    FROM public.ai_processing_instruction_sets s
    WHERE s.instruction_code = v_storage_code AND s.locale_code = p_locale_code
    FOR UPDATE;
  IF v_existing_id IS NULL THEN
    IF p_expected_revision <> 0 THEN
      RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='GOVERNANCE_DRAFT_REVISION_CONFLICT';
    END IF;
    v_existing_id := gen_random_uuid();
    v_next := 1;
    INSERT INTO public.ai_processing_instruction_sets(
      id,instruction_code,locale_code,purpose_text,current_revision,
      current_instruction_text,status,updated_by_app_user_id,created_at,updated_at
    ) VALUES (
      v_existing_id,v_storage_code,p_locale_code,'governance_draft_simulation_only',v_next,
      p_document,'inactive',p_changed_by_app_user_id,now(),now()
    );
  ELSE
    IF v_status <> 'inactive' OR p_expected_revision <> v_revision THEN
      RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='GOVERNANCE_DRAFT_REVISION_CONFLICT';
    END IF;
    v_next := v_revision+1;
    UPDATE public.ai_processing_instruction_sets
       SET current_revision=v_next,current_instruction_text=p_document,
           purpose_text='governance_draft_simulation_only',status='inactive',
           updated_by_app_user_id=p_changed_by_app_user_id,updated_at=now()
     WHERE id=v_existing_id;
  END IF;
  -- Same transaction: either both current snapshot and history exist, or neither does.
  INSERT INTO public.ai_processing_instruction_revisions(
    id,instruction_set_id,instruction_code,locale_code,revision,
    instruction_text,change_note,changed_by_app_user_id,created_at
  ) VALUES (
    gen_random_uuid(),v_existing_id,v_storage_code,p_locale_code,v_next,
    p_document,CASE WHEN p_action='restore' THEN 'governance_draft_restore' ELSE 'governance_draft_save' END,
    p_changed_by_app_user_id,now()
  );
  RETURN QUERY SELECT v_existing_id, v_next;
END;
$governance_rpc$;

REVOKE ALL ON FUNCTION public.arctor_ai_governance_draft_save_v1(text,text,text,integer,uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.arctor_ai_governance_draft_save_v1(text,text,text,integer,uuid,text) FROM anon;
REVOKE ALL ON FUNCTION public.arctor_ai_governance_draft_save_v1(text,text,text,integer,uuid,text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.arctor_ai_governance_draft_save_v1(text,text,text,integer,uuid,text) TO service_role;

-- Read-only confirmation: should return security_invoker=true, browser_execute=false.
SELECT p.proname,
       NOT p.prosecdef AS security_invoker,
       has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute,
       has_function_privilege('service_role',p.oid,'EXECUTE') AS service_role_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname='arctor_ai_governance_draft_save_v1';

NOTIFY pgrst, 'reload schema';
