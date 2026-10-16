-- ARCTOR_ADMIN_ADM2B2_QA_POSTCHECK_V1 | READ ONLY
WITH checks AS (
 SELECT
  (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public'
    AND table_name='arctor_admin_cases_adm2_v1' AND column_name='accountable_role_code'
    AND is_nullable='NO')) AS accountable_column_required,
  to_regprocedure('public.arctor_admin_guard_case_accountability_adm2b2_v1()') IS NOT NULL AS guard_function,
  (SELECT count(*)=1 FROM pg_catalog.pg_trigger WHERE tgrelid='public.arctor_admin_cases_adm2_v1'::regclass
    AND tgname='arctor_admin_accountability_immutable_adm2b2_v1' AND tgenabled IN ('O','A') AND NOT tgisinternal) AS accountability_trigger,
  (SELECT count(*)=0 FROM public.arctor_admin_cases_adm2_v1 WHERE accountable_role_code IS NULL) AS all_cases_accountable,
  (SELECT count(*) FROM public.arctor_admin_cases_adm2_v1 WHERE accountable_role_code <> owner_role_code) AS handed_off_cases,
  (pg_catalog.pg_get_functiondef('public.arctor_admin_apply_case_action_adm2b2_v1(uuid,uuid,text,jsonb)'::regprocedure)
    LIKE '%v_request_hash%' AND
   pg_catalog.pg_get_functiondef('public.arctor_admin_apply_case_action_adm2b2_v1(uuid,uuid,text,jsonb)'::regprocedure)
    LIKE '%OPERATION_ID_REUSED_OR_LEGACY_UNVERIFIABLE%' AND
   pg_catalog.pg_get_functiondef('public.arctor_admin_apply_case_action_adm2b2_v1(uuid,uuid,text,jsonb)'::regprocedure)
    LIKE '%accountable_role_code%') AS function_hardened,
  NOT has_function_privilege('anon','public.arctor_admin_apply_case_action_adm2b2_v1(uuid,uuid,text,jsonb)','EXECUTE')
   AND NOT has_function_privilege('authenticated','public.arctor_admin_apply_case_action_adm2b2_v1(uuid,uuid,text,jsonb)','EXECUTE')
   AND has_function_privilege('service_role','public.arctor_admin_apply_case_action_adm2b2_v1(uuid,uuid,text,jsonb)','EXECUTE') AS safe_permissions,
  (SELECT count(*) FROM public.arctor_admin_roles_adm2_v1 WHERE agent_execution_enabled)=0 AS agents_off,
  (SELECT count(*) FROM public.arctor_admin_cases_adm2_v1) AS cases,
  (SELECT count(*) FROM public.arctor_admin_assignments_adm2_v1) AS assignments,
  (SELECT count(*) FROM public.arctor_admin_case_events_adm2_v1) AS events
)
SELECT jsonb_pretty(jsonb_build_object(
 'contract','ARCTOR_ADMIN_ADM2B2_QA_POSTCHECK_V1',
 'result',CASE WHEN accountable_column_required AND guard_function AND accountability_trigger
  AND all_cases_accountable AND function_hardened AND safe_permissions AND agents_off THEN 'PASS' ELSE 'STOP' END,
 'accountabilityColumnRequired',accountable_column_required, 'guardFunction',guard_function,
 'accountabilityTrigger',accountability_trigger,'allCasesAccountable',all_cases_accountable,
 'casesWithDifferentCurrentRoute',handed_off_cases,'fullRequestReplayGuard',function_hardened,
 'safePermissions',safe_permissions,'agentsOff',agents_off,
 'cases',cases,'assignments',assignments,'events',events,'dbWritesPerformed',false
)) AS arctor_admin_adm2b2_qa_postcheck_report FROM checks;
