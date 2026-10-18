-- ADM-5B.1. READ ONLY. Execute MANUALLY in Supabase SQL Editor if needed.
WITH cases AS (
 SELECT id,case_code,source_external_id,source_entity_kind,source_system
 FROM public.arctor_admin_cases_adm2_v1
 WHERE case_code='ADM-000001'
), assignments AS (
 SELECT count(*) AS n FROM public.arctor_admin_assignments_adm2_v1
 WHERE case_id IN (SELECT id FROM cases)
), public_source AS (
 SELECT count(*) AS n
 FROM public.activity_events a
 JOIN public.message_objects m ON m.id=a.source_message_object_id
 WHERE a.id::text IN (SELECT source_external_id FROM cases)
   AND a.activity_context_code='commercial'
   AND m.audience_scope_code='public' AND m.lifecycle_status='active'
)
SELECT 'ARCTOR_ADM5B1_READ_ONLY_PRECHECK_V1' AS contract,
 (SELECT count(*) FROM cases) AS case_count,
 (SELECT n FROM assignments) AS assignments_count,
 (SELECT n FROM public_source) AS active_public_sources,
 (SELECT count(*) FROM public.arctor_admin_roles_adm2_v1 WHERE is_active) AS active_roles,
 (SELECT count(*) FROM public.arctor_admin_roles_adm2_v1 WHERE agent_execution_enabled) AS agent_flags_enabled,
 false AS db_writes_performed, false AS model_calls_performed;
