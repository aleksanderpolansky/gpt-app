-- ARCTOR_RUNTIME_TEMPLATE_BRIDGE_FACT_DEDUP_V2
-- 2026-08-21
--
-- Purpose:
-- 1) attach an already-saved activity_event to an existing user typical activity
--    after a narrow AI identity match;
-- 2) preserve a residual-review flag: clean template-only input skips broad review,
--    while explicit extra observations keep the existing fact-review path;
-- 3) let the existing impact-profile trigger snapshot the exact profile version;
-- 4) expose one read model that prefers confirmed physical facts over virtual
--    template contributions for the same event/object/parameter key.
--
-- This migration NEVER backfills historical events and NEVER inserts into
-- activity_object_facts. Raw/confirmed facts remain immutable.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

do $preflight$
begin
  if to_regclass('public.activity_events') is null
     or to_regclass('public.activity_templates') is null
     or to_regclass('public.activity_template_impact_profiles_v1') is null
     or to_regclass('public.activity_event_virtual_parameter_contributions_v1') is null
     or to_regclass('public.activity_object_facts') is null
     or to_regclass('public.raw_activity_signals') is null
     or to_regclass('public.actor_public_profiles') is null
     or to_regclass('public.value_object_analytics_profiles_v1') is null then
    raise exception using
      errcode='42P01',
      message='ARCTOR_RUNTIME_TEMPLATE_BRIDGE_V2_REQUIRED_FOUNDATION_MISSING';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='activity_events'
      and column_name='activity_template_id'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='activity_events'
      and column_name='impact_profile_id'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='activity_events'
      and column_name='metadata_json'
  ) then
    raise exception using
      errcode='42703',
      message='ARCTOR_RUNTIME_TEMPLATE_BRIDGE_V2_ACTIVITY_EVENT_COLUMNS_MISSING';
  end if;

  if to_regprocedure('public.set_activity_event_impact_profile_v1()') is null then
    raise exception using
      errcode='42883',
      message='ARCTOR_RUNTIME_TEMPLATE_BRIDGE_V2_PROFILE_TRIGGER_FUNCTION_MISSING';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_trigger
    where tgrelid='public.activity_events'::regclass
      and tgname='trg_activity_events_impact_profile_v1'
      and not tgisinternal
  ) then
    raise exception using
      errcode='55000',
      message='ARCTOR_RUNTIME_TEMPLATE_BRIDGE_V2_PROFILE_TRIGGER_MISSING';
  end if;

  if to_regprocedure(
       'public.apply_activity_template_match_v2(uuid,uuid,uuid,uuid,numeric,text,text,text,integer,boolean,numeric,numeric,numeric)'
     ) is not null
     or to_regclass('public.activity_object_analytics_inputs_v1') is not null then
    raise exception using
      errcode='42P07',
      message='ARCTOR_RUNTIME_TEMPLATE_BRIDGE_V2_TARGET_ALREADY_EXISTS';
  end if;
end
$preflight$;

create function public.apply_activity_template_match_v2(
  p_owner_user_id uuid,
  p_owner_actor_id uuid,
  p_activity_event_id uuid,
  p_template_id uuid,
  p_confidence numeric,
  p_match_method text,
  p_model_tier text,
  p_model_name text,
  p_candidate_count integer,
  p_residual_review_required boolean,
  p_repetition_count numeric,
  p_distance_m numeric,
  p_duration_seconds numeric
)
returns jsonb
language plpgsql
security definer
set search_path=public,extensions,pg_temp
as $function$
declare
  v_event public.activity_events%rowtype;
  v_profile_id uuid;
  v_profile_version integer;
  v_template_title text;
  v_server_covered_parameter_codes jsonb := jsonb_build_array('process_count');
  v_metadata jsonb;
  v_now timestamptz := now();
begin
  if p_owner_user_id is null
     or p_owner_actor_id is null
     or p_activity_event_id is null
     or p_template_id is null then
    raise exception 'ATBRIDGE_V2_REQUIRED_ID_MISSING';
  end if;

  if p_confidence is null or p_confidence < 0 or p_confidence > 1 then
    raise exception 'ATBRIDGE_V2_CONFIDENCE_INVALID';
  end if;

  if p_match_method not in ('exact_server','ai_nano') then
    raise exception 'ATBRIDGE_V2_MATCH_METHOD_INVALID';
  end if;

  if p_candidate_count is null or p_candidate_count < 1 or p_candidate_count > 32 then
    raise exception 'ATBRIDGE_V2_CANDIDATE_COUNT_INVALID';
  end if;

  if p_residual_review_required is null then
    raise exception 'ATBRIDGE_V2_RESIDUAL_REVIEW_FLAG_REQUIRED';
  end if;

  if p_repetition_count is not null
     and (p_repetition_count <= 0 or p_repetition_count > 1000000) then
    raise exception 'ATBRIDGE_V2_REPETITION_COUNT_INVALID';
  end if;

  if p_distance_m is not null
     and (p_distance_m < 0 or p_distance_m > 100000000) then
    raise exception 'ATBRIDGE_V2_DISTANCE_INVALID';
  end if;

  if p_duration_seconds is not null
     and (p_duration_seconds < 0 or p_duration_seconds > 315576000) then
    raise exception 'ATBRIDGE_V2_DURATION_INVALID';
  end if;

  if not exists (
    select 1
    from public.actors a
    join public.actor_public_profiles ap
      on ap.actor_id=a.id
     and ap.owner_user_id=p_owner_user_id
    where a.id=p_owner_actor_id
      and a.status='active'
  ) then
    raise exception 'ATBRIDGE_V2_ACTIVE_ACTOR_NOT_OWNED';
  end if;

  select e.*
  into v_event
  from public.activity_events e
  where e.id=p_activity_event_id
    and e.user_id=p_owner_user_id
    and e.acting_as_actor_id=p_owner_actor_id
  for update;

  if not found then
    raise exception 'ATBRIDGE_V2_ACTIVITY_EVENT_NOT_OWNED';
  end if;

  if v_event.activity_template_id is not null
     and v_event.activity_template_id<>p_template_id then
    raise exception 'ATBRIDGE_V2_DIFFERENT_TEMPLATE_ALREADY_ASSIGNED';
  end if;

  select p.id,p.version_no,t.title
  into v_profile_id,v_profile_version,v_template_title
  from public.activity_template_impact_profiles_v1 p
  join public.activity_templates t on t.id=p.template_id
  where p.template_id=p_template_id
    and p.owner_user_id=p_owner_user_id
    and p.owner_actor_id=p_owner_actor_id
    and p.status='active'
    and t.owner_user_id=p_owner_user_id
    and t.owner_actor_id=p_owner_actor_id
    and t.template_scope='user'
    and t.status='active'
    and t.is_active=true
  order by p.version_no desc
  limit 1;

  if v_profile_id is null then
    raise exception 'ATBRIDGE_V2_ACTIVE_TEMPLATE_PROFILE_NOT_ACCESSIBLE';
  end if;

  v_metadata:=coalesce(v_event.metadata_json,'{}'::jsonb);

  -- Preserve any already-authoritative server/user values. The matcher only fills gaps.
  if p_repetition_count is not null then
    v_server_covered_parameter_codes:=v_server_covered_parameter_codes||jsonb_build_array('repetition_count');
    if not (
      v_metadata ? 'repetition_count'
      or v_metadata ? 'repetitionCount'
      or v_metadata ? 'repetitions'
      or v_metadata ? 'reps'
    ) then
      v_metadata:=jsonb_set(v_metadata,'{repetition_count}',to_jsonb(p_repetition_count),true);
    end if;
  end if;

  if p_distance_m is not null then
    v_server_covered_parameter_codes:=v_server_covered_parameter_codes||jsonb_build_array('distance_m');
    if not (
      v_metadata ? 'distance_m'
      or v_metadata ? 'distanceM'
      or v_metadata ? 'distance_meters'
      or v_metadata ? 'distanceMeters'
    ) then
      v_metadata:=jsonb_set(v_metadata,'{distance_m}',to_jsonb(p_distance_m),true);
    end if;
  end if;

  if p_duration_seconds is not null then
    v_server_covered_parameter_codes:=v_server_covered_parameter_codes||jsonb_build_array('duration_seconds');
    if not (v_metadata ? 'duration_seconds' or v_metadata ? 'durationSeconds') then
      v_metadata:=jsonb_set(v_metadata,'{duration_seconds}',to_jsonb(p_duration_seconds),true);
    end if;
  end if;

  v_metadata:=v_metadata||jsonb_build_object(
    'quickCaptureReviewRequired',p_residual_review_required,
    'quickCaptureReviewStatus',case
      when p_residual_review_required then 'template_matched_residual_pending'
      else 'template_matched'
    end,
    'factMaterializationPolicy',case
      when p_residual_review_required then 'template_virtual_plus_residual_review'
      else 'template_virtual_contributions'
    end,
    'typicalTemplateMatch',jsonb_build_object(
      'contract','ARCTOR_RUNTIME_TEMPLATE_MATCH_V2',
      'templateId',p_template_id,
      'templateTitle',v_template_title,
      'profileId',v_profile_id,
      'profileVersion',v_profile_version,
      'confidence',p_confidence,
      'matchMethod',p_match_method,
      'modelTier',nullif(btrim(coalesce(p_model_tier,'')),''),
      'modelName',nullif(btrim(coalesce(p_model_name,'')),''),
      'candidateCount',p_candidate_count,
      'residualReviewRequired',p_residual_review_required,
      'serverCoveredParameterCodes',v_server_covered_parameter_codes,
      'matchedAt',v_now
    )
  );

  update public.activity_events
  set
    activity_template_id=p_template_id,
    metadata_json=v_metadata,
    updated_at=v_now
  where id=v_event.id;

  -- The existing BEFORE UPDATE trigger snapshots the exact active impact profile.
  select e.impact_profile_id
  into v_profile_id
  from public.activity_events e
  where e.id=v_event.id;

  if v_profile_id is null then
    raise exception 'ATBRIDGE_V2_PROFILE_SNAPSHOT_FAILED';
  end if;

  -- Keep the durable quick-capture receipt consistent with the event in the same transaction.
  update public.raw_activity_signals s
  set
    normalized_preview_json=
      coalesce(s.normalized_preview_json,'{}'::jsonb)
      ||jsonb_build_object(
        'reviewFirstResult',
        coalesce(s.normalized_preview_json->'reviewFirstResult','{}'::jsonb)
        ||jsonb_build_object(
          'reviewRequired',p_residual_review_required,
          'reviewHref',case when p_residual_review_required then '/activity-review' else null end,
          'templateMatched',true,
          'templateId',p_template_id,
          'templateMatchConfidence',p_confidence,
          'residualReviewRequired',p_residual_review_required
        )
      ),
    metadata_json=
      coalesce(s.metadata_json,'{}'::jsonb)
      ||jsonb_build_object(
        'requiresHumanReview',p_residual_review_required,
        'typicalTemplateMatched',true,
        'typicalTemplateId',p_template_id,
        'typicalTemplateMatchConfidence',p_confidence,
        'typicalTemplateResidualReviewRequired',p_residual_review_required,
        'typicalTemplateMatchContract','ARCTOR_RUNTIME_TEMPLATE_MATCH_V2'
      ),
    updated_at=v_now
  where s.user_id=p_owner_user_id
    and s.output_event_id=v_event.id;

  return jsonb_build_object(
    'ok',true,
    'contract','ARCTOR_RUNTIME_TEMPLATE_MATCH_V2',
    'activityEventId',v_event.id,
    'templateId',p_template_id,
    'impactProfileId',v_profile_id,
    'profileVersion',v_profile_version,
    'confidence',p_confidence,
    'matchMethod',p_match_method,
    'residualReviewRequired',p_residual_review_required
  );
end
$function$;

revoke all on function public.apply_activity_template_match_v2(
  uuid,uuid,uuid,uuid,numeric,text,text,text,integer,boolean,numeric,numeric,numeric
) from public,anon,authenticated;
grant execute on function public.apply_activity_template_match_v2(
  uuid,uuid,uuid,uuid,numeric,text,text,text,integer,boolean,numeric,numeric,numeric
) to service_role;

-- Unified analytics input. Confirmed physical facts have priority over a virtual
-- contribution only for the exact same event + observation object + parameter code.
-- No rows are materialized by this view.
create view public.activity_object_analytics_inputs_v1
with (security_invoker=true)
as
select
  f.user_id,
  f.acting_as_actor_id,
  f.activity_event_id,
  f.value_object_id,
  f.value_numeric,
  f.measure_type,
  f.period_start,
  f.period_end,
  f.metadata,
  f.created_at,
  f.fact_status,
  'physical_confirmed'::text as source_kind
from public.activity_object_facts f
where f.fact_status='confirmed'

union all

select
  v.user_id,
  v.acting_as_actor_id,
  v.event_id as activity_event_id,
  v.target_value_object_id as value_object_id,
  case
    when v.aggregation_code='count' then 1::numeric
    else v.value_numeric
  end as value_numeric,
  case v.source_parameter_code
    when 'process_count' then 'count'
    when 'repetition_count' then 'repetitions'
    when 'distance_m' then 'distance'
    when 'duration_seconds' then 'duration'
    else 'derived_metric'
  end as measure_type,
  v.event_at as period_start,
  v.event_at as period_end,
  jsonb_build_object(
    'contract','ARCTOR_RUNTIME_TEMPLATE_VIRTUAL_FACT_V1',
    'parameterCode',v.target_parameter_code,
    'sourceParameterCode',v.source_parameter_code,
    'aggregationCode',v.aggregation_code,
    'profileId',v.profile_id,
    'profileObjectLinkId',v.profile_object_link_id,
    'relationCode',v.relation_code,
    'confidence',v.confidence,
    'provenance','typical_activity_profile_virtual'
  ) as metadata,
  v.event_at as created_at,
  'confirmed'::text as fact_status,
  'template_virtual'::text as source_kind
from public.activity_event_virtual_parameter_contributions_v1 v
where v.value_numeric is not null
  and not exists (
    select 1
    from public.activity_object_facts f
    where f.fact_status='confirmed'
      and f.user_id=v.user_id
      and f.acting_as_actor_id=v.acting_as_actor_id
      and f.activity_event_id=v.event_id
      and f.value_object_id=v.target_value_object_id
      and lower(
        coalesce(
          nullif(btrim(f.metadata->>'parameterCode'),''),
          nullif(btrim(f.metadata->>'systemParameterCode'),''),
          btrim(f.measure_type)
        )
      )=lower(v.target_parameter_code)
  );

revoke all on table public.activity_object_analytics_inputs_v1 from public,anon,authenticated;
grant select on table public.activity_object_analytics_inputs_v1 to service_role;

commit;
