-- ARCTor.app PP1A runtime acceptance and cleanup
-- Creates isolated fixtures, validates 20 scenarios and removes all fixtures.

create temporary table if not exists pg_temp.pp1a_runtime_results (
  sort_order integer primary key,
  test_name text not null,
  passed boolean not null,
  details jsonb not null default '{}'::jsonb
) on commit preserve rows;
truncate table pg_temp.pp1a_runtime_results;

do $runtime$
declare
  v_owner_user_id uuid;
  v_owner_actor_id uuid;
  v_foreign_user_id uuid;
  v_foreign_actor_id uuid;
  v_root_id uuid := gen_random_uuid();
  v_intermediate_id uuid := gen_random_uuid();
  v_leaf_id uuid := gen_random_uuid();
  v_foreign_vo_id uuid := gen_random_uuid();
  v_unscheduled jsonb;
  v_date_only jsonb;
  v_date_range jsonb;
  v_deadline jsonb;
  v_exact jsonb;
  v_actual_one jsonb;
  v_actual_two jsonb;
  v_plan_id uuid;
  v_actual_id uuid;
  v_calendar_id uuid;
  v_rejected boolean;
  v_message text;
  v_count bigint;
begin
  select value_object.owner_user_id, value_object.owner_actor_id
  into v_owner_user_id, v_owner_actor_id
  from public.value_objects value_object
  where value_object.owner_user_id is not null and value_object.owner_actor_id is not null
  order by value_object.created_at limit 1;

  select profile.owner_user_id, profile.actor_id
  into v_foreign_user_id, v_foreign_actor_id
  from public.actor_public_profiles profile
  join public.actors actor on actor.id=profile.actor_id and actor.status='active'
  where profile.owner_user_id is distinct from v_owner_user_id
     or profile.actor_id is distinct from v_owner_actor_id
  order by profile.created_at limit 1;

  insert into pg_temp.pp1a_runtime_results values
  (1,'01_actor_prerequisites',v_owner_user_id is not null and v_owner_actor_id is not null and v_foreign_user_id is not null and v_foreign_actor_id is not null,
   jsonb_build_object('ownerUserId',v_owner_user_id,'ownerActorId',v_owner_actor_id,'foreignUserId',v_foreign_user_id,'foreignActorId',v_foreign_actor_id));

  if v_owner_user_id is null or v_owner_actor_id is null or v_foreign_user_id is null or v_foreign_actor_id is null then
    raise exception 'PP1_RUNTIME_ACTOR_PREREQUISITES_MISSING';
  end if;

  insert into public.value_objects (
    id, owner_actor_id, created_by_actor_id, actor_id, app_user_id, owner_user_id,
    organization_id, usage_scope, value_type, object_kind, node_role_code,
    branch_type_code, root_value_object_id, parent_value_object_id,
    instance_of_value_object_id, title, description, unit_type, default_price,
    default_currency, default_duration_minutes, is_marketplace_sellable,
    is_free_possible, commercial_usage, visibility, privacy_level,
    sensitivity_level, source, status, identity_attributes_json, metadata_json
  ) values
  (v_root_id,v_owner_actor_id,v_owner_actor_id,v_owner_actor_id,v_owner_user_id,v_owner_user_id,null,'private','other','other','structural','resource',null,null,null,'PP1 Runtime Root','fixture',null,null,null,null,false,false,'none','private','private','standard','manual','draft','{}',jsonb_build_object('fixture','pp1a_runtime')),
  (v_foreign_vo_id,v_foreign_actor_id,v_foreign_actor_id,v_foreign_actor_id,v_foreign_user_id,v_foreign_user_id,null,'private','other','other','structural','resource',null,null,null,'PP1 Runtime Foreign','fixture',null,null,null,null,false,false,'none','private','private','standard','manual','draft','{}',jsonb_build_object('fixture','pp1a_runtime_foreign'));

  insert into public.value_objects (
    id, owner_actor_id, created_by_actor_id, actor_id, app_user_id, owner_user_id,
    organization_id, usage_scope, value_type, object_kind, node_role_code,
    branch_type_code, root_value_object_id, parent_value_object_id,
    instance_of_value_object_id, title, description, unit_type, default_price,
    default_currency, default_duration_minutes, is_marketplace_sellable,
    is_free_possible, commercial_usage, visibility, privacy_level,
    sensitivity_level, source, status, identity_attributes_json, metadata_json
  ) values
  (v_intermediate_id,v_owner_actor_id,v_owner_actor_id,v_owner_actor_id,v_owner_user_id,v_owner_user_id,null,'private','other','other','structural','resource',v_root_id,v_root_id,null,'PP1 Runtime Intermediate','fixture',null,null,null,null,false,false,'none','private','private','standard','manual','draft','{}',jsonb_build_object('fixture','pp1a_runtime'));

  insert into public.value_objects (
    id, owner_actor_id, created_by_actor_id, actor_id, app_user_id, owner_user_id,
    organization_id, usage_scope, value_type, object_kind, node_role_code,
    branch_type_code, root_value_object_id, parent_value_object_id,
    instance_of_value_object_id, title, description, unit_type, default_price,
    default_currency, default_duration_minutes, is_marketplace_sellable,
    is_free_possible, commercial_usage, visibility, privacy_level,
    sensitivity_level, source, status, identity_attributes_json, metadata_json
  ) values
  (v_leaf_id,v_owner_actor_id,v_owner_actor_id,v_owner_actor_id,v_owner_user_id,v_owner_user_id,null,'private','activity_pattern','activity_pattern','activity_leaf','resource',v_root_id,v_intermediate_id,null,'PP1 Runtime Leaf','fixture',null,null,null,null,false,false,'none','private','private','standard','manual','draft','{}',jsonb_build_object('fixture','pp1a_runtime'));

  insert into pg_temp.pp1a_runtime_results values
  (2,'02_root_intermediate_leaf_fixtures',
    (select count(*) from public.value_objects where id in (v_root_id,v_intermediate_id,v_leaf_id,v_foreign_vo_id))=4,
    jsonb_build_object('fixtureCount',4));

  v_unscheduled := public.create_activity_event_pp1_v1(
    v_owner_user_id,v_owner_actor_id,'pp1_runtime_unscheduled',
    jsonb_build_object('activityRoleCode','planned','title','PP1 Unscheduled','scheduleModeCode','unscheduled','createCalendarProjection',false),
    array[v_root_id,v_intermediate_id,v_leaf_id]
  );
  insert into pg_temp.pp1a_runtime_results values
  (3,'03_unscheduled_plan_created',(v_unscheduled->>'ok')::boolean and v_unscheduled#>>'{activityEvent,schedule_mode_code}'='unscheduled',v_unscheduled);

  select count(*) into v_count from public.activity_value_object_links
  where activity_event_id=(v_unscheduled#>>'{activityEvent,id}')::uuid and link_type='planned_target';
  insert into pg_temp.pp1a_runtime_results values
  (4,'04_planned_targets_allow_all_tree_levels',v_count=3,jsonb_build_object('linkCount',v_count));

  v_date_only := public.create_activity_event_pp1_v1(
    v_owner_user_id,v_owner_actor_id,'pp1_runtime_date_only',
    jsonb_build_object('activityRoleCode','planned','title','PP1 Date Only','scheduleModeCode','date_only','scheduledDate','2026-08-01','createCalendarProjection',false),'{}'::uuid[]);
  insert into pg_temp.pp1a_runtime_results values
  (5,'05_date_only_plan_created',v_date_only#>>'{activityEvent,scheduled_date}'='2026-08-01',v_date_only);

  v_date_range := public.create_activity_event_pp1_v1(
    v_owner_user_id,v_owner_actor_id,'pp1_runtime_date_range',
    jsonb_build_object('activityRoleCode','planned','title','PP1 Date Range','scheduleModeCode','date_range','scheduleStartDate','2026-08-02','scheduleEndDate','2026-08-05','createCalendarProjection',false),'{}'::uuid[]);
  insert into pg_temp.pp1a_runtime_results values
  (6,'06_date_range_plan_created',v_date_range#>>'{activityEvent,schedule_start_date}'='2026-08-02' and v_date_range#>>'{activityEvent,schedule_end_date}'='2026-08-05',v_date_range);

  v_deadline := public.create_activity_event_pp1_v1(
    v_owner_user_id,v_owner_actor_id,'pp1_runtime_deadline',
    jsonb_build_object('activityRoleCode','planned','title','PP1 Deadline','scheduleModeCode','deadline','deadlineAt','2026-08-06T18:00:00Z','createCalendarProjection',false),'{}'::uuid[]);
  insert into pg_temp.pp1a_runtime_results values
  (7,'07_deadline_plan_created',v_deadline#>>'{activityEvent,deadline_at}' is not null,v_deadline);

  v_exact := public.create_activity_event_pp1_v1(
    v_owner_user_id,v_owner_actor_id,'pp1_runtime_exact',
    jsonb_build_object('activityRoleCode','planned','title','PP1 Exact','scheduleModeCode','exact','startedAt','2026-08-07T10:00:00Z','durationMinutes',45),'{}'::uuid[]);
  v_plan_id := (v_exact#>>'{activityEvent,id}')::uuid;
  v_calendar_id := (v_exact#>>'{calendarEvent,id}')::uuid;
  insert into pg_temp.pp1a_runtime_results values
  (8,'08_exact_plan_creates_calendar_projection',v_plan_id is not null and v_calendar_id is not null,v_exact);

  v_actual_one := public.create_activity_event_pp1_v1(
    v_owner_user_id,v_owner_actor_id,'pp1_runtime_actual_one',
    jsonb_build_object('activityRoleCode','actual','title','PP1 Actual One','status','completed','startedAt','2026-08-07T10:05:00Z','durationMinutes',20,'fulfillsPlannedActivityEventId',v_plan_id),'{}'::uuid[]);
  insert into pg_temp.pp1a_runtime_results values
  (9,'09_actual_fulfills_plan',(v_actual_one#>>'{activityEvent,fulfills_planned_activity_event_id}')::uuid=v_plan_id,v_actual_one);

  v_actual_two := public.create_activity_event_pp1_v1(
    v_owner_user_id,v_owner_actor_id,'pp1_runtime_actual_two',
    jsonb_build_object('activityRoleCode','actual','title','PP1 Actual Two','status','completed','startedAt','2026-08-07T11:00:00Z','durationMinutes',15,'fulfillsPlannedActivityEventId',v_plan_id),'{}'::uuid[]);
  select count(*) into v_count from public.activity_events where fulfills_planned_activity_event_id=v_plan_id;
  insert into pg_temp.pp1a_runtime_results values
  (10,'10_one_plan_accepts_multiple_actuals',v_count=2,jsonb_build_object('actualCount',v_count));

  v_rejected := false; v_message := null;
  begin
    perform public.create_activity_event_pp1_v1(v_owner_user_id,v_owner_actor_id,'pp1_runtime_conflict',
      jsonb_build_object('activityRoleCode','planned','title','A','scheduleModeCode','unscheduled','createCalendarProjection',false),'{}'::uuid[]);
    perform public.create_activity_event_pp1_v1(v_owner_user_id,v_owner_actor_id,'pp1_runtime_conflict',
      jsonb_build_object('activityRoleCode','planned','title','B','scheduleModeCode','unscheduled','createCalendarProjection',false),'{}'::uuid[]);
  exception when others then v_rejected:=true; v_message:=sqlerrm; end;
  insert into pg_temp.pp1a_runtime_results values
  (11,'11_idempotency_conflict_rejected',v_rejected and v_message like '%PP1_IDEMPOTENCY_CONFLICT%',jsonb_build_object('message',v_message));

  v_rejected := false; v_message := null;
  begin
    insert into public.activity_value_object_links(activity_event_id,value_object_id,actor_id,app_user_id,link_type,status,provenance_code)
    values(v_plan_id,v_foreign_vo_id,v_owner_actor_id,v_owner_user_id,'planned_target','active','manual');
  exception when others then v_rejected:=true; v_message:=sqlerrm; end;
  insert into pg_temp.pp1a_runtime_results values
  (12,'12_cross_actor_planned_target_rejected',v_rejected and v_message like '%PP1_PLANNED_TARGET_OWNER_MISMATCH%',jsonb_build_object('message',v_message));

  v_actual_id := (v_actual_one#>>'{activityEvent,id}')::uuid;
  v_rejected := false; v_message := null;
  begin
    insert into public.activity_value_object_links(activity_event_id,value_object_id,actor_id,app_user_id,link_type,status,provenance_code)
    values(v_actual_id,v_root_id,v_owner_actor_id,v_owner_user_id,'planned_target','active','manual');
  exception when others then v_rejected:=true; v_message:=sqlerrm; end;
  insert into pg_temp.pp1a_runtime_results values
  (13,'13_actual_planned_target_rejected',v_rejected and v_message like '%PP1_PLANNED_TARGET_REQUIRES_PLANNED_ACTIVITY%',jsonb_build_object('message',v_message));

  v_rejected := false; v_message := null;
  begin
    insert into public.activity_events(id,user_id,performed_by_actor_id,acting_as_actor_id,title,status,source,privacy_scope,processing_status,activity_role_code,fulfills_planned_activity_event_id,metadata_json)
    values(gen_random_uuid(),v_owner_user_id,v_owner_actor_id,v_owner_actor_id,'Bad actual target','completed','manual_form','private','processed','actual',v_actual_id,'{}');
  exception when others then v_rejected:=true; v_message:=sqlerrm; end;
  insert into pg_temp.pp1a_runtime_results values
  (14,'14_actual_cannot_fulfill_actual',v_rejected and v_message like '%PP1_FULFILL_TARGET_NOT_PLANNED%',jsonb_build_object('message',v_message));

  v_rejected := false; v_message := null;
  begin
    insert into public.calendar_events(user_id,actor_id,event_type,title,start_time,end_time,status,source,related_activity_event_id)
    values(v_owner_user_id,v_owner_actor_id,'planned_activity','Bad projection','2026-08-01T10:00:00Z','2026-08-01T11:00:00Z','planned','manual',(v_unscheduled#>>'{activityEvent,id}')::uuid);
  exception when others then v_rejected:=true; v_message:=sqlerrm; end;
  insert into pg_temp.pp1a_runtime_results values
  (15,'15_non_exact_calendar_projection_rejected',v_rejected and v_message like '%PP1_CALENDAR_REQUIRES_EXACT_PLANNED_ACTIVITY%',jsonb_build_object('message',v_message));

  insert into public.activity_events(user_id,performed_by_actor_id,acting_as_actor_id,title,started_at,ended_at,duration_minutes,source,status,privacy_scope,processing_status,temporal_direction,metadata_json)
  values(v_owner_user_id,v_owner_actor_id,v_owner_actor_id,'Compatibility future','2026-08-09T10:00:00Z','2026-08-09T10:30:00Z',30,'manual_form','planned','private','processed','future',jsonb_build_object('fixture','pp1a_runtime_compat'));
  insert into pg_temp.pp1a_runtime_results values
  (16,'16_legacy_insert_infers_planned_exact',exists(select 1 from public.activity_events where metadata_json->>'fixture'='pp1a_runtime_compat' and activity_role_code='planned' and schedule_mode_code='exact'),'{}');

  insert into pg_temp.pp1a_runtime_results values
  (17,'17_calendar_projection_matches_plan',exists(select 1 from public.calendar_events ce join public.activity_events ae on ae.id=ce.related_activity_event_id where ce.id=v_calendar_id and ce.start_time=ae.started_at),'{}');

  insert into pg_temp.pp1a_runtime_results values
  (18,'18_tree_objects_unchanged',
    (select count(*) from public.value_objects where id in (v_root_id,v_intermediate_id,v_leaf_id) and owner_actor_id=v_owner_actor_id)=3,
    '{}');

  delete from public.activity_event_write_operations where idempotency_key like 'pp1_runtime_%';
  delete from public.calendar_events where source='activity_projection_pp1_v1' and title like 'PP1 %';
  delete from public.activity_value_object_links where activity_event_id in (select id from public.activity_events where event_code like 'pp1:%:pp1_runtime_%');
  delete from public.activity_events where event_code like 'pp1:%:pp1_runtime_%' or metadata_json->>'fixture'='pp1a_runtime_compat';

  select count(*) into v_count from public.activity_events where event_code like 'pp1:%:pp1_runtime_%' or metadata_json->>'fixture'='pp1a_runtime_compat';
  insert into pg_temp.pp1a_runtime_results values
  (19,'19_cleanup_zero_activity_rows',v_count=0,jsonb_build_object('remainingRows',v_count));

  delete from public.value_objects where id=v_leaf_id;
  delete from public.value_objects where id=v_intermediate_id;
  delete from public.value_objects where id in (v_root_id,v_foreign_vo_id);

  select count(*) into v_count from public.value_objects where id in (v_root_id,v_intermediate_id,v_leaf_id,v_foreign_vo_id);
  insert into pg_temp.pp1a_runtime_results values
  (20,'20_cleanup_zero_fixture_value_objects',v_count=0,jsonb_build_object('remainingRows',v_count));
end
$runtime$;

select sort_order,test_name,passed,details
from pg_temp.pp1a_runtime_results
order by sort_order;
