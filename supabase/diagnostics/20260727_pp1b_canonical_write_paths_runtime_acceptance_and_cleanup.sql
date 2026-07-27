-- ARCTor.app PP1B runtime acceptance and cleanup
-- Creates isolated canonical activity/fact fixtures, validates PP1B behavior,
-- then removes all fixtures.

create temporary table if not exists pg_temp.pp1b_runtime_results (
  sort_order integer primary key,
  test_name text not null,
  passed boolean not null,
  details jsonb not null default '{}'::jsonb
) on commit preserve rows;
truncate table pg_temp.pp1b_runtime_results;

do $runtime$
declare
  v_owner_user_id uuid;
  v_owner_actor_id uuid;
  v_plan_result jsonb;
  v_actual_result jsonb;
  v_plan_id uuid;
  v_actual_id uuid;
  v_calendar_id uuid;
  v_plan_fact_result jsonb;
  v_plan_replay_result jsonb;
  v_actual_fact_result jsonb;
  v_rejected boolean;
  v_message text;
  v_count bigint;
  v_plan_hash text := repeat('a',64);
  v_actual_hash text := repeat('b',64);
  v_plan_facts jsonb;
  v_actual_facts jsonb;
begin
  select profile.owner_user_id, profile.actor_id
  into v_owner_user_id, v_owner_actor_id
  from public.actor_public_profiles profile
  join public.actors actor on actor.id=profile.actor_id and actor.status='active'
  join public.app_users app_user on app_user.id=profile.owner_user_id
  where coalesce(app_user.access_status,'active')<>'blocked'
  order by profile.created_at
  limit 1;

  insert into pg_temp.pp1b_runtime_results values
  (1,'01_actor_prerequisites',v_owner_user_id is not null and v_owner_actor_id is not null,
   jsonb_build_object('ownerUserId',v_owner_user_id,'ownerActorId',v_owner_actor_id));

  if v_owner_user_id is null or v_owner_actor_id is null then
    raise exception 'PP1B_RUNTIME_ACTOR_PREREQUISITES_MISSING';
  end if;

  v_plan_result := public.create_activity_event_pp1_v1(
    v_owner_user_id,
    v_owner_actor_id,
    'pp1b_runtime_exact_plan',
    jsonb_build_object(
      'activityRoleCode','planned',
      'title','PP1B Runtime Exact Plan',
      'inputText','PP1B runtime exact plan 35 minutes',
      'scheduleModeCode','exact',
      'startedAt','2026-08-20T10:00:00Z',
      'durationMinutes',35,
      'source','manual_form',
      'metadata',jsonb_build_object('fixture','pp1b_runtime')
    ),
    '{}'::uuid[]
  );
  v_plan_id := (v_plan_result#>>'{activityEvent,id}')::uuid;
  v_calendar_id := (v_plan_result#>>'{calendarEvent,id}')::uuid;

  insert into pg_temp.pp1b_runtime_results values
  (2,'02_canonical_plan_and_projection_created',v_plan_id is not null and v_calendar_id is not null,v_plan_result);

  v_plan_facts := jsonb_build_array(jsonb_build_object(
    'localFactId','pp1b-plan-duration',
    'decision','accept',
    'semanticObjectKey','pp1b_plan_duration',
    'semanticObjectLabel','PP1B plan duration',
    'valueObjectId',null,
    'measureType','duration',
    'parameterCode','duration_minutes',
    'unitCode','minute',
    'valueNumeric',35,
    'valueText',null,
    'valueBoolean',null,
    'confidence',1,
    'rawFragment','35 minutes',
    'normalizedFragment','35 minute',
    'metadata',jsonb_build_object('fixture','pp1b_runtime')
  ));

  v_plan_fact_result := public.attach_reality_facts_to_activity_pp1_v1(
    v_owner_user_id,
    v_plan_hash,
    jsonb_build_object(
      'performedByActorId',v_owner_actor_id,
      'actingAsActorId',v_owner_actor_id,
      'actingForActorId',null
    ),
    jsonb_build_object(
      'idempotencyKey','pp1b_runtime_plan_facts',
      'existingActivityEventId',v_plan_id,
      'temporalDirection','future',
      'startedAtIso','2026-08-20T10:00:00Z',
      'durationMinutes',35
    ),
    v_plan_facts
  );

  insert into pg_temp.pp1b_runtime_results values
  (3,'03_facts_attach_to_existing_plan',(v_plan_fact_result->>'ok')::boolean and (v_plan_fact_result->>'activityEventId')::uuid=v_plan_id,v_plan_fact_result);

  select count(*) into v_count from public.activity_events where id=v_plan_id;
  insert into pg_temp.pp1b_runtime_results values
  (4,'04_fact_attach_does_not_create_second_activity',v_count=1,jsonb_build_object('activityCount',v_count));

  insert into pg_temp.pp1b_runtime_results values
  (5,'05_pp1_event_code_preserved',exists(select 1 from public.activity_events where id=v_plan_id and event_code='pp1:planned:pp1b_runtime_exact_plan'),jsonb_build_object('eventCode',(select event_code from public.activity_events where id=v_plan_id)));

  insert into pg_temp.pp1b_runtime_results values
  (6,'06_plan_measure_and_fact_written',
    (select count(*) from public.activity_event_measures where activity_event_id=v_plan_id)=1
    and (select count(*) from public.activity_object_facts where activity_event_id=v_plan_id)=1,
    jsonb_build_object('measureCount',(select count(*) from public.activity_event_measures where activity_event_id=v_plan_id),'factCount',(select count(*) from public.activity_object_facts where activity_event_id=v_plan_id)));

  v_plan_replay_result := public.attach_reality_facts_to_activity_pp1_v1(
    v_owner_user_id,v_plan_hash,
    jsonb_build_object('performedByActorId',v_owner_actor_id,'actingAsActorId',v_owner_actor_id,'actingForActorId',null),
    jsonb_build_object('idempotencyKey','pp1b_runtime_plan_facts','existingActivityEventId',v_plan_id,'temporalDirection','future','startedAtIso','2026-08-20T10:00:00Z','durationMinutes',35),
    v_plan_facts
  );
  insert into pg_temp.pp1b_runtime_results values
  (7,'07_fact_attach_idempotent_replay',v_plan_replay_result->>'writeStatus'='idempotent_replay' and (v_plan_replay_result->>'rowsActuallyWritten')::integer=0,v_plan_replay_result);

  v_rejected:=false; v_message:=null;
  begin
    perform public.attach_reality_facts_to_activity_pp1_v1(
      v_owner_user_id,repeat('c',64),
      jsonb_build_object('performedByActorId',v_owner_actor_id,'actingAsActorId',v_owner_actor_id,'actingForActorId',null),
      jsonb_build_object('idempotencyKey','pp1b_runtime_plan_facts','existingActivityEventId',v_plan_id,'temporalDirection','future'),
      v_plan_facts
    );
  exception when others then v_rejected:=true; v_message:=sqlerrm; end;
  insert into pg_temp.pp1b_runtime_results values
  (8,'08_fact_idempotency_conflict_rejected',v_rejected and v_message like '%PP1_FACT_IDEMPOTENCY_CONFLICT%',jsonb_build_object('message',v_message));

  v_rejected:=false; v_message:=null;
  begin
    perform public.attach_reality_facts_to_activity_pp1_v1(
      v_owner_user_id,repeat('d',64),
      jsonb_build_object('performedByActorId',v_owner_actor_id,'actingAsActorId',v_owner_actor_id,'actingForActorId',null),
      jsonb_build_object('idempotencyKey','pp1b_runtime_plan_facts_second','existingActivityEventId',v_plan_id,'temporalDirection','future'),
      v_plan_facts
    );
  exception when others then v_rejected:=true; v_message:=sqlerrm; end;
  insert into pg_temp.pp1b_runtime_results values
  (9,'09_second_fact_bundle_rejected',v_rejected and v_message like '%PP1_FACT_ACTIVITY_ALREADY_HAS_FACTS%',jsonb_build_object('message',v_message));

  v_actual_result := public.create_activity_event_pp1_v1(
    v_owner_user_id,
    v_owner_actor_id,
    'pp1b_runtime_actual',
    jsonb_build_object(
      'activityRoleCode','actual',
      'title','PP1B Runtime Actual',
      'inputText','Completed PP1B runtime activity 20 minutes',
      'durationMinutes',20,
      'status','completed',
      'source','manual_form',
      'fulfillsPlannedActivityEventId',v_plan_id,
      'metadata',jsonb_build_object('fixture','pp1b_runtime')
    ),
    '{}'::uuid[]
  );
  v_actual_id := (v_actual_result#>>'{activityEvent,id}')::uuid;
  insert into pg_temp.pp1b_runtime_results values
  (10,'10_canonical_actual_created',v_actual_id is not null and (v_actual_result#>>'{activityEvent,activity_role_code}')='actual',v_actual_result);

  v_actual_facts := jsonb_build_array(jsonb_build_object(
    'localFactId','pp1b-actual-duration',
    'decision','accept',
    'semanticObjectKey','pp1b_actual_duration',
    'semanticObjectLabel','PP1B actual duration',
    'valueObjectId',null,
    'measureType','duration',
    'parameterCode','duration_minutes',
    'unitCode','minute',
    'valueNumeric',20,
    'valueText',null,
    'valueBoolean',null,
    'confidence',1,
    'rawFragment','20 minutes',
    'normalizedFragment','20 minute',
    'metadata',jsonb_build_object('fixture','pp1b_runtime')
  ));

  v_actual_fact_result := public.attach_reality_facts_to_activity_pp1_v1(
    v_owner_user_id,
    v_actual_hash,
    jsonb_build_object('performedByActorId',v_owner_actor_id,'actingAsActorId',v_owner_actor_id,'actingForActorId',null),
    jsonb_build_object('idempotencyKey','pp1b_runtime_actual_facts','existingActivityEventId',v_actual_id,'temporalDirection','past','durationMinutes',20),
    v_actual_facts
  );
  insert into pg_temp.pp1b_runtime_results values
  (11,'11_facts_attach_to_existing_actual',(v_actual_fact_result->>'ok')::boolean and (v_actual_fact_result->>'activityEventId')::uuid=v_actual_id,v_actual_fact_result);

  insert into pg_temp.pp1b_runtime_results values
  (12,'12_actual_fulfills_plan',exists(select 1 from public.activity_events where id=v_actual_id and fulfills_planned_activity_event_id=v_plan_id),jsonb_build_object());

  v_rejected:=false; v_message:=null;
  begin
    perform public.attach_reality_facts_to_activity_pp1_v1(
      v_owner_user_id,repeat('e',64),
      jsonb_build_object('performedByActorId',v_owner_actor_id,'actingAsActorId',v_owner_actor_id,'actingForActorId',null),
      jsonb_build_object('idempotencyKey','pp1b_runtime_direction_bad','existingActivityEventId',v_actual_id,'temporalDirection','future'),
      v_actual_facts
    );
  exception when others then v_rejected:=true; v_message:=sqlerrm; end;
  insert into pg_temp.pp1b_runtime_results values
  (13,'13_role_direction_mismatch_rejected',v_rejected and v_message like '%PP1_FACT_ACTIVITY_DIRECTION_MISMATCH%',jsonb_build_object('message',v_message));

  v_rejected:=false; v_message:=null;
  begin
    perform public.attach_reality_facts_to_activity_pp1_v1(
      v_owner_user_id,repeat('f',64),
      jsonb_build_object('performedByActorId',v_owner_actor_id,'actingAsActorId',v_owner_actor_id,'actingForActorId',null),
      jsonb_build_object('idempotencyKey','pp1b_runtime_missing','existingActivityEventId',gen_random_uuid(),'temporalDirection','past'),
      v_actual_facts
    );
  exception when others then v_rejected:=true; v_message:=sqlerrm; end;
  insert into pg_temp.pp1b_runtime_results values
  (14,'14_unknown_activity_rejected',v_rejected and v_message like '%PP1_FACT_ACTIVITY_NOT_OWNED%',jsonb_build_object('message',v_message));

  insert into pg_temp.pp1b_runtime_results values
  (15,'15_calendar_projection_still_matches_plan',exists(select 1 from public.calendar_events ce join public.activity_events ae on ae.id=ce.related_activity_event_id where ce.id=v_calendar_id and ce.start_time=ae.started_at and ce.duration_minutes=ae.duration_minutes),jsonb_build_object());

  delete from public.activity_event_write_operations where idempotency_key like 'pp1b_runtime_%';
  delete from public.activity_fact_write_operations_pp1 where idempotency_key like 'pp1b_runtime_%';
  delete from public.calendar_events where related_activity_event_id in (v_plan_id,v_actual_id);
  delete from public.activity_events where id in (v_actual_id,v_plan_id);

  insert into pg_temp.pp1b_runtime_results values
  (16,'16_cleanup_zero_operation_rows',
    not exists(select 1 from public.activity_event_write_operations where idempotency_key like 'pp1b_runtime_%')
    and not exists(select 1 from public.activity_fact_write_operations_pp1 where idempotency_key like 'pp1b_runtime_%'),
    jsonb_build_object(
      'activityOperationRows',(select count(*) from public.activity_event_write_operations where idempotency_key like 'pp1b_runtime_%'),
      'factOperationRows',(select count(*) from public.activity_fact_write_operations_pp1 where idempotency_key like 'pp1b_runtime_%')
    ));
  insert into pg_temp.pp1b_runtime_results values
  (17,'17_cleanup_zero_activity_rows',not exists(select 1 from public.activity_events where event_code like 'pp1:%:pp1b_runtime_%'),jsonb_build_object('remainingRows',(select count(*) from public.activity_events where event_code like 'pp1:%:pp1b_runtime_%')));
  insert into pg_temp.pp1b_runtime_results values
  (18,'18_cleanup_zero_fact_rows',not exists(select 1 from public.activity_object_facts where metadata->>'fixture'='pp1b_runtime') and not exists(select 1 from public.activity_event_measures where metadata->>'fixture'='pp1b_runtime'),jsonb_build_object('factRows',(select count(*) from public.activity_object_facts where metadata->>'fixture'='pp1b_runtime'),'measureRows',(select count(*) from public.activity_event_measures where metadata->>'fixture'='pp1b_runtime')));
end
$runtime$;

select sort_order,test_name,passed,details
from pg_temp.pp1b_runtime_results
order by sort_order;
