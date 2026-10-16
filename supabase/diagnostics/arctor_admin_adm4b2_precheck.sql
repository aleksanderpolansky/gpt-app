-- ADM-4B2 preflight. READ ONLY: Run manually in Supabase SQL Editor.
WITH checks AS (
SELECT
 to_regclass('public.arctor_admin_cases_adm2_v1') IS NOT NULL AS cases_exist,
 to_regclass('public.arctor_admin_assignments_adm2_v1') IS NOT NULL AS assignments_exist,
 to_regclass('public.arctor_admin_case_events_adm2_v1') IS NOT NULL AS events_exist,
 to_regclass('public.activity_events') IS NOT NULL AS activities_exist,
 to_regclass('public.message_objects') IS NOT NULL AS messages_exist,
 to_regclass('public.arctor_admin_adm2b2_case_code_seq') IS NOT NULL AS sequence_exists,
 to_regprocedure('public.arctor_admin_link_case_source_adm4a_v1(uuid,uuid,text,uuid)') IS NOT NULL AS adm4a_installed,
 to_regprocedure('public.arctor_admin_intake_commercial_adm4b2_v1(uuid,uuid,text,uuid,uuid)') IS NULL AS adm4b2_absent,
 (SELECT count(*)=8 FROM public.arctor_admin_roles_adm2_v1) AS roles_eight,
 (SELECT count(*)=0 FROM public.arctor_admin_roles_adm2_v1 WHERE agent_execution_enabled) AS agents_off,
 (SELECT count(*)=1 FROM public.arctor_admin_roles_adm2_v1 WHERE role_code='commercial' AND is_active) AS commercial_role,
 (SELECT count(*)=1 FROM pg_indexes WHERE schemaname='public' AND tablename='arctor_admin_cases_adm2_v1' AND indexname='arctor_admin_cases_adm2_source_uidx') AS source_unique_index,
 (SELECT count(*)=4 FROM information_schema.columns WHERE table_schema='public' AND table_name='arctor_admin_cases_adm2_v1' AND column_name IN ('accountable_role_code','source_system','source_entity_kind','source_external_id')) AS case_columns,
 (SELECT count(*)=4 FROM information_schema.columns WHERE table_schema='public' AND table_name='activity_events' AND column_name IN ('id','activity_context_code','commercial_processing_status','source_message_object_id')) AS activity_columns,
 (SELECT count(*)=3 FROM information_schema.columns WHERE table_schema='public' AND table_name='message_objects' AND column_name IN ('id','audience_scope_code','lifecycle_status')) AS message_columns,
 NOT has_table_privilege('authenticated','public.arctor_admin_cases_adm2_v1','INSERT') AS no_browser_case_insert,
 NOT has_table_privilege('anon','public.arctor_admin_cases_adm2_v1','INSERT') AS no_anon_case_insert,
 NOT has_table_privilege('service_role','public.arctor_admin_case_events_adm2_v1','UPDATE') AS history_append_only,
 (SELECT count(*) FROM public.arctor_admin_cases_adm2_v1) AS cases,
 (SELECT count(*) FROM public.arctor_admin_assignments_adm2_v1) AS assignments,
 (SELECT count(*) FROM public.arctor_admin_case_events_adm2_v1) AS events,
 (SELECT count(*) FROM public.activity_events a JOIN public.message_objects m ON m.id=a.source_message_object_id
   WHERE a.activity_context_code='commercial' AND a.commercial_processing_status IN ('analysis_ready','needs_review','failed')
      AND m.audience_scope_code='public' AND m.lifecycle_status='active') AS eligible_public_sources
)
SELECT 'ARCTOR_ADM4B2_COMMERCIAL_PRECHECK_V1' AS contract,
 CASE WHEN cases_exist AND assignments_exist AND events_exist AND activities_exist AND messages_exist
 AND sequence_exists AND adm4a_installed AND adm4b2_absent AND roles_eight AND agents_off AND commercial_role
 AND source_unique_index AND case_columns AND activity_columns AND message_columns
 AND no_browser_case_insert AND no_anon_case_insert AND history_append_only THEN 'PASS' ELSE 'STOP' END AS result,
 *, false AS db_writes_performed FROM checks;
