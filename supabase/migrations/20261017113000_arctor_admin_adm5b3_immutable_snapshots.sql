-- ARCTOR ADM-5B.3 | MANUAL SQL MIGRATION V1
-- ONLY after precheck PASS_READY_FOR_MANUAL_SQL and operator approval.
-- Transactional. Creates separate append-only evidence tables + service-only RPCs.
-- No changes to ADM-4 tables/functions, role flags, or AI runtime.
BEGIN;
DO $check$
BEGIN
 IF to_regclass('public.arctor_admin_cases_adm2_v1') IS NULL
    OR to_regclass('public.arctor_admin_assignments_adm2_v1') IS NULL
    OR to_regclass('public.app_users') IS NULL OR to_regclass('public.platform_admins') IS NULL
    OR to_regclass('public.arctor_admin_context_snapshots_adm5b3_v1') IS NOT NULL
    OR to_regclass('public.arctor_admin_context_snapshot_events_adm5b3_v1') IS NOT NULL
    OR to_regprocedure('pg_catalog.sha256(bytea)') IS NULL
    OR (SELECT count(*) FROM public.arctor_admin_roles_adm2_v1 WHERE agent_execution_enabled) <> 0
 THEN RAISE EXCEPTION 'ADM5B3_STOP_PREREQUISITES'; END IF;
END $check$;

CREATE TABLE public.arctor_admin_context_snapshots_adm5b3_v1 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 case_id uuid NOT NULL REFERENCES public.arctor_admin_cases_adm2_v1(id) ON DELETE RESTRICT,
 assignment_id uuid NOT NULL,
 role_code text NOT NULL REFERENCES public.arctor_admin_roles_adm2_v1(role_code),
 task_code text NOT NULL CHECK (task_code ~ '^[a-z][a-z0-9_]{2,90}$'),
 version_num integer NOT NULL CHECK (version_num BETWEEN 1 AND 1000000),
 manifest_digest text NOT NULL CHECK (manifest_digest ~ '^[a-f0-9]{64}$'),
 snapshot_digest text NOT NULL CHECK (snapshot_digest ~ '^[a-f0-9]{64}$'),
 snapshot_text text NOT NULL CHECK (octet_length(snapshot_text) BETWEEN 10 AND 32000),
 captured_by_app_user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
 captured_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT adm5b3_assignment_case_pair_fk FOREIGN KEY (assignment_id,case_id)
  REFERENCES public.arctor_admin_assignments_adm2_v1(id,case_id) ON DELETE RESTRICT,
 CONSTRAINT adm5b3_version_uniq UNIQUE(assignment_id,task_code,version_num),
 CONSTRAINT adm5b3_manifest_uniq UNIQUE(assignment_id,task_code,manifest_digest)
);
CREATE INDEX adm5b3_snapshot_case_idx ON public.arctor_admin_context_snapshots_adm5b3_v1(case_id,assignment_id,version_num DESC);
CREATE TABLE public.arctor_admin_context_snapshot_events_adm5b3_v1 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 snapshot_id uuid NOT NULL REFERENCES public.arctor_admin_context_snapshots_adm5b3_v1(id) ON DELETE RESTRICT,
 operation_id uuid NOT NULL UNIQUE,
 kind text NOT NULL CHECK (kind IN ('captured','reviewed_internal','rejected')),
 reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 10 AND 1000),
 actor_app_user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
 event_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX adm5b3_one_review_per_snapshot_uidx
 ON public.arctor_admin_context_snapshot_events_adm5b3_v1(snapshot_id)
 WHERE kind IN ('reviewed_internal','rejected');
CREATE INDEX adm5b3_events_snapshot_idx ON public.arctor_admin_context_snapshot_events_adm5b3_v1(snapshot_id,event_at);

ALTER TABLE public.arctor_admin_context_snapshots_adm5b3_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arctor_admin_context_snapshot_events_adm5b3_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.arctor_admin_context_snapshots_adm5b3_v1,
 public.arctor_admin_context_snapshot_events_adm5b3_v1 FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT ON public.arctor_admin_context_snapshots_adm5b3_v1,
 public.arctor_admin_context_snapshot_events_adm5b3_v1 TO service_role;

-- Append-only even if somebody accidentally grants UPDATE/DELETE later.
CREATE FUNCTION public.arctor_admin_context_immutable_adm5b3_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
BEGIN
 RAISE EXCEPTION 'ADM5B3_APPEND_ONLY: % forbidden', TG_OP USING ERRCODE='42501';
END $fn$;
REVOKE ALL ON FUNCTION public.arctor_admin_context_immutable_adm5b3_v1() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER adm5b3_snapshot_no_mutation BEFORE UPDATE OR DELETE OR TRUNCATE
 ON public.arctor_admin_context_snapshots_adm5b3_v1
 FOR EACH STATEMENT EXECUTE FUNCTION public.arctor_admin_context_immutable_adm5b3_v1();
CREATE TRIGGER adm5b3_events_no_mutation BEFORE UPDATE OR DELETE OR TRUNCATE
 ON public.arctor_admin_context_snapshot_events_adm5b3_v1
 FOR EACH STATEMENT EXECUTE FUNCTION public.arctor_admin_context_immutable_adm5b3_v1();

CREATE FUNCTION public.arctor_admin_context_snapshot_capture_adm5b3_v1(
 p_actor_user_id uuid, p_operation_id uuid, p_case_id uuid, p_assignment_id uuid,
 p_role_code text, p_task_code text, p_manifest_digest text,
 p_snapshot_text text, p_snapshot_digest text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
DECLARE
 v_assignment public.arctor_admin_assignments_adm2_v1%ROWTYPE;
 v_existing public.arctor_admin_context_snapshots_adm5b3_v1%ROWTYPE;
 v_payload jsonb;
 v_manifest jsonb;
 v_entries jsonb;
 v_sections jsonb;
 v_entry jsonb;
 v_section jsonb;
 v_n integer;
 v_version integer;
 v_snapshot_id uuid;
 v_count integer;
BEGIN
 IF p_actor_user_id IS NULL OR p_operation_id IS NULL OR p_case_id IS NULL OR p_assignment_id IS NULL
   OR p_manifest_digest !~ '^[a-f0-9]{64}$' OR p_snapshot_digest !~ '^[a-f0-9]{64}$'
   OR p_task_code !~ '^[a-z][a-z0-9_]{2,90}$'
   OR octet_length(COALESCE(p_snapshot_text,'')) NOT BETWEEN 10 AND 32000
 THEN RAISE EXCEPTION 'ADM5B3_INVALID_INPUT' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.platform_admins p WHERE p.app_user_id=p_actor_user_id
     AND p.role IN ('owner','admin') AND p.status='active')
 THEN RAISE EXCEPTION 'ADM5B3_ACTIVE_ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_assignment_id::text||'|'||p_task_code, 0));
 -- Replays are idempotent only for the same operation and same input hash.
 SELECT s.* INTO v_existing FROM public.arctor_admin_context_snapshots_adm5b3_v1 s
 JOIN public.arctor_admin_context_snapshot_events_adm5b3_v1 e ON e.snapshot_id=s.id
 WHERE e.operation_id=p_operation_id AND e.kind='captured' LIMIT 1;
 IF FOUND THEN
   IF v_existing.manifest_digest<>p_manifest_digest OR v_existing.snapshot_digest<>p_snapshot_digest
      OR v_existing.assignment_id<>p_assignment_id OR v_existing.task_code<>p_task_code
   THEN RAISE EXCEPTION 'ADM5B3_OPERATION_REUSE_DIFFERENT_INPUT' USING ERRCODE='23505'; END IF;
   RETURN jsonb_build_object('contract','ARCTOR_ADM5B3_INTERNAL_SNAPSHOT_V1','snapshotId',v_existing.id,
      'version',v_existing.version_num,'idempotentReplay',true,'outboundAuthorized',false,'agentExecutionPermitted',false);
 END IF;
 IF EXISTS (SELECT 1 FROM public.arctor_admin_context_snapshot_events_adm5b3_v1 WHERE operation_id=p_operation_id)
 THEN RAISE EXCEPTION 'ADM5B3_OPERATION_ALREADY_USED' USING ERRCODE='23505'; END IF;
 SELECT * INTO v_assignment FROM public.arctor_admin_assignments_adm2_v1
 WHERE id=p_assignment_id AND case_id=p_case_id AND recipient_role_code=p_role_code;
 IF NOT FOUND OR v_assignment.recipient_agent_code IS NOT NULL
 THEN RAISE EXCEPTION 'ADM5B3_ASSIGNMENT_NOT_ALLOWED' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.arctor_admin_cases_adm2_v1 c
    WHERE c.id=p_case_id AND c.status NOT IN ('resolved','closed','cancelled'))
 THEN RAISE EXCEPTION 'ADM5B3_CASE_NOT_ACTIVE' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.arctor_admin_roles_adm2_v1 r
    WHERE r.role_code=p_role_code AND r.is_active AND NOT r.agent_execution_enabled)
 THEN RAISE EXCEPTION 'ADM5B3_ROLE_NOT_ELIGIBLE' USING ERRCODE='22023'; END IF;
 IF encode(pg_catalog.sha256(convert_to(p_snapshot_text,'UTF8')),'hex')<>p_snapshot_digest
 THEN RAISE EXCEPTION 'ADM5B3_SNAPSHOT_HASH_MISMATCH' USING ERRCODE='22023'; END IF;
 v_payload := p_snapshot_text::jsonb;
 v_manifest := v_payload->'manifest'; v_sections:=v_payload->'sections'; v_entries:=v_manifest->'entries';
 IF v_payload->>'contract' IS DISTINCT FROM 'ARCTOR_ADM5B3_INTERNAL_SNAPSHOT_V1'
    OR v_manifest->>'contract' IS DISTINCT FROM 'ARCTOR_ADM5B2_CONTEXT_MANIFEST_READ_ONLY_V1'
    OR v_manifest->>'digestSha256' IS DISTINCT FROM p_manifest_digest
    OR v_manifest->>'caseId' IS DISTINCT FROM p_case_id::text
    OR v_manifest->>'assignmentId' IS DISTINCT FROM p_assignment_id::text
    OR v_manifest->>'roleCode' IS DISTINCT FROM p_role_code
    OR v_manifest->>'taskCode' IS DISTINCT FROM p_task_code
    OR v_manifest->>'mode' IS DISTINCT FROM 'human_readonly_preview'
    OR v_manifest->>'outboundAuthorized' IS DISTINCT FROM 'false'
    OR v_manifest->>'agentExecutionPermitted' IS DISTINCT FROM 'false'
    OR v_manifest->>'contextApproved' IS DISTINCT FROM 'false'
    OR jsonb_typeof(v_entries) IS DISTINCT FROM 'array'
    OR jsonb_typeof(v_sections) IS DISTINCT FROM 'array'
 THEN RAISE EXCEPTION 'ADM5B3_PAYLOAD_CONTRACT_INVALID' USING ERRCODE='22023'; END IF;
 v_count:=jsonb_array_length(v_sections);
 IF v_count<3 OR v_count>20 OR v_count<>jsonb_array_length(v_entries)
 THEN RAISE EXCEPTION 'ADM5B3_SECTION_COUNT_INVALID' USING ERRCODE='22023'; END IF;
 IF v_manifest->>'sourceVerification' IS DISTINCT FROM 'verified_exact_public_text'
    OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_entries) e WHERE e->>'sourceType'='public_source')
 THEN RAISE EXCEPTION 'ADM5B3_PUBLIC_SOURCE_MISSING' USING ERRCODE='22023'; END IF;
 FOR v_n IN 0..v_count-1 LOOP
   v_entry:=v_entries->v_n; v_section:=v_sections->v_n;
   IF v_entry->>'sourceType' IS DISTINCT FROM v_section->>'sourceType'
      OR v_entry->>'sourceRef' IS DISTINCT FROM v_section->>'reference'
      OR (v_entry->>'ordinal')::integer<>v_n
      OR (v_section->>'ordinal')::integer<>v_n
      OR (v_entry->>'chars')::integer<0
      OR v_entry->>'sha256' IS DISTINCT FROM v_section->>'sha256'
      OR v_entry->>'sha256' IS DISTINCT FROM
          encode(pg_catalog.sha256(convert_to(v_section->>'text','UTF8')),'hex')
   THEN RAISE EXCEPTION 'ADM5B3_SECTION_HASH_OR_ORDER_MISMATCH' USING ERRCODE='22023'; END IF;
 END LOOP;
 SELECT * INTO v_existing FROM public.arctor_admin_context_snapshots_adm5b3_v1
 WHERE assignment_id=p_assignment_id AND task_code=p_task_code AND manifest_digest=p_manifest_digest LIMIT 1;
 IF FOUND THEN RETURN jsonb_build_object('contract','ARCTOR_ADM5B3_INTERNAL_SNAPSHOT_V1',
   'snapshotId',v_existing.id,'version',v_existing.version_num,'duplicateDigest',true,
   'outboundAuthorized',false,'agentExecutionPermitted',false); END IF;
 SELECT COALESCE(MAX(version_num),0)+1 INTO v_version
 FROM public.arctor_admin_context_snapshots_adm5b3_v1
 WHERE assignment_id=p_assignment_id AND task_code=p_task_code;
 INSERT INTO public.arctor_admin_context_snapshots_adm5b3_v1
  (case_id,assignment_id,role_code,task_code,version_num,manifest_digest,snapshot_digest,snapshot_text,captured_by_app_user_id)
 VALUES(p_case_id,p_assignment_id,p_role_code,p_task_code,v_version,p_manifest_digest,p_snapshot_digest,p_snapshot_text,p_actor_user_id)
 RETURNING id INTO v_snapshot_id;
 INSERT INTO public.arctor_admin_context_snapshot_events_adm5b3_v1
  (snapshot_id,operation_id,kind,reason,actor_app_user_id)
 VALUES(v_snapshot_id,p_operation_id,'captured','Создан неизменяемый снимок для внутренней проверки',p_actor_user_id);
 RETURN jsonb_build_object('contract','ARCTOR_ADM5B3_INTERNAL_SNAPSHOT_V1',
   'snapshotId',v_snapshot_id,'version',v_version,'idempotentReplay',false,
   'outboundAuthorized',false,'agentExecutionPermitted',false);
END $fn$;

CREATE FUNCTION public.arctor_admin_context_snapshot_decide_adm5b3_v1(
 p_actor_user_id uuid, p_operation_id uuid, p_snapshot_id uuid,
 p_expected_digest text, p_action text, p_reason text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
DECLARE
 v_row public.arctor_admin_context_snapshots_adm5b3_v1%ROWTYPE;
 v_event public.arctor_admin_context_snapshot_events_adm5b3_v1%ROWTYPE;
 v_expected_kind text;
BEGIN
 IF p_actor_user_id IS NULL OR p_operation_id IS NULL OR p_snapshot_id IS NULL
   OR p_action NOT IN ('review_internal','reject')
   OR p_expected_digest !~ '^[a-f0-9]{64}$'
   OR length(btrim(COALESCE(p_reason,''))) NOT BETWEEN 10 AND 1000
 THEN RAISE EXCEPTION 'ADM5B3_DECISION_INVALID_INPUT' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.platform_admins WHERE app_user_id=p_actor_user_id
     AND status='active' AND role IN ('owner','admin'))
 THEN RAISE EXCEPTION 'ADM5B3_ACTIVE_ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_snapshot_id::text,0));
 -- Resolve the SQL CASE expression separately: unambiguous PL/pgSQL IF parsing.
 v_expected_kind := CASE WHEN p_action='reject' THEN 'rejected' ELSE 'reviewed_internal' END;
 SELECT * INTO v_event FROM public.arctor_admin_context_snapshot_events_adm5b3_v1
 WHERE operation_id=p_operation_id LIMIT 1;
 IF FOUND THEN
   IF v_event.snapshot_id IS DISTINCT FROM p_snapshot_id
      OR v_event.kind IS DISTINCT FROM v_expected_kind
      OR v_event.reason IS DISTINCT FROM btrim(p_reason)
   THEN RAISE EXCEPTION 'ADM5B3_DECISION_OPERATION_REUSED' USING ERRCODE='23505'; END IF;
   RETURN jsonb_build_object('contract','ARCTOR_ADM5B3_INTERNAL_SNAPSHOT_V1','snapshotId',p_snapshot_id,
     'decision',v_event.kind,'idempotentReplay',true,'outboundAuthorized',false,'agentExecutionPermitted',false);
 END IF;
 SELECT * INTO v_row FROM public.arctor_admin_context_snapshots_adm5b3_v1 WHERE id=p_snapshot_id;
 IF NOT FOUND OR v_row.manifest_digest<>p_expected_digest
 THEN RAISE EXCEPTION 'ADM5B3_SNAPSHOT_NOT_FOUND_OR_STALE' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM public.arctor_admin_context_snapshot_events_adm5b3_v1
     WHERE snapshot_id=p_snapshot_id AND kind IN ('reviewed_internal','rejected'))
 THEN RAISE EXCEPTION 'ADM5B3_SNAPSHOT_ALREADY_DECIDED' USING ERRCODE='23505'; END IF;
 -- No 'approved_outbound' transition exists, and this function never grants execution.
 INSERT INTO public.arctor_admin_context_snapshot_events_adm5b3_v1
  (snapshot_id,operation_id,kind,reason,actor_app_user_id)
 VALUES(p_snapshot_id,p_operation_id,v_expected_kind,btrim(p_reason),p_actor_user_id);
 RETURN jsonb_build_object('contract','ARCTOR_ADM5B3_INTERNAL_SNAPSHOT_V1',
   'snapshotId',p_snapshot_id,'decision',v_expected_kind,
   'idempotentReplay',false,'outboundAuthorized',false,'agentExecutionPermitted',false);
END $fn$;
REVOKE ALL ON FUNCTION public.arctor_admin_context_snapshot_capture_adm5b3_v1(uuid,uuid,uuid,uuid,text,text,text,text,text)
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.arctor_admin_context_snapshot_decide_adm5b3_v1(uuid,uuid,uuid,text,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.arctor_admin_context_snapshot_capture_adm5b3_v1(uuid,uuid,uuid,uuid,text,text,text,text,text)
 TO service_role;
GRANT EXECUTE ON FUNCTION public.arctor_admin_context_snapshot_decide_adm5b3_v1(uuid,uuid,uuid,text,text,text)
 TO service_role;
COMMIT;
