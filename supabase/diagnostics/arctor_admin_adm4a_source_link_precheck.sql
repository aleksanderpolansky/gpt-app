-- ARCTOR_ADM4A_SOURCE_LINK_PRECHECK_V1
-- Read only. No migration management and no write permissions granted.
WITH checks AS (
 SELECT
   to_regclass('public.arctor_admin_cases_adm2_v1') IS NOT NULL AS cases_exist,
   to_regclass('public.arctor_admin_case_events_adm2_v1') IS NOT NULL AS events_exist,
   to_regclass('public.activity_templates') IS NOT NULL AS templates_exist,
   to_regclass('public.message_objects') IS NOT NULL AS messages_exist,
   to_regprocedure('public.arctor_admin_apply_case_action_adm2b2_v1(uuid,uuid,text,jsonb)') IS NOT NULL AS adm2b2_exists,
   to_regprocedure('public.arctor_admin_link_case_source_adm4a_v1(uuid,uuid,text,uuid)') IS NULL AS adm4a_absent,
   (SELECT count(*)=8 FROM public.arctor_admin_roles_adm2_v1) AS roles_eight,
   (SELECT count(*) FROM public.arctor_admin_cases_adm2_v1) AS cases,
   (SELECT count(*) FROM public.arctor_admin_case_events_adm2_v1) AS events,
   (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='arctor_admin_cases_adm2_v1' AND column_name IN ('source_system','source_entity_kind','source_external_id','source_path'))=4 AS case_source_columns,
   (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='activity_templates' AND column_name IN ('id','title','template_scope','visibility'))=4 AS template_columns,
   (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='message_objects' AND column_name IN ('id','title','audience_scope_code','lifecycle_status'))=4 AS message_columns,
   (SELECT count(*) FROM pg_indexes WHERE schemaname='public' AND tablename='arctor_admin_cases_adm2_v1' AND indexname='arctor_admin_cases_adm2_source_uidx')=1 AS source_unique_index,
   NOT has_table_privilege('authenticated','public.arctor_admin_cases_adm2_v1','UPDATE') AS no_direct_authenticated_update,
   NOT has_table_privilege('anon','public.arctor_admin_cases_adm2_v1','UPDATE') AS no_direct_anon_update
)
SELECT 'ARCTOR_ADM4A_SOURCE_LINK_PRECHECK_V1' AS contract,
 CASE WHEN cases_exist AND events_exist AND templates_exist AND messages_exist AND adm2b2_exists AND adm4a_absent AND roles_eight
   AND case_source_columns AND template_columns AND message_columns AND source_unique_index
   AND no_direct_authenticated_update AND no_direct_anon_update THEN 'PASS' ELSE 'STOP' END AS result,
 *, false AS db_writes_performed
FROM checks;
