-- ARCTOR_ADMIN_ADM2B2_ATOMIC_ACTIONS_V1
-- APPLY ONLY AFTER PRECHECK PASS; Supabase SQL Editor. Atomic schema migration.
-- Does not create cases, assignments, facts, or run agents.
BEGIN;
DO $guard$
BEGIN
 IF to_regclass('public.arctor_admin_roles_adm2_v1') IS NULL
    OR to_regclass('public.arctor_admin_cases_adm2_v1') IS NULL
    OR to_regclass('public.arctor_admin_assignments_adm2_v1') IS NULL
    OR to_regclass('public.arctor_admin_case_events_adm2_v1') IS NULL
    OR to_regclass('public.arctor_admin_adm2b2_case_code_seq') IS NOT NULL
    OR to_regprocedure('public.arctor_admin_apply_case_action_adm2b2_v1(uuid,uuid,text,jsonb)') IS NOT NULL
 THEN RAISE EXCEPTION 'ADM2B2_STOP_SCHEMA_PREREQUISITE_OR_ALREADY_INSTALLED'; END IF;
 IF (SELECT count(*) FROM public.arctor_admin_roles_adm2_v1) <> 8
    OR (SELECT count(*) FROM public.arctor_admin_roles_adm2_v1 WHERE agent_execution_enabled) <> 0
 THEN RAISE EXCEPTION 'ADM2B2_STOP_ROLES_OR_AGENTS'; END IF;
 IF has_table_privilege('service_role','public.arctor_admin_case_events_adm2_v1','UPDATE')
    OR has_table_privilege('service_role','public.arctor_admin_case_events_adm2_v1','DELETE')
    OR has_table_privilege('service_role','public.arctor_admin_case_events_adm2_v1','TRUNCATE')
 THEN RAISE EXCEPTION 'ADM2B2_STOP_AUDIT_MUTABLE'; END IF;
END $guard$;

CREATE SEQUENCE public.arctor_admin_adm2b2_case_code_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 999999 NO CYCLE;
REVOKE ALL ON SEQUENCE public.arctor_admin_adm2b2_case_code_seq FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SEQUENCE public.arctor_admin_adm2b2_case_code_seq TO service_role;

-- One operation can cause multiple events; only its primary event gets operationId.
CREATE UNIQUE INDEX arctor_admin_events_adm2b2_operation_uidx
 ON public.arctor_admin_case_events_adm2_v1 ((details_json ->> 'operationId'))
 WHERE details_json ? 'operationId';

CREATE FUNCTION public.arctor_admin_apply_case_action_adm2b2_v1(
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
BEGIN
 IF p_actor_user_id IS NULL OR p_operation_id IS NULL OR p_action IS NULL
    OR p_action NOT IN ('create','assign','report','handoff')
    OR jsonb_typeof(p_payload) IS DISTINCT FROM 'object'
 THEN RAISE EXCEPTION 'ADM2B2_INVALID_REQUEST' USING ERRCODE='22023'; END IF;
 -- Per-key serialisation prevents duplicate writes if network retries race.
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_operation_id::text, 0));
 SELECT * INTO v_existing FROM public.arctor_admin_case_events_adm2_v1
 WHERE details_json ->> 'operationId' = p_operation_id::text LIMIT 1;
 IF FOUND THEN
   IF v_existing.details_json ->> 'action' IS DISTINCT FROM p_action
   THEN RAISE EXCEPTION 'ADM2B2_OPERATION_ID_REUSED' USING ERRCODE='23505'; END IF;
   RETURN jsonb_build_object('ok',true,'contract','ARCTOR_ADMIN_ADM2B2_ATOMIC_ACTION_V1',
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
     (case_code,title,description,case_type,priority,status,owner_role_code,source_system,
       next_expected_result,created_by_app_user_id)
   VALUES (v_case_code,v_title,v_description,v_case_type,v_priority,'assigned',v_role,'admin_console',
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
     jsonb_build_object('operationId',p_operation_id::text,'action',p_action));
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
       jsonb_build_object('operationId',p_operation_id::text,'action',p_action));
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
        jsonb_build_object('operationId',p_operation_id::text,'action',p_action));
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
           'previousAssignmentId',v_old_assignment_id::text,
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
GRANT EXECUTE ON FUNCTION public.arctor_admin_apply_case_action_adm2b2_v1(uuid,uuid,text,jsonb)
 TO service_role;
COMMIT;
