-- ARCTOR_ADM4A_SOURCE_LINK_POSTCHECK_V1
-- No user data is modified; no sample case is created.
WITH checks AS (
 SELECT
 to_regprocedure('public.arctor_admin_link_case_source_adm4a_v1(uuid,uuid,text,uuid)') IS NOT NULL AS installed,
 has_function_privilege('service_role','public.arctor_admin_link_case_source_adm4a_v1(uuid,uuid,text,uuid)','EXECUTE') AS service_execute,
 NOT has_function_privilege('authenticated','public.arctor_admin_link_case_source_adm4a_v1(uuid,uuid,text,uuid)','EXECUTE') AS authenticated_denied,
 NOT has_function_privilege('anon','public.arctor_admin_link_case_source_adm4a_v1(uuid,uuid,text,uuid)','EXECUTE') AS anon_denied,
 (SELECT count(*) FROM public.arctor_admin_cases_adm2_v1) AS cases,
 (SELECT count(*) FROM public.arctor_admin_assignments_adm2_v1) AS assignments,
 (SELECT count(*) FROM public.arctor_admin_case_events_adm2_v1) AS events,
 (SELECT count(*) FROM public.arctor_admin_roles_adm2_v1 WHERE agent_execution_enabled)=0 AS agents_off,
 (SELECT count(*) FROM pg_indexes WHERE schemaname='public' AND tablename='arctor_admin_cases_adm2_v1' AND indexname='arctor_admin_cases_adm2_source_uidx')=1 AS source_unique_index
)
SELECT 'ARCTOR_ADM4A_SOURCE_LINK_POSTCHECK_V1' AS contract,
 CASE WHEN installed AND service_execute AND authenticated_denied AND anon_denied
 AND agents_off AND source_unique_index THEN 'PASS' ELSE 'STOP' END AS result,
 *, false AS db_writes_performed FROM checks;
