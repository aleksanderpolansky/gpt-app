-- ADM-4B2 postflight. READ ONLY.
WITH checks AS (
 SELECT
 to_regprocedure('public.arctor_admin_intake_commercial_adm4b2_v1(uuid,uuid,text,uuid,uuid)') IS NOT NULL AS installed,
 has_function_privilege('service_role','public.arctor_admin_intake_commercial_adm4b2_v1(uuid,uuid,text,uuid,uuid)','EXECUTE') AS service_execute,
 NOT has_function_privilege('anon','public.arctor_admin_intake_commercial_adm4b2_v1(uuid,uuid,text,uuid,uuid)','EXECUTE') AS anon_denied,
 NOT has_function_privilege('authenticated','public.arctor_admin_intake_commercial_adm4b2_v1(uuid,uuid,text,uuid,uuid)','EXECUTE') AS authenticated_denied,
 (SELECT count(*)=0 FROM public.arctor_admin_roles_adm2_v1 WHERE agent_execution_enabled) AS agents_off,
 (SELECT count(*) FROM public.arctor_admin_cases_adm2_v1) AS cases,
 (SELECT count(*) FROM public.arctor_admin_assignments_adm2_v1) AS assignments,
 (SELECT count(*) FROM public.arctor_admin_case_events_adm2_v1) AS events
)
SELECT 'ARCTOR_ADM4B2_COMMERCIAL_POSTCHECK_V1' AS contract,
 CASE WHEN installed AND service_execute AND anon_denied AND authenticated_denied AND agents_off THEN 'PASS' ELSE 'STOP' END AS result,
 *,false AS db_writes_performed FROM checks;
