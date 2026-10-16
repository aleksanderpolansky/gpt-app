-- ARCTOR_ADMIN_ADM2B2_QA_PRECHECK_V1 | READ ONLY
WITH checks AS (
 SELECT
  to_regprocedure('public.arctor_admin_apply_case_action_adm2b2_v1(uuid,uuid,text,jsonb)') IS NOT NULL AS original_function,
  to_regprocedure('pg_catalog.sha256(bytea)') IS NOT NULL AS sha256_builtin,
  to_regclass('public.arctor_admin_events_adm2b2_operation_uidx') IS NOT NULL AS unique_index,
  (SELECT count(*) FROM public.arctor_admin_roles_adm2_v1)=8 AS eight_roles,
  (SELECT count(*) FROM public.arctor_admin_roles_adm2_v1 WHERE agent_execution_enabled)=0 AS agents_off,
  NOT has_function_privilege('anon','public.arctor_admin_apply_case_action_adm2b2_v1(uuid,uuid,text,jsonb)','EXECUTE')
   AND NOT has_function_privilege('authenticated','public.arctor_admin_apply_case_action_adm2b2_v1(uuid,uuid,text,jsonb)','EXECUTE')
   AND has_function_privilege('service_role','public.arctor_admin_apply_case_action_adm2b2_v1(uuid,uuid,text,jsonb)','EXECUTE') AS safe_permissions,
  NOT (has_table_privilege('service_role','public.arctor_admin_case_events_adm2_v1','UPDATE')
    OR has_table_privilege('service_role','public.arctor_admin_case_events_adm2_v1','DELETE')
    OR has_table_privilege('service_role','public.arctor_admin_case_events_adm2_v1','TRUNCATE')) AS immutable_history,
  (SELECT count(*) FROM public.arctor_admin_cases_adm2_v1) AS cases,
  (SELECT count(*) FROM public.arctor_admin_assignments_adm2_v1) AS assignments,
  (SELECT count(*) FROM public.arctor_admin_case_events_adm2_v1) AS events
)
SELECT jsonb_pretty(jsonb_build_object(
 'contract','ARCTOR_ADMIN_ADM2B2_QA_PRECHECK_V1',
 'result',CASE WHEN original_function AND sha256_builtin AND unique_index AND eight_roles AND agents_off AND safe_permissions AND immutable_history THEN 'PASS' ELSE 'STOP' END,
 'originalFunction',original_function,'sha256Builtin',sha256_builtin,'operationUniqueIndex',unique_index,
 'rolesEight',eight_roles,'agentsOff',agents_off,'safePermissions',safe_permissions,
 'immutableHistory',immutable_history,'cases',cases,'assignments',assignments,'events',events,'dbWritesPerformed',false
)) AS arctor_admin_adm2b2_qa_precheck_report FROM checks;
