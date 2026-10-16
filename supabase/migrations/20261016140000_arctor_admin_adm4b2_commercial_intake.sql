-- ARCTOR_ADM4B2_COMMERCIAL_INTAKE_V1
-- Manual SQL only, in Supabase SQL Editor after PRECHECK PASS.
-- Installation adds ONLY an RPC; it does not create any case, assignment, event or agent job.
BEGIN;
DO $guard$
BEGIN
  IF to_regclass('public.activity_events') IS NULL
    OR to_regclass('public.message_objects') IS NULL
    OR to_regclass('public.arctor_admin_cases_adm2_v1') IS NULL
    OR to_regclass('public.arctor_admin_assignments_adm2_v1') IS NULL
    OR to_regclass('public.arctor_admin_case_events_adm2_v1') IS NULL
    OR to_regclass('public.arctor_admin_roles_adm2_v1') IS NULL
    OR to_regclass('public.arctor_admin_adm2b2_case_code_seq') IS NULL
    OR to_regprocedure('public.arctor_admin_link_case_source_adm4a_v1(uuid,uuid,text,uuid)') IS NULL
    OR to_regprocedure('public.arctor_admin_intake_commercial_adm4b2_v1(uuid,uuid,text,uuid,uuid)') IS NOT NULL
  THEN RAISE EXCEPTION 'ADM4B2_STOP_SCHEMA_CHANGED_OR_ALREADY_INSTALLED'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.arctor_admin_roles_adm2_v1
    WHERE role_code='commercial' AND is_active AND NOT agent_execution_enabled)
    OR EXISTS (SELECT 1 FROM public.arctor_admin_roles_adm2_v1 WHERE agent_execution_enabled)
  THEN RAISE EXCEPTION 'ADM4B2_STOP_ROLE_OR_AGENT_CONFIGURATION'; END IF;
  IF has_table_privilege('service_role','public.arctor_admin_case_events_adm2_v1','UPDATE')
     OR has_table_privilege('service_role','public.arctor_admin_case_events_adm2_v1','DELETE')
  THEN RAISE EXCEPTION 'ADM4B2_STOP_AUDIT_MUTABLE'; END IF;
END $guard$;

CREATE FUNCTION public.arctor_admin_intake_commercial_adm4b2_v1(
 p_actor_user_id uuid,
 p_operation_id uuid,
 p_action text,
 p_source_id uuid,
 p_case_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path=pg_catalog
AS $fn$
DECLARE
 v_case_id uuid;
 v_case_code text;
 v_assignment_id uuid;
 v_existing public.arctor_admin_case_events_adm2_v1%ROWTYPE;
 v_case public.arctor_admin_cases_adm2_v1%ROWTYPE;
 v_hash text;
 v_public boolean;
 v_title text;
 v_expected text := 'Отчёт о причинах отклонения коммерческой активности, проверенном первоисточнике и возможных дальнейших действиях. Без автоматических изменений.';
 v_task text := 'Изучить проблему обработки коммерческой активности, проверить доступный публичный первоисточник, подготовить отчёт с рекомендациями. Не изменять модель и код без решения администратора.';
BEGIN
 IF p_actor_user_id IS NULL OR p_operation_id IS NULL OR p_source_id IS NULL
   OR p_action NOT IN ('create','link')
   OR (p_action='create' AND p_case_id IS NOT NULL)
   OR (p_action='link' AND p_case_id IS NULL)
 THEN RAISE EXCEPTION 'ADM4B2_BAD_REQUEST' USING ERRCODE='22023'; END IF;

 v_hash := pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
   pg_catalog.jsonb_build_object('actor',p_actor_user_id::text,'action',p_action,
       'sourceId',p_source_id::text,'caseId',p_case_id::text)::text,'UTF8')), 'hex');
 -- Identical operationIds serialize; source lock serializes distinct operations on one source.
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('ADM4B2:operation:'||p_operation_id::text,0));
 SELECT * INTO v_existing FROM public.arctor_admin_case_events_adm2_v1
   WHERE details_json->>'operationId'=p_operation_id::text LIMIT 1;
 IF FOUND THEN
   IF v_existing.details_json->>'requestHash' IS DISTINCT FROM v_hash
      OR v_existing.details_json->>'action' IS DISTINCT FROM 'adm4b2_'||p_action
      OR v_existing.performed_by_app_user_id IS DISTINCT FROM p_actor_user_id
   THEN RAISE EXCEPTION 'ADM4B2_OPERATION_REPLAY_MISMATCH' USING ERRCODE='23505'; END IF;
   SELECT case_code INTO v_case_code FROM public.arctor_admin_cases_adm2_v1 WHERE id=v_existing.case_id;
   RETURN pg_catalog.jsonb_build_object('ok',true,'contract','ARCTOR_ADM4B2_COMMERCIAL_INTAKE_V1',
     'caseId',v_existing.case_id,'caseCode',v_case_code,'idempotentReplay',true,
     'alreadyLinked',true,'dbWritesPerformed',false,'agentExecutionPerformed',false);
 END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('ADM4B2:source:'||p_source_id::text,0));

 -- No private raw activity, personal curator task or unverifiable message is permitted.
 -- Locks prevent a concurrent change to the source's published/active status mid-transaction.
 SELECT true INTO v_public FROM public.activity_events a
 JOIN public.message_objects m ON m.id=a.source_message_object_id
 WHERE a.id=p_source_id
   AND a.activity_context_code='commercial'
   AND a.commercial_processing_status IN ('analysis_ready','needs_review','failed')
   AND m.audience_scope_code='public' AND m.lifecycle_status='active'
 FOR SHARE OF a,m;
 IF NOT COALESCE(v_public,false) THEN
   RAISE EXCEPTION 'ADM4B2_SOURCE_NOT_VERIFIED_PUBLIC' USING ERRCODE='P0002'; END IF;

 SELECT id,case_code INTO v_case_id,v_case_code FROM public.arctor_admin_cases_adm2_v1
   WHERE source_system='arctor' AND source_entity_kind='commercial_activity_event'
     AND source_external_id=p_source_id::text LIMIT 1;
 IF FOUND THEN
   IF p_action='link' AND v_case_id IS DISTINCT FROM p_case_id
   THEN RAISE EXCEPTION 'ADM4B2_SOURCE_LINKED_TO_DIFFERENT_CASE' USING ERRCODE='23505'; END IF;
   RETURN pg_catalog.jsonb_build_object('ok',true,'contract','ARCTOR_ADM4B2_COMMERCIAL_INTAKE_V1',
     'caseId',v_case_id,'caseCode',v_case_code,'alreadyLinked',true,
     'idempotentReplay',false,'dbWritesPerformed',false,'agentExecutionPerformed',false);
 END IF;

 IF p_action='create' THEN
   v_case_code := 'ADM-'||pg_catalog.lpad(nextval('public.arctor_admin_adm2b2_case_code_seq'::regclass)::text,6,'0');
   v_title := 'Разбор коммерческой активности '||pg_catalog.left(p_source_id::text,8);
   INSERT INTO public.arctor_admin_cases_adm2_v1
    (case_code,title,description,case_type,priority,status,owner_role_code,accountable_role_code,
     source_system,source_entity_kind,source_external_id,source_path,next_expected_result,created_by_app_user_id)
   VALUES (v_case_code,v_title,'Публичный источник подтверждён; личные тексты и факты не копируются.',
      'operations','normal','assigned','commercial','commercial',
      'arctor','commercial_activity_event',p_source_id::text,'/admin/commercial-activities',
      v_expected,p_actor_user_id)
   RETURNING id INTO v_case_id;
   INSERT INTO public.arctor_admin_assignments_adm2_v1
      (case_id,recipient_role_code,assignment_text,required_result,created_by_app_user_id)
   VALUES(v_case_id,'commercial',v_task,v_expected,p_actor_user_id)
   RETURNING id INTO v_assignment_id;
   INSERT INTO public.arctor_admin_case_events_adm2_v1
      (case_id,event_kind,performed_by_type,performed_by_app_user_id,result_summary)
   VALUES(v_case_id,'created','admin',p_actor_user_id,'Создано дело '||v_case_code);
   INSERT INTO public.arctor_admin_case_events_adm2_v1
      (case_id,assignment_id,event_kind,performed_by_type,performed_by_app_user_id,result_summary)
   VALUES(v_case_id,v_assignment_id,'assigned','admin',p_actor_user_id,'Первое поручение: коммерческое направление');
 ELSE
   SELECT * INTO v_case FROM public.arctor_admin_cases_adm2_v1 WHERE id=p_case_id FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'ADM4B2_CASE_NOT_FOUND' USING ERRCODE='P0002'; END IF;
   IF v_case.status IN ('closed','resolved','cancelled')
      OR v_case.source_entity_kind IS NOT NULL OR v_case.source_external_id IS NOT NULL
      OR v_case.source_system NOT IN ('manual','admin_console')
   THEN RAISE EXCEPTION 'ADM4B2_CASE_INELIGIBLE' USING ERRCODE='23505'; END IF;
   UPDATE public.arctor_admin_cases_adm2_v1 SET
     source_system='arctor',source_entity_kind='commercial_activity_event',
     source_external_id=p_source_id::text,source_path='/admin/commercial-activities',updated_at=now()
   WHERE id=p_case_id;
   v_case_id:=p_case_id;
   v_case_code:=v_case.case_code;
 END IF;
 INSERT INTO public.arctor_admin_case_events_adm2_v1
    (case_id,event_kind,performed_by_type,performed_by_app_user_id,result_summary,details_json)
 VALUES(v_case_id,'attachment_registered','admin',p_actor_user_id,
    'Связан проверенный публичный коммерческий первоисточник',
    pg_catalog.jsonb_build_object('operationId',p_operation_id::text,
      'action','adm4b2_'||p_action,'requestHash',v_hash,'sourceSystem','arctor',
      'sourceKind','commercial_activity_event','sourceId',p_source_id::text));
 RETURN pg_catalog.jsonb_build_object('ok',true,'contract','ARCTOR_ADM4B2_COMMERCIAL_INTAKE_V1',
  'caseId',v_case_id,'caseCode',v_case_code,'alreadyLinked',false,
  'idempotentReplay',false,'dbWritesPerformed',true,'agentExecutionPerformed',false);
END;
$fn$;
REVOKE ALL ON FUNCTION public.arctor_admin_intake_commercial_adm4b2_v1(uuid,uuid,text,uuid,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.arctor_admin_intake_commercial_adm4b2_v1(uuid,uuid,text,uuid,uuid) TO service_role;
COMMIT;
