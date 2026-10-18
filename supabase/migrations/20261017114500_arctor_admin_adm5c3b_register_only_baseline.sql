-- ARCTor ADM-5C.3B | MANUAL SCHEMA V1 | 2026-10-17
-- STOP unless 00_PRECHECK is entirely PASS and the administrator explicitly approves installation.
-- Controlled scope: registers NON-EXECUTABLE intents; does not authorize, queue or call AI.
-- No existing ADM-4/ADM-5B/AI Billing tables/functions/flags are changed.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
DO $check$
BEGIN
 IF to_regclass('public.arctor_admin_cases_adm2_v1') IS NULL
    OR to_regclass('public.arctor_admin_assignments_adm2_v1') IS NULL
    OR to_regclass('public.arctor_admin_roles_adm2_v1') IS NULL
    OR to_regclass('public.arctor_admin_context_snapshots_adm5b3_v1') IS NULL
    OR to_regclass('public.arctor_admin_context_snapshot_events_adm5b3_v1') IS NULL
    OR to_regclass('public.app_users') IS NULL
    OR to_regclass('public.platform_admins') IS NULL
    OR to_regclass('public.ai_credit_wallets') IS NULL
    OR to_regclass('public.ai_credit_ledger') IS NULL
    OR to_regclass('public.ai_usage_events') IS NULL
    OR to_regclass('public.arctor_admin_ai_attempts_adm5c3b_v1') IS NOT NULL
    OR to_regclass('public.arctor_admin_ai_attempt_events_adm5c3b_v1') IS NOT NULL
    OR to_regprocedure('pg_catalog.sha256(bytea)') IS NULL
    OR to_regprocedure('public.arctor_admin_ai_attempt_register_adm5c3b_v1(uuid,uuid,uuid,uuid,uuid,text,text)') IS NOT NULL
    OR to_regprocedure('public.arctor_admin_ai_attempts_no_mutation_adm5c3b_v1()') IS NOT NULL
    OR to_regclass('public.adm5b3_one_review_per_snapshot_uidx') IS NULL
    OR (SELECT count(*) FROM public.arctor_admin_roles_adm2_v1 WHERE agent_execution_enabled) <> 0
    OR (SELECT count(*) FROM public.arctor_admin_roles_adm2_v1) <> 8
 THEN RAISE EXCEPTION 'ADM5C3B_STOP_SCHEMA_OR_AGENT_FLAGS'; END IF;
END $check$;

CREATE TABLE public.arctor_admin_ai_attempts_adm5c3b_v1 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 operation_id uuid NOT NULL UNIQUE,
 case_id uuid NOT NULL REFERENCES public.arctor_admin_cases_adm2_v1(id) ON DELETE RESTRICT,
 case_code text NOT NULL CHECK (case_code ~ '^[A-Z][A-Z0-9]{1,9}-[0-9]{3,6}$'),
 assignment_id uuid NOT NULL,
 role_code text NOT NULL REFERENCES public.arctor_admin_roles_adm2_v1(role_code),
 task_code text NOT NULL CHECK (task_code ~ '^[a-z][a-z0-9_]{2,90}$'),
 snapshot_id uuid NOT NULL REFERENCES public.arctor_admin_context_snapshots_adm5b3_v1(id) ON DELETE RESTRICT,
 snapshot_version integer NOT NULL CHECK (snapshot_version BETWEEN 1 AND 1000000),
 manifest_digest text NOT NULL CHECK (manifest_digest ~ '^[a-f0-9]{64}$'),
 snapshot_digest text NOT NULL CHECK (snapshot_digest ~ '^[a-f0-9]{64}$'),
 intent_fingerprint text NOT NULL CHECK (intent_fingerprint ~ '^[a-f0-9]{64}$'),
 attempt_ordinal integer NOT NULL CHECK (attempt_ordinal BETWEEN 1 AND 1000000),
 state text NOT NULL DEFAULT 'awaiting_preflight' CHECK (state='awaiting_preflight'),
 created_by_app_user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(),
 agent_execution_permitted boolean NOT NULL DEFAULT false CHECK (agent_execution_permitted=false),
 outbound_authorized boolean NOT NULL DEFAULT false CHECK (outbound_authorized=false),
 budget_reserved boolean NOT NULL DEFAULT false CHECK (budget_reserved=false),
 CONSTRAINT adm5c3b_assignment_case_pair FOREIGN KEY (assignment_id,case_id)
   REFERENCES public.arctor_admin_assignments_adm2_v1(id,case_id) ON DELETE RESTRICT,
 CONSTRAINT adm5c3b_one_intent_per_snapshot UNIQUE (assignment_id,task_code,snapshot_id),
 CONSTRAINT adm5c3b_attempt_ordinal_unique UNIQUE (assignment_id,task_code,attempt_ordinal)
);
CREATE INDEX adm5c3b_attempt_case_created_idx
 ON public.arctor_admin_ai_attempts_adm5c3b_v1 (case_id,created_at DESC,id);
CREATE INDEX adm5c3b_attempt_assignment_idx
 ON public.arctor_admin_ai_attempts_adm5c3b_v1 (assignment_id,task_code,attempt_ordinal DESC);

CREATE TABLE public.arctor_admin_ai_attempt_events_adm5c3b_v1 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 attempt_id uuid NOT NULL REFERENCES public.arctor_admin_ai_attempts_adm5c3b_v1(id) ON DELETE RESTRICT,
 operation_id uuid NOT NULL UNIQUE,
 kind text NOT NULL CHECK (kind='registered'),
 actor_app_user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
 details_json jsonb NOT NULL DEFAULT '{}'::jsonb
   CHECK (jsonb_typeof(details_json)='object' AND octet_length(details_json::text) <= 8192),
 occurred_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT adm5c3b_single_registration_event UNIQUE (attempt_id,kind)
);
CREATE INDEX adm5c3b_attempt_event_history_idx
 ON public.arctor_admin_ai_attempt_events_adm5c3b_v1 (attempt_id,occurred_at,id);

ALTER TABLE public.arctor_admin_ai_attempts_adm5c3b_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arctor_admin_ai_attempt_events_adm5c3b_v1 ENABLE ROW LEVEL SECURITY;
-- No browser policy. Only the server-side service-role may read/register; no direct update/delete.
REVOKE ALL ON public.arctor_admin_ai_attempts_adm5c3b_v1,
 public.arctor_admin_ai_attempt_events_adm5c3b_v1 FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT ON public.arctor_admin_ai_attempts_adm5c3b_v1,
 public.arctor_admin_ai_attempt_events_adm5c3b_v1 TO service_role;

CREATE FUNCTION public.arctor_admin_ai_attempts_no_mutation_adm5c3b_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $guard$
BEGIN
 RAISE EXCEPTION 'ADM5C3B_APPEND_ONLY_NO_MUTATION' USING ERRCODE='42501';
END $guard$;
CREATE TRIGGER adm5c3b_attempts_immutable_rows
 BEFORE UPDATE OR DELETE ON public.arctor_admin_ai_attempts_adm5c3b_v1
 FOR EACH ROW EXECUTE FUNCTION public.arctor_admin_ai_attempts_no_mutation_adm5c3b_v1();
CREATE TRIGGER adm5c3b_attempts_no_truncate
 BEFORE TRUNCATE ON public.arctor_admin_ai_attempts_adm5c3b_v1
 FOR EACH STATEMENT EXECUTE FUNCTION public.arctor_admin_ai_attempts_no_mutation_adm5c3b_v1();
CREATE TRIGGER adm5c3b_events_immutable_rows
 BEFORE UPDATE OR DELETE ON public.arctor_admin_ai_attempt_events_adm5c3b_v1
 FOR EACH ROW EXECUTE FUNCTION public.arctor_admin_ai_attempts_no_mutation_adm5c3b_v1();
CREATE TRIGGER adm5c3b_events_no_truncate
 BEFORE TRUNCATE ON public.arctor_admin_ai_attempt_events_adm5c3b_v1
 FOR EACH STATEMENT EXECUTE FUNCTION public.arctor_admin_ai_attempts_no_mutation_adm5c3b_v1();

-- This RPC creates a reviewable registry record ONLY. It cannot change flags, reserve funds,
-- invoke a model, authorize outbound context or transition an attempt to a runnable state.
CREATE FUNCTION public.arctor_admin_ai_attempt_register_adm5c3b_v1(
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
   AND manifest_digest=p_expected_manifest_digest FOR SHARE;
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
REVOKE ALL ON FUNCTION public.arctor_admin_ai_attempts_no_mutation_adm5c3b_v1()
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.arctor_admin_ai_attempt_register_adm5c3b_v1(uuid,uuid,uuid,uuid,uuid,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.arctor_admin_ai_attempt_register_adm5c3b_v1(uuid,uuid,uuid,uuid,uuid,text,text)
 TO service_role;
COMMIT;
