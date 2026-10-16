-- ARCTOR_ADM4A_SOURCE_LINK_APPLY_V1
-- Apply only by a human through Supabase SQL Editor after PRECHECK PASS.
-- Reuses ADM2 case fields and existing source unique index. Does NOT copy source rows.
-- Two privacy-scoped source families only; other queues require separate explicit adapters.
BEGIN;
DO $guard$
BEGIN
 IF to_regclass('public.arctor_admin_cases_adm2_v1') IS NULL
    OR to_regclass('public.arctor_admin_case_events_adm2_v1') IS NULL
    OR to_regclass('public.activity_templates') IS NULL
    OR to_regclass('public.message_objects') IS NULL
    OR to_regprocedure('public.arctor_admin_apply_case_action_adm2b2_v1(uuid,uuid,text,jsonb)') IS NULL
    OR to_regprocedure('public.arctor_admin_link_case_source_adm4a_v1(uuid,uuid,text,uuid)') IS NOT NULL
 THEN RAISE EXCEPTION 'ADM4A_STOP_SCHEMA_NOT_EXPECTED'; END IF;
 IF has_table_privilege('authenticated','public.arctor_admin_cases_adm2_v1','UPDATE')
    OR has_table_privilege('anon','public.arctor_admin_cases_adm2_v1','UPDATE')
 THEN RAISE EXCEPTION 'ADM4A_STOP_CASE_DIRECT_WRITE_GRANT'; END IF;
END $guard$;

CREATE FUNCTION public.arctor_admin_link_case_source_adm4a_v1(
 p_actor_user_id uuid,
 p_case_id uuid,
 p_source_kind text,
 p_source_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $fn$
DECLARE
 v_case public.arctor_admin_cases_adm2_v1%ROWTYPE;
 v_kind text;
 v_path text;
BEGIN
 IF p_actor_user_id IS NULL OR p_case_id IS NULL OR p_source_id IS NULL OR p_source_kind IS NULL
    OR p_source_kind NOT IN ('activity_template','public_message')
 THEN RAISE EXCEPTION 'ADM4A_BAD_INPUT' USING ERRCODE='22023'; END IF;

 -- Never assert that a user-private source is verified. Existence and scope enforced in DB.
 IF p_source_kind='activity_template' THEN
    IF NOT EXISTS (SELECT 1 FROM public.activity_templates
         WHERE id=p_source_id AND template_scope='system' AND owner_user_id IS NULL
           AND visibility IN ('public','public_template'))
    THEN RAISE EXCEPTION 'ADM4A_SOURCE_NOT_ELIGIBLE' USING ERRCODE='P0002'; END IF;
    v_kind := 'activity_template';
    v_path := '/activity-templates';
 ELSIF p_source_kind='public_message' THEN
    IF NOT EXISTS (SELECT 1 FROM public.message_objects
         WHERE id=p_source_id AND audience_scope_code='public' AND lifecycle_status='active')
    THEN RAISE EXCEPTION 'ADM4A_SOURCE_NOT_ELIGIBLE' USING ERRCODE='P0002'; END IF;
    v_kind := 'message_object';
    v_path := '/publications';
 END IF;

 SELECT * INTO v_case FROM public.arctor_admin_cases_adm2_v1 WHERE id=p_case_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'ADM4A_CASE_NOT_FOUND' USING ERRCODE='P0002'; END IF;
 IF v_case.status IN ('closed','cancelled') THEN
    RAISE EXCEPTION 'ADM4A_CASE_FINAL_STATE' USING ERRCODE='22023'; END IF;

 IF v_case.source_system='arctor' AND v_case.source_entity_kind=v_kind
    AND v_case.source_external_id=p_source_id::text THEN
    RETURN jsonb_build_object('ok',true,'contract','ARCTOR_ADM4A_SOURCE_LINK_V1',
       'caseId',p_case_id,'sourceKind',p_source_kind,'alreadyLinked',true,'dbWritesPerformed',false);
 END IF;
 IF v_case.source_entity_kind IS NOT NULL OR v_case.source_external_id IS NOT NULL
    OR v_case.source_system NOT IN ('manual','admin_console') THEN
    RAISE EXCEPTION 'ADM4A_CASE_ALREADY_LINKED' USING ERRCODE='23505'; END IF;

 -- Source uniqueness across cases is guarded by existing partial unique index.
 UPDATE public.arctor_admin_cases_adm2_v1
 SET source_system='arctor',source_entity_kind=v_kind,source_external_id=p_source_id::text,
     source_path=v_path,updated_at=now()
 WHERE id=p_case_id;
 INSERT INTO public.arctor_admin_case_events_adm2_v1(
   case_id,event_kind,performed_by_type,performed_by_app_user_id,result_summary,details_json)
 VALUES (p_case_id,'attachment_registered','admin',p_actor_user_id,
   'Проверенный первоисточник привязан к делу: '||v_kind,
   pg_catalog.jsonb_build_object('sourceSystem','arctor','sourceKind',v_kind,'sourceId',p_source_id::text));
 RETURN pg_catalog.jsonb_build_object('ok',true,'contract','ARCTOR_ADM4A_SOURCE_LINK_V1',
   'caseId',p_case_id,'sourceKind',p_source_kind,'alreadyLinked',false,'dbWritesPerformed',true);
END;
$fn$;

REVOKE ALL ON FUNCTION public.arctor_admin_link_case_source_adm4a_v1(uuid,uuid,text,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.arctor_admin_link_case_source_adm4a_v1(uuid,uuid,text,uuid) TO service_role;
COMMIT;
