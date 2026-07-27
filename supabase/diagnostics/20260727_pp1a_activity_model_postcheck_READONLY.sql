-- ARCTor.app PP1A postcheck — READ ONLY
create temporary table if not exists pg_temp.pp1a_postcheck_results (
  sort_order integer primary key,
  check_name text not null,
  passed boolean not null,
  details jsonb not null default '{}'::jsonb
) on commit preserve rows;
truncate table pg_temp.pp1a_postcheck_results;

do $postcheck$
declare v_count bigint;
begin
  insert into pg_temp.pp1a_postcheck_results values
  (1,'01_role_registry_exists',to_regclass('public.activity_role_types') is not null,'{}'),
  (2,'02_schedule_registry_exists',to_regclass('public.activity_schedule_modes') is not null,'{}'),
  (3,'03_write_operations_exists',to_regclass('public.activity_event_write_operations') is not null,'{}');

  select count(*) into v_count from public.activity_role_types where status='active';
  insert into pg_temp.pp1a_postcheck_results values
  (4,'04_two_active_roles',v_count=2,jsonb_build_object('rowCount',v_count));

  select count(*) into v_count from public.activity_schedule_modes where status='active';
  insert into pg_temp.pp1a_postcheck_results values
  (5,'05_five_active_schedule_modes',v_count=5,jsonb_build_object('rowCount',v_count));

  insert into pg_temp.pp1a_postcheck_results
  select 6,'06_activity_role_column',count(*)=1,jsonb_build_object('count',count(*))
  from information_schema.columns where table_schema='public' and table_name='activity_events' and column_name='activity_role_code';
  insert into pg_temp.pp1a_postcheck_results
  select 7,'07_plan_actual_fk_column',count(*)=1,jsonb_build_object('count',count(*))
  from information_schema.columns where table_schema='public' and table_name='activity_events' and column_name='fulfills_planned_activity_event_id';
  insert into pg_temp.pp1a_postcheck_results
  select 8,'08_schedule_mode_column',count(*)=1,jsonb_build_object('count',count(*))
  from information_schema.columns where table_schema='public' and table_name='activity_events' and column_name='schedule_mode_code';
  insert into pg_temp.pp1a_postcheck_results
  select 9,'09_schedule_support_columns',count(*)=5,jsonb_build_object('columns',jsonb_agg(column_name order by column_name))
  from information_schema.columns where table_schema='public' and table_name='activity_events'
    and column_name in ('scheduled_date','schedule_start_date','schedule_end_date','deadline_at','started_at');
  insert into pg_temp.pp1a_postcheck_results
  select 10,'10_calendar_activity_event_column',count(*)=1,jsonb_build_object('count',count(*))
  from information_schema.columns where table_schema='public' and table_name='calendar_events' and column_name='related_activity_event_id';

  insert into pg_temp.pp1a_postcheck_results values
  (11,'11_activity_contract_trigger',exists(select 1 from information_schema.triggers where event_object_schema='public' and event_object_table='activity_events' and trigger_name='activity_events_pp1a_contract_trg'),'{}'),
  (12,'12_calendar_projection_trigger',exists(select 1 from information_schema.triggers where event_object_schema='public' and event_object_table='calendar_events' and trigger_name='calendar_events_pp1a_projection_trg'),'{}'),
  (13,'13_planned_target_trigger',exists(select 1 from information_schema.triggers where event_object_schema='public' and event_object_table='activity_value_object_links' and trigger_name='activity_value_object_links_pp1a_contract_trg'),'{}'),
  (14,'14_create_rpc_exists',to_regprocedure('public.create_activity_event_pp1_v1(uuid,uuid,text,jsonb,uuid[])') is not null,'{}'),
  (15,'15_plan_fk_exists',exists(select 1 from pg_constraint where conrelid='public.activity_events'::regclass and conname='activity_events_fulfills_plan_fk'),'{}'),
  (16,'16_calendar_fk_exists',exists(select 1 from pg_constraint where conrelid='public.calendar_events'::regclass and conname='calendar_events_related_activity_event_fk'),'{}'),
  (17,'17_calendar_unique_index',to_regclass('public.calendar_events_related_activity_event_unique_idx') is not null,'{}'),
  (18,'18_role_status_index',to_regclass('public.activity_events_role_status_idx') is not null,'{}'),
  (19,'19_plan_execution_index',to_regclass('public.activity_events_fulfills_plan_idx') is not null,'{}'),
  (20,'20_planned_target_index',to_regclass('public.activity_value_object_links_planned_target_idx') is not null,'{}');

  select count(*) into v_count from public.activities;
  insert into pg_temp.pp1a_postcheck_results values (21,'21_legacy_activities_empty',v_count=0,jsonb_build_object('rowCount',v_count));
  select count(*) into v_count from public.activity_participants;
  insert into pg_temp.pp1a_postcheck_results values (22,'22_legacy_participants_empty',v_count=0,jsonb_build_object('rowCount',v_count));
  select count(*) into v_count from public.activity_links;
  insert into pg_temp.pp1a_postcheck_results values (23,'23_legacy_links_empty',v_count=0,jsonb_build_object('rowCount',v_count));
  select count(*) into v_count from public.activity_events;
  insert into pg_temp.pp1a_postcheck_results values (24,'24_activity_events_empty',v_count=0,jsonb_build_object('rowCount',v_count));
  select count(*) into v_count from public.calendar_events;
  insert into pg_temp.pp1a_postcheck_results values (25,'25_calendar_events_empty',v_count=0,jsonb_build_object('rowCount',v_count));
  select count(*) into v_count from public.activity_corrections;
  insert into pg_temp.pp1a_postcheck_results values (26,'26_activity_corrections_empty',v_count=0,jsonb_build_object('rowCount',v_count));
  select count(*) into v_count from public.activity_value_object_links;
  insert into pg_temp.pp1a_postcheck_results values (27,'27_activity_vo_links_empty',v_count=0,jsonb_build_object('rowCount',v_count));
  select count(*) into v_count from public.activity_event_write_operations;
  insert into pg_temp.pp1a_postcheck_results values (28,'28_write_operations_empty',v_count=0,jsonb_build_object('rowCount',v_count));

  insert into pg_temp.pp1a_postcheck_results values
  (29,'29_value_objects_preserved',(select count(*) from public.value_objects)>0,jsonb_build_object('rowCount',(select count(*) from public.value_objects))),
  (30,'30_p10_relations_preserved',to_regclass('public.value_object_relations') is not null,jsonb_build_object('rowCount',(select count(*) from public.value_object_relations))),
  (31,'31_anon_no_activity_write_operation_privileges',not has_table_privilege('anon','public.activity_event_write_operations','INSERT') and not has_table_privilege('anon','public.activity_event_write_operations','UPDATE') and not has_table_privilege('anon','public.activity_event_write_operations','DELETE'),'{}'),
  (32,'32_authenticated_no_activity_write_operation_privileges',not has_table_privilege('authenticated','public.activity_event_write_operations','INSERT') and not has_table_privilege('authenticated','public.activity_event_write_operations','UPDATE') and not has_table_privilege('authenticated','public.activity_event_write_operations','DELETE'),'{}'),
  (33,'33_service_role_rpc_execute',has_function_privilege('service_role','public.create_activity_event_pp1_v1(uuid,uuid,text,jsonb,uuid[])','EXECUTE'),'{}'),
  (34,'34_role_registry_rls',exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='activity_role_types' and c.relrowsecurity),'{}'),
  (35,'35_schedule_registry_rls',exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='activity_schedule_modes' and c.relrowsecurity),'{}');
end
$postcheck$;

select sort_order, check_name, passed, details
from pg_temp.pp1a_postcheck_results
order by sort_order;
