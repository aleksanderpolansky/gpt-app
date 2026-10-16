-- ARCTOR_ADMIN_ADM2B2_QA_HARDENING_V1
-- APPLY in Supabase SQL Editor only after QA PRECHECK PASS.
-- Safe repeat of this migration is supported (e.g. after manual SQL + migration reconciliation).
-- No cases, assignments or events are created/deleted by this migration.
-- Existing cases are backfilled with their FIRST assignment recipient, which is the
-- provisional accountable officer at case creation. Review this policy as ADM-3 design.
-- owner_role_code remains the CURRENT INBOX ROUTE for ADM-2B.1 compatibility.
-- accountable_role_code is immutable origin accountability; it does not move on handoff.
BEGIN;
DO $guard$
BEGIN
 IF to_regprocedure('public.arctor_admin_apply_case_action_adm2b2_v1(uuid,uuid,text,jsonb)') IS NULL
 OR to_regclass('public.arctor_admin_cases_adm2_v1') IS NULL
 OR to_regclass('public.arctor_admin_assignments_adm2_v1') IS NULL
 OR to_regclass('public.arctor_admin_case_events_adm2_v1') IS NULL
 OR to_regprocedure('pg_catalog.sha256(bytea)') IS NULL
 THEN RAISE EXCEPTION 'ADM2B2_QA_STOP_MISSING_PREREQUISITES'; END IF;
 IF NOT has_function_privilege('service_role',
 'public.arctor_admin_apply_case_action_adm2b2_v1(uuid,uuid,text,jsonb)','EXECUTE')
 OR has_function_privilege('anon',
 'public.arctor_admin_apply_case_action_adm2b2_v1(uuid,uuid,text,jsonb)','EXECUTE')
 OR has_function_privilege('authenticated',
 'public.arctor_admin_apply_case_action_adm2b2_v1(uuid,uuid,text,jsonb)','EXECUTE')
 THEN RAISE EXCEPTION 'ADM2B2_QA_STOP_EXECUTE_GRANTS_CHANGED'; END IF;
 IF has_table_privilege('service_role','public.arctor_admin_case_events_adm2_v1','UPDATE')
 OR has_table_privilege('service_role','public.arctor_admin_case_events_adm2_v1','DELETE')
 OR has_table_privilege('service_role','public.arctor_admin_case_events_adm2_v1','TRUNCATE')
 THEN RAISE EXCEPTION 'ADM2B2_QA_STOP_HISTORY_MUTABLE'; END IF;
END $guard$;

ALTER TABLE public.arctor_admin_cases_adm2_v1
 ADD COLUMN IF NOT EXISTS accountable_role_code text;

-- Backfill historic original case accountability without changing the current inbox.
WITH first_assignment AS (
 SELECT DISTINCT ON (e.case_id) e.case_id, a.recipient_role_code
 FROM public.arctor_admin_case_events_adm2_v1 AS e
 JOIN public.arctor_admin_assignments_adm2_v1 AS a ON a.id=e.assignment_id AND a.case_id=e.case_id
 WHERE e.event_kind='assigned'
 ORDER BY e.case_id, a.created_at ASC, a.id ASC
)
UPDATE public.arctor_admin_cases_adm2_v1 AS c
 SET accountable_role_code=first_assignment.recipient_role_code
 FROM first_assignment
 WHERE c.id=first_assignment.case_id AND c.accountable_role_code IS NULL;

DO $guard$
BEGIN
 IF EXISTS (SELECT 1 FROM public.arctor_admin_cases_adm2_v1
  WHERE accountable_role_code IS NULL OR btrim(accountable_role_code)='')
 THEN RAISE EXCEPTION 'ADM2B2_QA_STOP_ACCOUNTABILITY_BACKFILL_INCOMPLETE'; END IF;
END $guard$;
ALTER TABLE public.arctor_admin_cases_adm2_v1
 ALTER COLUMN accountable_role_code SET NOT NULL;

CREATE OR REPLACE FUNCTION public.arctor_admin_guard_case_accountability_adm2b2_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $guardfn$
BEGIN
 IF NEW.accountable_role_code IS DISTINCT FROM OLD.accountable_role_code THEN
  RAISE EXCEPTION 'ADM2B2_ACCOUNTABILITY_IMMUTABLE' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END;
$guardfn$;
REVOKE ALL ON FUNCTION public.arctor_admin_guard_case_accountability_adm2b2_v1() FROM PUBLIC,anon,authenticated;
DO $guard$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger
  WHERE tgrelid='public.arctor_admin_cases_adm2_v1'::regclass
   AND tgname='arctor_admin_accountability_immutable_adm2b2_v1' AND NOT tgisinternal) THEN
  CREATE TRIGGER arctor_admin_accountability_immutable_adm2b2_v1
   BEFORE UPDATE OF accountable_role_code ON public.arctor_admin_cases_adm2_v1
   FOR EACH ROW EXECUTE FUNCTION public.arctor_admin_guard_case_accountability_adm2b2_v1();
 END IF;
END $guard$;

-- Replaces only the existing atomic function, preserving its signature and v1 API response contract.
CREATE OR REPLACE FUNCTION public.arctor_admin_apply_case_action_adm2b2_v1(
 p_actor_user_id uuid,
 p_operation_id uuid,
 p_action text,
 p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $fn$
DECLARE
 v_case_id uuid;
 v_assignment_id uuid;
 v_old_assignment_id uuid;
 v_case public.arctor_admin_cases_adm2_v1%ROWTYPE;
 v_assignment public.arctor_admin_assignments_adm2_v1%ROWTYPE;
 v_existing public.arctor_admin_case_events_adm2_v1%ROWTYPE;
 v_case_code text;
 v_title text;
 v_description text;
 v_case_type text;
 v_priority text;
 v_role text;
 v_assignment_text text;
 v_required_result text;
 v_report text;
 v_summary text;
 v_meta jsonb;
 v_request_hash text;
BEGIN
 IF p_actor_user_id IS NULL OR p_operation_id IS NULL OR p_action IS NULL
    OR p_action NOT IN ('create','assign','report','handoff')
    OR jsonb_typeof(p_payload) IS DISTINCT FROM 'object'
 THEN RAISE EXCEPTION 'ADM2B2_INVALID_REQUEST' USING ERRCODE='22023'; END IF;
 -- One canonical digest binds operationId to actor, action AND complete JSON payload.
 -- PostgreSQL jsonb renders keys in a canonical order for identical jsonb objects.
 v_request_hash := pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
   pg_catalog.jsonb_build_object('actorUserId',p_actor_user_id::text,'action',p_action,'payload',p_payload)::text,
   'UTF8')), 'hex');
 -- Per-key serialisation prevents duplicate writes if network retries race.
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_operation_id::text, 0));
 SELECT * INTO v_existing FROM public.arctor_admin_case_events_adm2_v1
 WHERE details_json ->> 'operationId' = p_operation_id::text LIMIT 1;
 IF FOUND THEN
   -- Old V1 events have no requestHash. They cannot be safely replay-verified;
   -- fail closed without modifying or deleting historical evidence.
   IF v_existing.details_json ->> 'action' IS DISTINCT FROM p_action
      OR v_existing.details_json ->> 'requestHash' IS DISTINCT FROM v_request_hash
      OR v_existing.performed_by_app_user_id IS DISTINCT FROM p_actor_user_id
   THEN RAISE EXCEPTION 'ADM2B2_OPERATION_ID_REUSED_OR_LEGACY_UNVERIFIABLE' USING ERRCODE='23505'; END IF;
   RETURN pg_catalog.jsonb_build_object('ok',true,'contract','ARCTOR_ADMIN_ADM2B2_ATOMIC_ACTION_V1',
      'action',p_action,'caseId',v_existing.case_id,'assignmentId',v_existing.assignment_id,
      'idempotentReplay',true,'agentExecutionPerformed',false);
 END IF;

 IF p_action IN ('create','assign','handoff') THEN
   v_role := NULLIF(btrim(p_payload ->> 'recipientRoleCode'),'');
   v_assignment_text := NULLIF(btrim(p_payload ->> 'assignmentText'),'');
   v_required_result := NULLIF(btrim(p_payload ->> 'requiredResult'),'');
   IF v_role IS NULL OR NOT EXISTS (SELECT 1 FROM public.arctor_admin_roles_adm2_v1
      WHERE role_code=v_role AND is_active AND NOT agent_execution_enabled)
      OR length(COALESCE(v_assignment_text,'')) NOT BETWEEN 4 AND 12000
      OR length(COALESCE(v_required_result,'')) NOT BETWEEN 4 AND 6000
   THEN RAISE EXCEPTION 'ADM2B2_BAD_ASSIGNMENT' USING ERRCODE='22023'; END IF;
 END IF;

 IF p_action = 'create' THEN
   v_title := NULLIF(btrim(p_payload ->> 'title'),'');
   v_description := COALESCE(btrim(p_payload ->> 'description'),'');
   v_case_type := COALESCE(NULLIF(btrim(p_payload ->> 'caseType'),''),'request');
   v_priority := COALESCE(NULLIF(btrim(p_payload ->> 'priority'),''),'normal');
   IF length(COALESCE(v_title,'')) NOT BETWEEN 3 AND 240
      OR length(v_description)>12000
      OR v_case_type NOT IN ('defect','research','planned','operations','risk','request','incident')
      OR v_priority NOT IN ('urgent','high','normal','low')
   THEN RAISE EXCEPTION 'ADM2B2_BAD_CASE' USING ERRCODE='22023'; END IF;
   v_case_code := 'ADM-' || lpad(nextval('public.arctor_admin_adm2b2_case_code_seq'::regclass)::text,6,'0');
   INSERT INTO public.arctor_admin_cases_adm2_v1
     (case_code,title,description,case_type,priority,status,owner_role_code,accountable_role_code,source_system,
       next_expected_result,created_by_app_user_id)
   VALUES (v_case_code,v_title,v_description,v_case_type,v_priority,'assigned',v_role,v_role,'admin_console',
       v_required_result,p_actor_user_id)
   RETURNING id INTO v_case_id;
   INSERT INTO public.arctor_admin_assignments_adm2_v1
     (case_id,recipient_role_code,assignment_text,required_result,created_by_app_user_id)
   VALUES (v_case_id,v_role,v_assignment_text,v_required_result,p_actor_user_id)
   RETURNING id INTO v_assignment_id;
   INSERT INTO public.arctor_admin_case_events_adm2_v1
     (case_id,event_kind,performed_by_type,performed_by_app_user_id,result_summary)
   VALUES (v_case_id,'created','admin',p_actor_user_id,'Создано дело '||v_case_code);
   v_summary := 'Создано первое поручение: ' || left(v_assignment_text,300);
   INSERT INTO public.arctor_admin_case_events_adm2_v1
     (case_id,assignment_id,event_kind,performed_by_type,performed_by_app_user_id,result_summary,details_json)
   VALUES (v_case_id,v_assignment_id,'assigned','admin',p_actor_user_id,v_summary,
     jsonb_build_object('operationId',p_operation_id::text,'action',p_action,'requestHash',v_request_hash));
 ELSE
   IF COALESCE(p_payload->>'caseId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   THEN RAISE EXCEPTION 'ADM2B2_INVALID_CASE_ID' USING ERRCODE='22023'; END IF;
   v_case_id := (p_payload->>'caseId')::uuid;
   SELECT * INTO v_case FROM public.arctor_admin_cases_adm2_v1 WHERE id=v_case_id FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'ADM2B2_CASE_NOT_FOUND' USING ERRCODE='P0002'; END IF;
   IF v_case.status IN ('resolved','closed','cancelled')
   THEN RAISE EXCEPTION 'ADM2B2_CASE_FINAL_STATE' USING ERRCODE='22023'; END IF;

   IF p_action = 'assign' THEN
     INSERT INTO public.arctor_admin_assignments_adm2_v1
       (case_id,recipient_role_code,assignment_text,required_result,created_by_app_user_id)
     VALUES (v_case_id,v_role,v_assignment_text,v_required_result,p_actor_user_id)
     RETURNING id INTO v_assignment_id;
     UPDATE public.arctor_admin_cases_adm2_v1 SET status='assigned',updated_at=now(),
       next_expected_result=v_required_result WHERE id=v_case_id;
     INSERT INTO public.arctor_admin_case_events_adm2_v1
       (case_id,assignment_id,event_kind,performed_by_type,performed_by_app_user_id,result_summary,details_json)
     VALUES (v_case_id,v_assignment_id,'assigned','admin',p_actor_user_id,
       'Поручение направлено должности: '||v_role,
       jsonb_build_object('operationId',p_operation_id::text,'action',p_action,'requestHash',v_request_hash));
   ELSE
     IF COALESCE(p_payload->>'assignmentId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     THEN RAISE EXCEPTION 'ADM2B2_INVALID_ASSIGNMENT_ID' USING ERRCODE='22023'; END IF;
     v_old_assignment_id := (p_payload->>'assignmentId')::uuid;
     SELECT * INTO v_assignment FROM public.arctor_admin_assignments_adm2_v1
      WHERE id=v_old_assignment_id AND case_id=v_case_id FOR UPDATE;
     IF NOT FOUND THEN RAISE EXCEPTION 'ADM2B2_ASSIGNMENT_NOT_FOUND' USING ERRCODE='P0002'; END IF;
     IF p_action = 'report' THEN
       v_report := NULLIF(btrim(p_payload->>'reportText'),'');
       IF length(COALESCE(v_report,'')) NOT BETWEEN 10 AND 6000
          OR v_assignment.status NOT IN ('new','accepted','in_progress','blocked')
       THEN RAISE EXCEPTION 'ADM2B2_REPORT_INVALID_OR_ALREADY_REPORTED' USING ERRCODE='22023'; END IF;
       UPDATE public.arctor_admin_assignments_adm2_v1 SET status='reported'
        WHERE id=v_old_assignment_id;
       UPDATE public.arctor_admin_cases_adm2_v1 SET status='review',updated_at=now()
        WHERE id=v_case_id;
       INSERT INTO public.arctor_admin_case_events_adm2_v1
        (case_id,assignment_id,event_kind,performed_by_type,performed_by_app_user_id,result_summary,details_json)
       VALUES (v_case_id,v_old_assignment_id,'report_submitted','admin',p_actor_user_id,v_report,
        jsonb_build_object('operationId',p_operation_id::text,'action',p_action,'requestHash',v_request_hash));
       v_assignment_id := v_old_assignment_id;
     ELSIF p_action='handoff' THEN
       IF v_assignment.status <> 'reported' OR v_role = v_assignment.recipient_role_code
       THEN RAISE EXCEPTION 'ADM2B2_HANDOFF_REQUIRES_REPORTED_ASSIGNMENT_AND_NEW_ROLE' USING ERRCODE='22023'; END IF;
       UPDATE public.arctor_admin_assignments_adm2_v1 SET status='completed',completed_at=now()
        WHERE id=v_old_assignment_id;
       INSERT INTO public.arctor_admin_assignments_adm2_v1
         (case_id,recipient_role_code,assignment_text,required_result,created_by_app_user_id)
       VALUES (v_case_id,v_role,v_assignment_text,v_required_result,p_actor_user_id)
       RETURNING id INTO v_assignment_id;
       UPDATE public.arctor_admin_cases_adm2_v1 SET owner_role_code=v_role,status='assigned',
         updated_at=now(),next_expected_result=v_required_result WHERE id=v_case_id;
       INSERT INTO public.arctor_admin_case_events_adm2_v1
         (case_id,assignment_id,event_kind,performed_by_type,performed_by_app_user_id,result_summary,details_json)
       VALUES (v_case_id,v_assignment_id,'handed_off','admin',p_actor_user_id,
         'Передано от '||v_assignment.recipient_role_code||' к '||v_role,
         jsonb_build_object('operationId',p_operation_id::text,'action',p_action,
           'requestHash',v_request_hash,'previousAssignmentId',v_old_assignment_id::text,
           'fromRoleCode',v_assignment.recipient_role_code,'toRoleCode',v_role));
     END IF;
   END IF;
 END IF;
 RETURN jsonb_build_object('ok',true,'contract','ARCTOR_ADMIN_ADM2B2_ATOMIC_ACTION_V1',
   'action',p_action,'caseId',v_case_id,'assignmentId',v_assignment_id,
   'caseCode',v_case_code,'idempotentReplay',false,'agentExecutionPerformed',false);
END;
$fn$;

REVOKE ALL ON FUNCTION public.arctor_admin_apply_case_action_adm2b2_v1(uuid,uuid,text,jsonb)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.arctor_admin_apply_case_action_adm2b2_v1(uuid,uuid,text,jsonb) TO service_role;
COMMIT;
