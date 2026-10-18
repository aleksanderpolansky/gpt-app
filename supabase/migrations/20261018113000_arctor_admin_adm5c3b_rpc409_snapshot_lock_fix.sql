-- ARCTor ADM-5C.3B source synchronization: RPC409 fix ONLY.
-- This file does NOT create the ADM-5C.3B attempt/event tables or append-only triggers.
-- IMPORTANT: the baseline migration for those objects is still missing in Git.
-- Version control staging only: DO NOT execute on Supabase in the current step.
-- Must not be run as a replacement for the missing baseline on a new database.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $adm5c3b_sync_pre$
DECLARE
 v_oid oid;
 v_definition text;
 v_share_count integer;
BEGIN
 v_oid := pg_catalog.to_regprocedure('public.arctor_admin_ai_attempt_register_adm5c3b_v1(uuid,uuid,uuid,uuid,uuid,text,text)');
 IF v_oid IS NULL THEN
   RAISE EXCEPTION 'ADM5C3B_SYNC_STOP_BASELINE_RPC_MISSING';
 END IF;
 IF pg_catalog.to_regclass('public.arctor_admin_ai_attempts_adm5c3b_v1') IS NULL
    OR pg_catalog.to_regclass('public.arctor_admin_ai_attempt_events_adm5c3b_v1') IS NULL
    OR pg_catalog.to_regclass('public.arctor_admin_context_snapshots_adm5b3_v1') IS NULL
 THEN RAISE EXCEPTION 'ADM5C3B_SYNC_STOP_BASELINE_TABLE_MISSING'; END IF;
 IF EXISTS (SELECT 1 FROM public.arctor_admin_roles_adm2_v1 WHERE agent_execution_enabled)
 THEN RAISE EXCEPTION 'ADM5C3B_SYNC_STOP_AGENT_ENABLED'; END IF;
 IF (SELECT prosecdef FROM pg_catalog.pg_proc WHERE oid = v_oid)
 THEN RAISE EXCEPTION 'ADM5C3B_SYNC_STOP_SECURITY_DEFINER_DRIFT'; END IF;
 IF NOT pg_catalog.has_function_privilege('service_role', v_oid, 'EXECUTE')
     OR pg_catalog.has_function_privilege('authenticated', v_oid, 'EXECUTE')
 THEN RAISE EXCEPTION 'ADM5C3B_SYNC_STOP_RPC_ACL_DRIFT'; END IF;
 IF pg_catalog.has_any_column_privilege('service_role',
     'public.arctor_admin_context_snapshots_adm5b3_v1','UPDATE')
 THEN RAISE EXCEPTION 'ADM5C3B_SYNC_STOP_SNAPSHOT_ACL_DRIFT'; END IF;
 SELECT pg_catalog.pg_get_functiondef(v_oid) INTO v_definition;
 v_share_count := pg_catalog.regexp_count(v_definition, 'FOR SHARE;');
 IF v_share_count NOT IN (2,3)
    OR pg_catalog.strpos(v_definition, 'WHERE id=p_case_id FOR SHARE;') = 0
    OR pg_catalog.strpos(v_definition, 'AND case_id=p_case_id FOR SHARE;') = 0
 THEN RAISE EXCEPTION 'ADM5C3B_SYNC_STOP_UNEXPECTED_LOCK_LAYOUT'; END IF;
 IF v_share_count=3 AND pg_catalog.strpos(v_definition,
       'AND manifest_digest=p_expected_manifest_digest FOR SHARE;')=0
 THEN RAISE EXCEPTION 'ADM5C3B_SYNC_STOP_UNEXPECTED_OLD_SNAPSHOT_LOCK'; END IF;
 IF v_share_count=2 AND pg_catalog.strpos(v_definition,
       'AND manifest_digest=p_expected_manifest_digest ;')=0
 THEN RAISE EXCEPTION 'ADM5C3B_SYNC_STOP_UNEXPECTED_FIXED_SNAPSHOT_LOCK'; END IF;
 IF pg_catalog.strpos(v_definition, 'ADM5C3B_INTERNAL_REVIEW_MISSING')=0
    OR pg_catalog.strpos(v_definition, 'ADM5C3B_FINGERPRINT_CONFLICT')=0
    OR pg_catalog.strpos(v_definition, pg_catalog.chr(39)||'registered'||pg_catalog.chr(39))=0
 THEN RAISE EXCEPTION 'ADM5C3B_SYNC_STOP_FUNCTION_CONTRACT_DRIFT'; END IF;
END $adm5c3b_sync_pre$;

-- The following CREATE OR REPLACE FUNCTION body is byte-for-byte identical
-- to the human-approved successful RPC409 fix of 2026-10-18.
-- It deliberately does not contain FOR SHARE on the immutable snapshot.
CREATE OR REPLACE FUNCTION public.arctor_admin_ai_attempt_register_adm5c3b_v1(
 p_actor_app_user_id uuid, p_operation_id uuid, p_case_id uuid,
 p_assignment_id uuid, p_snapshot_id uuid, p_task_code text, p_expected_manifest_digest text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
DECLARE
 v_case public.arctor_admin_cases_adm2_v1%ROWTYPE;
 v_assignment public.arctor_admin_assignments_adm2_v1%ROWTYPE;
 v_snapshot public.arctor_admin_context_snapshots_adm5b3_v1%ROWTYPE;
 v_old public.arctor_admin_ai_attempts_adm5c3b_v1%ROWTYPE;
 v_record_id uuid;
 v_num integer;
 v_fingerprint text;
BEGIN
 IF p_actor_app_user_id IS NULL OR p_operation_id IS NULL OR p_case_id IS NULL
    OR p_assignment_id IS NULL OR p_snapshot_id IS NULL
    OR p_task_code IS NULL OR p_task_code !~ '^[a-z][a-z0-9_]{2,90}$'
    OR p_expected_manifest_digest IS NULL OR p_expected_manifest_digest !~ '^[a-f0-9]{64}$'
 THEN RAISE EXCEPTION 'ADM5C3B_INVALID_ARGUMENTS' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.platform_admins
    WHERE app_user_id=p_actor_app_user_id AND role IN ('owner','admin') AND status='active')
 THEN RAISE EXCEPTION 'ADM5C3B_ACTIVE_ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
 IF EXISTS (SELECT 1 FROM public.arctor_admin_roles_adm2_v1 WHERE agent_execution_enabled)
 THEN RAISE EXCEPTION 'ADM5C3B_AGENT_FLAG_CHANGED' USING ERRCODE='42501'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_assignment_id::text||'|'||p_task_code,0));

 -- The operation key is idempotent; incompatible replay is not allowed.
 SELECT * INTO v_old FROM public.arctor_admin_ai_attempts_adm5c3b_v1
 WHERE operation_id=p_operation_id;
 IF FOUND THEN
   IF v_old.created_by_app_user_id IS DISTINCT FROM p_actor_app_user_id
      OR v_old.case_id IS DISTINCT FROM p_case_id
      OR v_old.assignment_id IS DISTINCT FROM p_assignment_id
      OR v_old.snapshot_id IS DISTINCT FROM p_snapshot_id
      OR v_old.task_code IS DISTINCT FROM p_task_code
      OR v_old.manifest_digest IS DISTINCT FROM p_expected_manifest_digest
   THEN RAISE EXCEPTION 'ADM5C3B_OPERATION_ID_REUSE_CONFLICT' USING ERRCODE='23505'; END IF;
   RETURN jsonb_build_object('contract','ARCTOR_ADM5C3B_REGISTER_ONLY_V1',
      'attemptId',v_old.id,'state',v_old.state,'idempotentReplay',true,
      'agentExecutionPermitted',false,'outboundAuthorized',false,'budgetReserved',false);
 END IF;

 SELECT * INTO v_case FROM public.arctor_admin_cases_adm2_v1
 WHERE id=p_case_id FOR SHARE;
 IF NOT FOUND OR v_case.status IN ('resolved','closed','cancelled')
 THEN RAISE EXCEPTION 'ADM5C3B_CASE_NOT_ACTIVE' USING ERRCODE='22023'; END IF;
 SELECT * INTO v_assignment FROM public.arctor_admin_assignments_adm2_v1
 WHERE id=p_assignment_id AND case_id=p_case_id FOR SHARE;
 IF NOT FOUND OR v_assignment.status IN ('completed','declined','cancelled')
    OR v_assignment.recipient_agent_code IS NOT NULL
 THEN RAISE EXCEPTION 'ADM5C3B_ASSIGNMENT_NOT_ELIGIBLE' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.arctor_admin_roles_adm2_v1
      WHERE role_code=v_assignment.recipient_role_code AND is_active AND NOT agent_execution_enabled)
 THEN RAISE EXCEPTION 'ADM5C3B_ROLE_NOT_ELIGIBLE' USING ERRCODE='22023'; END IF;
 SELECT * INTO v_snapshot FROM public.arctor_admin_context_snapshots_adm5b3_v1
 WHERE id=p_snapshot_id AND case_id=p_case_id AND assignment_id=p_assignment_id
   AND role_code=v_assignment.recipient_role_code AND task_code=p_task_code
   AND manifest_digest=p_expected_manifest_digest ;
 IF NOT FOUND THEN RAISE EXCEPTION 'ADM5C3B_SNAPSHOT_IDENTITY_MISMATCH' USING ERRCODE='22023'; END IF;
 IF encode(pg_catalog.sha256(pg_catalog.convert_to(v_snapshot.snapshot_text,'UTF8')),'hex')
    IS DISTINCT FROM v_snapshot.snapshot_digest
 THEN RAISE EXCEPTION 'ADM5C3B_SNAPSHOT_HASH_CHANGED' USING ERRCODE='22023'; END IF;
 IF EXISTS (SELECT 1 FROM public.arctor_admin_context_snapshots_adm5b3_v1
     WHERE assignment_id=p_assignment_id AND task_code=p_task_code
       AND version_num>v_snapshot.version_num)
 THEN RAISE EXCEPTION 'ADM5C3B_SNAPSHOT_SUPERSEDED' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.arctor_admin_context_snapshot_events_adm5b3_v1
    WHERE snapshot_id=p_snapshot_id AND kind='reviewed_internal')
 THEN RAISE EXCEPTION 'ADM5C3B_INTERNAL_REVIEW_MISSING' USING ERRCODE='22023'; END IF;

 -- Server-defined fingerprint (distinct from ADM-5C.3A's UI-only candidate hash).
 v_fingerprint:=encode(pg_catalog.sha256(pg_catalog.convert_to(
   pg_catalog.jsonb_build_object('v',1,'caseId',p_case_id,'assignmentId',p_assignment_id,
      'snapshotId',p_snapshot_id,'snapshotDigest',v_snapshot.snapshot_digest,
      'manifestDigest',v_snapshot.manifest_digest,'role',v_snapshot.role_code,
      'taskCode',p_task_code)::text,'UTF8')),'hex');

 -- Different operation key, same active source candidate: return existing, never duplicate.
 SELECT * INTO v_old FROM public.arctor_admin_ai_attempts_adm5c3b_v1
 WHERE assignment_id=p_assignment_id AND task_code=p_task_code AND snapshot_id=p_snapshot_id;
 IF FOUND THEN
   IF v_old.intent_fingerprint IS DISTINCT FROM v_fingerprint
   THEN RAISE EXCEPTION 'ADM5C3B_FINGERPRINT_CONFLICT' USING ERRCODE='23505'; END IF;
   RETURN jsonb_build_object('contract','ARCTOR_ADM5C3B_REGISTER_ONLY_V1',
      'attemptId',v_old.id,'state',v_old.state,'duplicateCandidate',true,
      'agentExecutionPermitted',false,'outboundAuthorized',false,'budgetReserved',false);
 END IF;

 SELECT COALESCE(MAX(attempt_ordinal),0)+1 INTO v_num
 FROM public.arctor_admin_ai_attempts_adm5c3b_v1
 WHERE assignment_id=p_assignment_id AND task_code=p_task_code;
 INSERT INTO public.arctor_admin_ai_attempts_adm5c3b_v1
   (operation_id,case_id,case_code,assignment_id,role_code,task_code,
    snapshot_id,snapshot_version,manifest_digest,snapshot_digest,intent_fingerprint,
    attempt_ordinal,created_by_app_user_id)
 VALUES (p_operation_id,p_case_id,v_case.case_code,p_assignment_id,
    v_snapshot.role_code,p_task_code,p_snapshot_id,v_snapshot.version_num,
    v_snapshot.manifest_digest,v_snapshot.snapshot_digest,v_fingerprint,
    v_num,p_actor_app_user_id) RETURNING id INTO v_record_id;
 INSERT INTO public.arctor_admin_ai_attempt_events_adm5c3b_v1
   (attempt_id,operation_id,kind,actor_app_user_id,details_json)
 VALUES (v_record_id,p_operation_id,'registered',p_actor_app_user_id,
   pg_catalog.jsonb_build_object('contract','ARCTOR_ADM5C3B_REGISTER_ONLY_V1',
      'intentFingerprint',v_fingerprint,'snapshotVersion',v_snapshot.version_num,
      'agentExecutionPermitted',false,'outboundAuthorized',false));
 RETURN jsonb_build_object('contract','ARCTOR_ADM5C3B_REGISTER_ONLY_V1',
    'attemptId',v_record_id,'state','awaiting_preflight','idempotentReplay',false,
    'agentExecutionPermitted',false,'outboundAuthorized',false,'budgetReserved',false);
END $fn$;

DO $adm5c3b_sync_post$
DECLARE v_oid oid; v_definition text;
BEGIN
 v_oid := pg_catalog.to_regprocedure('public.arctor_admin_ai_attempt_register_adm5c3b_v1(uuid,uuid,uuid,uuid,uuid,text,text)');
 SELECT pg_catalog.pg_get_functiondef(v_oid) INTO v_definition;
 IF (SELECT prosecdef FROM pg_catalog.pg_proc WHERE oid=v_oid)
    OR pg_catalog.regexp_count(v_definition,'FOR SHARE;') <> 2
    OR v_definition ~ 'AND manifest_digest=p_expected_manifest_digest FOR SHARE;'
    OR NOT pg_catalog.has_function_privilege('service_role',v_oid,'EXECUTE')
    OR pg_catalog.has_function_privilege('authenticated',v_oid,'EXECUTE')
 THEN RAISE EXCEPTION 'ADM5C3B_SYNC_STOP_POSTCHECK_FAILED'; END IF;
END $adm5c3b_sync_post$;
COMMIT;
