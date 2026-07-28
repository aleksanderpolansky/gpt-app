-- ARCTor.app
-- CUX4A1T updated_at runtime acceptance
--
-- Creates one temporary semantic-run fixture against an existing planned
-- activity, verifies monotonic timestamps through claim and finish, and
-- removes the fixture before returning results.

create temporary table cux4a1t_runtime_results (
  ord integer not null,
  check_code text not null,
  passed boolean not null,
  details jsonb not null default '{}'::jsonb
);

do $runtime$
declare
  v_activity public.activity_events%rowtype;
  v_request_key text;
  v_created jsonb;
  v_claimed jsonb;
  v_finished jsonb;
  v_run_id uuid;
  v_created_at timestamptz;
  v_initial_updated_at timestamptz;
  v_claim_updated_at timestamptz;
  v_finish_updated_at timestamptz;
  v_residual bigint;
begin
  select activity_event.*
  into v_activity
  from public.activity_events activity_event
  join public.actors actor
    on actor.id=activity_event.acting_as_actor_id
   and actor.status='active'
  join public.app_users app_user
    on app_user.id=activity_event.user_id
  where activity_event.activity_role_code='planned'
    and coalesce(app_user.access_status,'active') <> 'blocked'
  order by activity_event.created_at, activity_event.id
  limit 1;

  insert into cux4a1t_runtime_results
    (ord, check_code, passed, details)
  values (
    10,
    'owned_planned_activity_available',
    found,
    jsonb_build_object(
      'activityEventId',
      v_activity.id
    )
  );

  if not found then
    return;
  end if;

  v_request_key :=
    'cux4a1t-runtime-20260728-'
    || replace(gen_random_uuid()::text, '-', '');

  v_created :=
    public.create_activity_semantic_enrichment_run_cux4_v1(
      v_activity.user_id,
      v_activity.acting_as_actor_id,
      v_activity.id,
      v_request_key,
      'ru',
      'CUX4A1T timestamp fixture',
      '{"title":true}'::jsonb,
      '{}'::text[],
      jsonb_build_object(
        'fixture',
        true,
        'fixtureKey',
        v_request_key,
        'fixtureType',
        'cux4a1t-updated-at'
      )
    );

  v_run_id := (v_created->'run'->>'id')::uuid;

  select
    run.created_at,
    run.updated_at
  into
    v_created_at,
    v_initial_updated_at
  from public.activity_semantic_enrichment_runs_cux4 run
  where run.id=v_run_id;

  insert into cux4a1t_runtime_results
    (ord, check_code, passed, details)
  values (
    20,
    'created_timestamp_order_valid',
    v_initial_updated_at >= v_created_at,
    jsonb_build_object(
      'createdAt',
      v_created_at,
      'updatedAt',
      v_initial_updated_at
    )
  );

  perform pg_sleep(0.02);

  v_claimed :=
    public.claim_activity_semantic_enrichment_run_cux4_v1(
      v_activity.user_id,
      v_activity.acting_as_actor_id,
      v_run_id
    );

  select run.updated_at
  into v_claim_updated_at
  from public.activity_semantic_enrichment_runs_cux4 run
  where run.id=v_run_id;

  insert into cux4a1t_runtime_results
    (ord, check_code, passed, details)
  values (
    30,
    'claim_updated_at_advanced',
    (v_claimed->>'claimed')::boolean
      and v_claim_updated_at > v_initial_updated_at
      and v_claim_updated_at >= v_created_at,
    jsonb_build_object(
      'initialUpdatedAt',
      v_initial_updated_at,
      'claimUpdatedAt',
      v_claim_updated_at,
      'createdAt',
      v_created_at
    )
  );

  perform pg_sleep(0.02);

  v_finished :=
    public.finish_activity_semantic_enrichment_run_cux4_v1(
      v_activity.user_id,
      v_activity.acting_as_actor_id,
      v_run_id,
      'processed',
      '{"activityTitle":"CUX4A1T normalized fixture"}'::jsonb,
      null
    );

  select run.updated_at
  into v_finish_updated_at
  from public.activity_semantic_enrichment_runs_cux4 run
  where run.id=v_run_id;

  insert into cux4a1t_runtime_results
    (ord, check_code, passed, details)
  values (
    40,
    'finish_updated_at_advanced',
    v_finished->>'disposition'='finished'
      and v_finish_updated_at > v_claim_updated_at
      and v_finish_updated_at >= v_created_at,
    jsonb_build_object(
      'claimUpdatedAt',
      v_claim_updated_at,
      'finishUpdatedAt',
      v_finish_updated_at,
      'createdAt',
      v_created_at
    )
  );

  delete from public.activity_semantic_enrichment_runs_cux4
  where id=v_run_id;

  select count(*)
  into v_residual
  from public.activity_semantic_enrichment_runs_cux4 run
  where run.id=v_run_id;

  insert into cux4a1t_runtime_results
    (ord, check_code, passed, details)
  values (
    50,
    'fixture_cleanup',
    v_residual=0,
    jsonb_build_object(
      'residual',
      v_residual
    )
  );
exception
  when others then
    if v_run_id is not null then
      delete from public.activity_semantic_enrichment_runs_cux4
      where id=v_run_id;
    end if;

    insert into cux4a1t_runtime_results
      (ord, check_code, passed, details)
    values (
      900,
      'runtime_exception',
      false,
      jsonb_build_object(
        'sqlstate',
        sqlstate,
        'message',
        sqlerrm
      )
    );
end
$runtime$;

select
  row_number() over(order by ord) as check_no,
  check_code,
  passed,
  details
from cux4a1t_runtime_results
order by ord;
