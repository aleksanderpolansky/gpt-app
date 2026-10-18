-- ARCTOR ADM-5B.3 -- run after manual migration, before clicking 'save'. No writes.
WITH s AS (
 SELECT
   to_regclass('public.arctor_admin_context_snapshots_adm5b3_v1') IS NOT NULL snapshots_exist,
   to_regclass('public.arctor_admin_context_snapshot_events_adm5b3_v1') IS NOT NULL events_exist,
   to_regprocedure('public.arctor_admin_context_snapshot_capture_adm5b3_v1(uuid,uuid,uuid,uuid,text,text,text,text,text)') IS NOT NULL capture_exists,
   to_regprocedure('public.arctor_admin_context_snapshot_decide_adm5b3_v1(uuid,uuid,uuid,text,text,text)') IS NOT NULL decide_exists,
   NOT has_table_privilege('authenticated','public.arctor_admin_context_snapshots_adm5b3_v1','SELECT') browser_snapshot_read_denied,
   NOT has_table_privilege('authenticated','public.arctor_admin_context_snapshots_adm5b3_v1','INSERT') browser_snapshot_write_denied,
   NOT has_table_privilege('authenticated','public.arctor_admin_context_snapshot_events_adm5b3_v1','INSERT') browser_audit_write_denied,
   NOT has_function_privilege('authenticated','public.arctor_admin_context_snapshot_capture_adm5b3_v1(uuid,uuid,uuid,uuid,text,text,text,text,text)','EXECUTE') browser_rpc_denied,
   has_function_privilege('service_role','public.arctor_admin_context_snapshot_capture_adm5b3_v1(uuid,uuid,uuid,uuid,text,text,text,text,text)','EXECUTE') service_rpc_allowed,
   (SELECT count(*) FROM pg_trigger WHERE tgrelid='public.arctor_admin_context_snapshots_adm5b3_v1'::regclass AND tgname='adm5b3_snapshot_no_mutation')=1 snapshot_immutable_guard,
   (SELECT count(*) FROM pg_trigger WHERE tgrelid='public.arctor_admin_context_snapshot_events_adm5b3_v1'::regclass AND tgname='adm5b3_events_no_mutation')=1 events_immutable_guard,
   (SELECT count(*) FROM public.arctor_admin_roles_adm2_v1 WHERE agent_execution_enabled)=0 agents_off
)
SELECT 'ARCTOR_ADM5B3_POSTCHECK_READ_ONLY_V1' contract,
 CASE WHEN snapshots_exist AND events_exist AND capture_exists AND decide_exists
    AND browser_snapshot_read_denied AND browser_snapshot_write_denied AND browser_audit_write_denied
    AND browser_rpc_denied AND service_rpc_allowed AND snapshot_immutable_guard AND events_immutable_guard AND agents_off
 THEN 'PASS' ELSE 'REVIEW_REQUIRED' END result,
 *,false db_writes_performed,false agents_executed FROM s;
