-- ARCTor.app PP1B canonical write paths postcheck
-- READ ONLY. Creates only a session-local TEMP result table.

create temporary table if not exists pg_temp.pp1b_postcheck_results (
  sort_order integer primary key,
  check_name text not null,
  passed boolean not null,
  details jsonb not null default '{}'::jsonb
) on commit preserve rows;
truncate table pg_temp.pp1b_postcheck_results;

insert into pg_temp.pp1b_postcheck_results values
(1,'01_fact_operation_table_exists',to_regclass('public.activity_fact_write_operations_pp1') is not null,jsonb_build_object('table',to_regclass('public.activity_fact_write_operations_pp1'))),
(2,'02_fact_attach_rpc_exists',to_regprocedure('public.attach_reality_facts_to_activity_pp1_v1(uuid,text,jsonb,jsonb,jsonb)') is not null,jsonb_build_object('procedure',to_regprocedure('public.attach_reality_facts_to_activity_pp1_v1(uuid,text,jsonb,jsonb,jsonb)'))),
(3,'03_operation_primary_key',exists(select 1 from pg_constraint c join pg_class r on r.oid=c.conrelid join pg_namespace n on n.oid=r.relnamespace where n.nspname='public' and r.relname='activity_fact_write_operations_pp1' and c.contype='p'),jsonb_build_object()),
(4,'04_operation_owner_user_fk',exists(select 1 from pg_constraint c join pg_class r on r.oid=c.conrelid join pg_namespace n on n.oid=r.relnamespace where n.nspname='public' and r.relname='activity_fact_write_operations_pp1' and c.contype='f' and pg_get_constraintdef(c.oid) like '%owner_user_id%app_users%'),jsonb_build_object()),
(5,'05_operation_owner_actor_fk',exists(select 1 from pg_constraint c join pg_class r on r.oid=c.conrelid join pg_namespace n on n.oid=r.relnamespace where n.nspname='public' and r.relname='activity_fact_write_operations_pp1' and c.contype='f' and pg_get_constraintdef(c.oid) like '%owner_actor_id%actors%'),jsonb_build_object()),
(6,'06_operation_activity_fk',exists(select 1 from pg_constraint c join pg_class r on r.oid=c.conrelid join pg_namespace n on n.oid=r.relnamespace where n.nspname='public' and r.relname='activity_fact_write_operations_pp1' and c.contype='f' and pg_get_constraintdef(c.oid) like '%activity_event_id%activity_events%'),jsonb_build_object()),
(7,'07_operation_idempotency_unique',exists(select 1 from pg_constraint c join pg_class r on r.oid=c.conrelid join pg_namespace n on n.oid=r.relnamespace where n.nspname='public' and r.relname='activity_fact_write_operations_pp1' and c.contype='u' and pg_get_constraintdef(c.oid) like '%owner_user_id, owner_actor_id, idempotency_key%'),jsonb_build_object()),
(8,'08_operation_event_index',to_regclass('public.activity_fact_write_operations_pp1_event_idx') is not null,jsonb_build_object('index',to_regclass('public.activity_fact_write_operations_pp1_event_idx'))),
(9,'09_operation_rls_enabled',coalesce((select relrowsecurity from pg_class r join pg_namespace n on n.oid=r.relnamespace where n.nspname='public' and r.relname='activity_fact_write_operations_pp1'),false),jsonb_build_object()),
(10,'10_anon_no_operation_privileges',not has_table_privilege('anon','public.activity_fact_write_operations_pp1','select,insert,update,delete'),jsonb_build_object()),
(11,'11_authenticated_no_operation_privileges',not has_table_privilege('authenticated','public.activity_fact_write_operations_pp1','select,insert,update,delete'),jsonb_build_object()),
(12,'12_service_role_operation_select',has_table_privilege('service_role','public.activity_fact_write_operations_pp1','select'),jsonb_build_object()),
(13,'13_anon_no_rpc_execute',not has_function_privilege('anon','public.attach_reality_facts_to_activity_pp1_v1(uuid,text,jsonb,jsonb,jsonb)','execute'),jsonb_build_object()),
(14,'14_authenticated_no_rpc_execute',not has_function_privilege('authenticated','public.attach_reality_facts_to_activity_pp1_v1(uuid,text,jsonb,jsonb,jsonb)','execute'),jsonb_build_object()),
(15,'15_service_role_rpc_execute',has_function_privilege('service_role','public.attach_reality_facts_to_activity_pp1_v1(uuid,text,jsonb,jsonb,jsonb)','execute'),jsonb_build_object()),
(16,'16_rpc_security_definer',coalesce((select p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.oid=to_regprocedure('public.attach_reality_facts_to_activity_pp1_v1(uuid,text,jsonb,jsonb,jsonb)')),false),jsonb_build_object()),
(17,'17_rpc_returns_jsonb',(select pg_get_function_result(to_regprocedure('public.attach_reality_facts_to_activity_pp1_v1(uuid,text,jsonb,jsonb,jsonb)')))='jsonb',jsonb_build_object()),
(18,'18_pp1_create_rpc_preserved',to_regprocedure('public.create_activity_event_pp1_v1(uuid,uuid,text,jsonb,uuid[])') is not null,jsonb_build_object()),
(19,'19_reality_save_rpc_preserved',to_regprocedure('public.save_reality_activity_v1(uuid,text,jsonb,jsonb,jsonb)') is not null,jsonb_build_object()),
(20,'20_activity_role_registry_preserved',(select count(*) from public.activity_role_types where status='active')=2,jsonb_build_object('rowCount',(select count(*) from public.activity_role_types where status='active'))),
(21,'21_schedule_registry_preserved',(select count(*) from public.activity_schedule_modes where status='active')=5,jsonb_build_object('rowCount',(select count(*) from public.activity_schedule_modes where status='active'))),
(22,'22_operation_table_empty',not exists(select 1 from public.activity_fact_write_operations_pp1),jsonb_build_object('rowCount',(select count(*) from public.activity_fact_write_operations_pp1))),
(23,'23_activity_events_empty',not exists(select 1 from public.activity_events),jsonb_build_object('rowCount',(select count(*) from public.activity_events))),
(24,'24_calendar_events_empty',not exists(select 1 from public.calendar_events),jsonb_build_object('rowCount',(select count(*) from public.calendar_events))),
(25,'25_value_objects_and_p10_preserved',(select count(*) from public.value_objects)>=3 and (select count(*) from public.value_object_relations)>=1,jsonb_build_object('valueObjects',(select count(*) from public.value_objects),'semanticRelations',(select count(*) from public.value_object_relations)));

select sort_order,check_name,passed,details
from pg_temp.pp1b_postcheck_results
order by sort_order;
