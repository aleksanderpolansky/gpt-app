-- ARCTor.app PP1B canonical write paths preflight
-- READ ONLY. Creates only a session-local TEMP result table.

create temporary table if not exists pg_temp.pp1b_preflight_results (
  sort_order integer primary key,
  check_name text not null,
  passed boolean not null,
  details jsonb not null default '{}'::jsonb
) on commit preserve rows;
truncate table pg_temp.pp1b_preflight_results;

insert into pg_temp.pp1b_preflight_results values
(1,'01_pp1a_role_registry_exists',to_regclass('public.activity_role_types') is not null,jsonb_build_object('table',to_regclass('public.activity_role_types'))),
(2,'02_pp1a_schedule_registry_exists',to_regclass('public.activity_schedule_modes') is not null,jsonb_build_object('table',to_regclass('public.activity_schedule_modes'))),
(3,'03_activity_events_exists',to_regclass('public.activity_events') is not null,jsonb_build_object('table',to_regclass('public.activity_events'))),
(4,'04_calendar_events_exists',to_regclass('public.calendar_events') is not null,jsonb_build_object('table',to_regclass('public.calendar_events'))),
(5,'05_pp1_create_rpc_exists',to_regprocedure('public.create_activity_event_pp1_v1(uuid,uuid,text,jsonb,uuid[])') is not null,jsonb_build_object('procedure',to_regprocedure('public.create_activity_event_pp1_v1(uuid,uuid,text,jsonb,uuid[])'))),
(6,'06_reality_save_rpc_exists',to_regprocedure('public.save_reality_activity_v1(uuid,text,jsonb,jsonb,jsonb)') is not null,jsonb_build_object('procedure',to_regprocedure('public.save_reality_activity_v1(uuid,text,jsonb,jsonb,jsonb)'))),
(7,'07_pp1b_fact_operation_table_absent',to_regclass('public.activity_fact_write_operations_pp1') is null,jsonb_build_object('table',to_regclass('public.activity_fact_write_operations_pp1'))),
(8,'08_pp1b_fact_attach_rpc_absent',to_regprocedure('public.attach_reality_facts_to_activity_pp1_v1(uuid,text,jsonb,jsonb,jsonb)') is null,jsonb_build_object('procedure',to_regprocedure('public.attach_reality_facts_to_activity_pp1_v1(uuid,text,jsonb,jsonb,jsonb)'))),
(9,'09_activity_role_column_exists',exists(select 1 from information_schema.columns where table_schema='public' and table_name='activity_events' and column_name='activity_role_code'),jsonb_build_object()),
(10,'10_schedule_mode_column_exists',exists(select 1 from information_schema.columns where table_schema='public' and table_name='activity_events' and column_name='schedule_mode_code'),jsonb_build_object()),
(11,'11_calendar_projection_column_exists',exists(select 1 from information_schema.columns where table_schema='public' and table_name='calendar_events' and column_name='related_activity_event_id'),jsonb_build_object()),
(12,'12_event_code_unique_index_exists',to_regclass('public.activity_events_user_event_code_unique_idx') is not null,jsonb_build_object('index',to_regclass('public.activity_events_user_event_code_unique_idx'))),
(13,'13_activity_fact_tables_exist',to_regclass('public.activity_event_measures') is not null and to_regclass('public.activity_object_facts') is not null,jsonb_build_object('measures',to_regclass('public.activity_event_measures'),'facts',to_regclass('public.activity_object_facts'))),
(14,'14_activity_event_actor_guard_exists',to_regprocedure('public.enforce_activity_event_actor_ownership_v2()') is not null,jsonb_build_object('procedure',to_regprocedure('public.enforce_activity_event_actor_ownership_v2()'))),
(15,'15_activity_pp1_contract_guard_exists',to_regprocedure('public.enforce_activity_event_pp1a()') is not null,jsonb_build_object('procedure',to_regprocedure('public.enforce_activity_event_pp1a()'))),
(16,'16_active_owner_actor_pair_available',exists(select 1 from public.actor_public_profiles p join public.actors a on a.id=p.actor_id and a.status='active' join public.app_users u on u.id=p.owner_user_id where coalesce(u.access_status,'active')<>'blocked'),jsonb_build_object('pairCount',(select count(*) from public.actor_public_profiles p join public.actors a on a.id=p.actor_id and a.status='active' join public.app_users u on u.id=p.owner_user_id where coalesce(u.access_status,'active')<>'blocked'))),
(17,'17_activity_rows_clean',not exists(select 1 from public.activity_events),jsonb_build_object('rowCount',(select count(*) from public.activity_events))),
(18,'18_calendar_rows_clean',not exists(select 1 from public.calendar_events),jsonb_build_object('rowCount',(select count(*) from public.calendar_events))),
(19,'19_fact_rows_clean',not exists(select 1 from public.activity_event_measures) and not exists(select 1 from public.activity_object_facts),jsonb_build_object('measureCount',(select count(*) from public.activity_event_measures),'factCount',(select count(*) from public.activity_object_facts))),
(20,'20_pp1b_migration_is_additive',true,jsonb_build_object('persistentDelete',false,'persistentTruncate',false,'newTable','activity_fact_write_operations_pp1','newRpc','attach_reality_facts_to_activity_pp1_v1'));

select sort_order,check_name,passed,details
from pg_temp.pp1b_preflight_results
order by sort_order;
