-- ARCTOR_ADM5B3_PRECHECK_READ_ONLY_V1
-- Run this FIRST in Supabase SQL Editor. Never writes or runs agents.
WITH state AS (
  SELECT
    to_regclass('public.arctor_admin_cases_adm2_v1') IS NOT NULL AS cases_exist,
    to_regclass('public.arctor_admin_assignments_adm2_v1') IS NOT NULL AS assignments_exist,
    to_regclass('public.arctor_admin_roles_adm2_v1') IS NOT NULL AS roles_exist,
    to_regclass('public.app_users') IS NOT NULL AS users_exist,
    to_regclass('public.platform_admins') IS NOT NULL AS admins_exist,
    to_regclass('public.arctor_admin_context_snapshots_adm5b3_v1') IS NULL AS snapshots_absent,
    to_regclass('public.arctor_admin_context_snapshot_events_adm5b3_v1') IS NULL AS snapshot_events_absent,
    to_regprocedure('public.arctor_admin_context_snapshot_capture_adm5b3_v1(uuid,uuid,uuid,uuid,text,text,text,text,text)') IS NULL AS capture_rpc_absent,
    to_regprocedure('public.arctor_admin_context_snapshot_decide_adm5b3_v1(uuid,uuid,uuid,text,text,text)') IS NULL AS decide_rpc_absent,
    to_regprocedure('pg_catalog.sha256(bytea)') IS NOT NULL AS pg_sha256_exists,
    EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') AS service_role_exists,
    (SELECT count(*) FROM public.arctor_admin_roles_adm2_v1) AS role_count,
    (SELECT count(*) FROM public.arctor_admin_roles_adm2_v1 WHERE agent_execution_enabled) AS enabled_agents,
    (SELECT count(*) FROM public.arctor_admin_cases_adm2_v1 WHERE case_code='ADM-000001') AS control_case_count
)
SELECT 'ARCTOR_ADM5B3_PRECHECK_READ_ONLY_V1' AS contract,
 CASE WHEN cases_exist AND assignments_exist AND roles_exist AND users_exist AND admins_exist
       AND snapshots_absent AND snapshot_events_absent AND capture_rpc_absent AND decide_rpc_absent
       AND pg_sha256_exists AND service_role_exists AND role_count=8 AND enabled_agents=0
 THEN 'PASS_READY_FOR_MANUAL_SQL' ELSE 'STOP_REVIEW_REQUIRED' END AS result,
 *, false AS db_writes_performed, false AS agents_executed
FROM state;
