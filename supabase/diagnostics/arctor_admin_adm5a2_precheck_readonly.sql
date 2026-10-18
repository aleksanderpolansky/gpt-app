-- ADM5A2_READ_ONLY_PRECHECK_V1; SQL Editor ONLY. No writes, no transaction commits, no agents.
-- Run manually in Supabase SQL Editor; return one row and send result to ChatGPT.
WITH state AS (
 SELECT
  (SELECT count(*) FROM public.arctor_admin_roles_adm2_v1) AS roles_total,
  (SELECT count(*) FROM public.arctor_admin_roles_adm2_v1 WHERE is_active) AS active_roles,
  (SELECT count(*) FROM public.arctor_admin_roles_adm2_v1 WHERE agent_execution_enabled) AS agents_enabled,
  (SELECT count(*) FROM public.arctor_admin_roles_adm2_v1 WHERE role_code IN
   ('process','product','semantic','ai','engineering','quality','commercial','support')) AS expected_roles,
  to_regclass('public.arctor_admin_assignments_adm2_v1') IS NOT NULL AS assignments_exist,
  to_regclass('public.arctor_admin_case_events_adm2_v1') IS NOT NULL AS events_exist,
  to_regclass('public.arctor_admin_cases_adm2_v1') IS NOT NULL AS cases_exist,
  to_regprocedure('public.arctor_admin_apply_case_action_adm2b2_v1(uuid,uuid,text,jsonb)') IS NOT NULL AS action_rpc_exists,
  COALESCE(position('NOT agent_execution_enabled' IN pg_get_functiondef(
   to_regprocedure('public.arctor_admin_apply_case_action_adm2b2_v1(uuid,uuid,text,jsonb)'))) > 0,false) AS human_route_flag_conflict_present,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
    AND table_name='arctor_admin_assignments_adm2_v1' AND column_name='recipient_agent_code') AS agent_column_exists,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
    AND table_name='arctor_admin_assignments_adm2_v1' AND column_name='recipient_app_user_id') AS human_column_exists,
  NOT has_table_privilege('authenticated','public.arctor_admin_case_events_adm2_v1','INSERT') AS browser_audit_insert_denied,
  NOT has_table_privilege('authenticated','public.arctor_admin_assignments_adm2_v1','INSERT') AS browser_assignment_insert_denied
)
SELECT 'ARCTOR_ADM5A2_PRECHECK_READ_ONLY_V1' AS contract,
 CASE WHEN roles_total=8 AND active_roles=8 AND agents_enabled=0 AND expected_roles=8
   AND assignments_exist AND events_exist AND cases_exist AND action_rpc_exists
   AND human_route_flag_conflict_present AND agent_column_exists AND human_column_exists
   AND browser_audit_insert_denied AND browser_assignment_insert_denied
  THEN 'PASS_DESIGN_ONLY' ELSE 'REVIEW_REQUIRED' END AS result,
 *, false AS db_writes_performed, false AS agent_execution_performed
FROM state;
