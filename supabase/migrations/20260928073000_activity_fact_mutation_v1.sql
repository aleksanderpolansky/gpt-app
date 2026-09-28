begin;

create table if not exists public.activity_fact_mutation_audit_v1 (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.app_users(id) on delete cascade,
  owner_actor_id uuid not null references public.actors(id) on delete cascade,
  fact_id uuid null references public.activity_object_facts(id) on delete set null,
  measure_id uuid null references public.activity_event_measures(id) on delete set null,
  activity_event_id uuid null references public.activity_events(id) on delete set null,
  action_code text not null check (action_code in ('edit','soft_delete')),
  reason text not null check (length(btrim(reason)) >= 3),
  idempotency_key text not null check (length(btrim(idempotency_key)) >= 8),
  before_json jsonb not null default '{}'::jsonb check (jsonb_typeof(before_json)='object'),
  after_json jsonb not null default '{}'::jsonb check (jsonb_typeof(after_json)='object'),
  result_json jsonb not null default '{}'::jsonb check (jsonb_typeof(result_json)='object'),
  created_at timestamptz not null default clock_timestamp()
);

create unique index if not exists activity_fact_mutation_audit_v1_idempotency_uq
  on public.activity_fact_mutation_audit_v1(owner_user_id,owner_actor_id,idempotency_key);

alter table public.activity_fact_mutation_audit_v1 enable row level security;
revoke all on table public.activity_fact_mutation_audit_v1 from anon, authenticated;

create or replace function public.mutate_activity_fact_v1(
  p_owner_user_id uuid,
  p_owner_actor_id uuid,
  p_fact_id uuid,
  p_action text,
  p_expected_updated_at timestamptz,
  p_idempotency_key text,
  p_reason text,
  p_value_numeric numeric default null,
  p_value_text text default null,
  p_value_boolean boolean default null,
  p_unit text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_target public.activity_object_facts%rowtype;
  v_measure public.activity_event_measures%rowtype;
  v_existing public.activity_fact_mutation_audit_v1%rowtype;
  v_action text := lower(nullif(btrim(p_action),''));
  v_reason text := nullif(btrim(p_reason),'');
  v_key text := nullif(btrim(p_idempotency_key),'');
  v_unit text := lower(nullif(btrim(p_unit),''));
  v_count int;
  v_before jsonb;
  v_after jsonb;
  v_result jsonb;
begin
  if p_owner_user_id is null or p_owner_actor_id is null or p_fact_id is null then
    raise exception using errcode='22023', message='FACT_MUTATION_REQUIRED_ID_MISSING';
  end if;
  if v_action not in ('edit','soft_delete') then
    raise exception using errcode='22023', message='FACT_MUTATION_ACTION_INVALID';
  end if;
  if v_reason is null or length(v_reason)<3 then
    raise exception using errcode='22023', message='FACT_MUTATION_REASON_REQUIRED';
  end if;
  if v_key is null or length(v_key)<8 then
    raise exception using errcode='22023', message='FACT_MUTATION_IDEMPOTENCY_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner_user_id::text||':'||p_owner_actor_id::text||':'||v_key,0));

  select * into v_existing
  from public.activity_fact_mutation_audit_v1
  where owner_user_id=p_owner_user_id and owner_actor_id=p_owner_actor_id and idempotency_key=v_key;
  if found then
    if v_existing.fact_id is distinct from p_fact_id or v_existing.action_code is distinct from v_action then
      raise exception using errcode='23505', message='FACT_MUTATION_IDEMPOTENCY_CONFLICT';
    end if;
    return v_existing.result_json || jsonb_build_object('writeStatus','idempotent_replay','dbWriteExecuted',false);
  end if;

  select * into v_target
  from public.activity_object_facts
  where id=p_fact_id and user_id=p_owner_user_id and acting_as_actor_id=p_owner_actor_id
  for update;
  if not found then raise exception using errcode='42501', message='FACT_MUTATION_FACT_NOT_OWNED'; end if;
  if p_expected_updated_at is null or v_target.updated_at is distinct from p_expected_updated_at then
    raise exception using errcode='40001', message='FACT_MUTATION_STALE_VERSION';
  end if;
  if v_target.fact_role_code='result' then
    raise exception using errcode='23514', message='FACT_MUTATION_DERIVED_RESULT_READ_ONLY';
  end if;
  if v_target.fact_status='deleted' then
    raise exception using errcode='23514', message='FACT_MUTATION_ALREADY_DELETED';
  end if;

  if exists(
    select 1 from public.activity_fact_derivation_inputs_v1 d
    join public.activity_object_facts f on f.id=d.input_fact_id
    where f.id=v_target.id or (v_target.measure_id is not null and f.measure_id=v_target.measure_id)
  ) then
    raise exception using errcode='23514', message='FACT_MUTATION_HAS_DERIVED_DEPENDENTS';
  end if;

  if exists(
    select 1 from public.activity_object_facts n
    where n.previous_snapshot_fact_id=v_target.id
       or (v_target.measure_id is not null and n.previous_snapshot_fact_id in (
         select id from public.activity_object_facts where measure_id=v_target.measure_id
       ))
  ) then
    raise exception using errcode='23514', message='FACT_MUTATION_HAS_SNAPSHOT_DEPENDENTS';
  end if;

  if v_target.measure_id is not null then
    select * into v_measure from public.activity_event_measures
    where id=v_target.measure_id and user_id=p_owner_user_id and acting_as_actor_id=p_owner_actor_id
    for update;
    if not found then raise exception using errcode='23503', message='FACT_MUTATION_MEASURE_NOT_FOUND'; end if;
  end if;

  select jsonb_build_object(
    'facts',coalesce(jsonb_agg(to_jsonb(f) order by f.id),'[]'::jsonb),
    'measure',case when v_target.measure_id is null then null else to_jsonb(v_measure) end
  ) into v_before
  from public.activity_object_facts f
  where f.id=v_target.id or (v_target.measure_id is not null and f.measure_id=v_target.measure_id);

  if v_action='edit' then
    v_count := (case when p_value_numeric is not null then 1 else 0 end)
             + (case when p_value_text is not null then 1 else 0 end)
             + (case when p_value_boolean is not null then 1 else 0 end);
    if v_count<>1 then raise exception using errcode='23514', message='FACT_MUTATION_EXACTLY_ONE_VALUE_REQUIRED'; end if;
    if v_unit is null then raise exception using errcode='22023', message='FACT_MUTATION_UNIT_REQUIRED'; end if;

    if v_target.value_numeric is not null and p_value_numeric is null then
      raise exception using errcode='23514', message='FACT_MUTATION_VALUE_TYPE_CHANGE_BLOCKED';
    elsif v_target.value_text is not null and p_value_text is null then
      raise exception using errcode='23514', message='FACT_MUTATION_VALUE_TYPE_CHANGE_BLOCKED';
    elsif v_target.value_boolean is not null and p_value_boolean is null then
      raise exception using errcode='23514', message='FACT_MUTATION_VALUE_TYPE_CHANGE_BLOCKED';
    end if;

    if v_target.measure_id is not null then
      update public.activity_event_measures set
        value_numeric=p_value_numeric,value_text=p_value_text,value_boolean=p_value_boolean,
        unit=v_unit,source_type='user_edit',confidence=1,
        metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('lastFactMutationV1',jsonb_build_object('action','edit','reason',v_reason,'at',clock_timestamp()))
      where id=v_target.measure_id;

      update public.activity_measure_provenance set
        value_origin_code='user_edit',source_reliability_code='user_reported',updated_at=clock_timestamp()
      where measure_id=v_target.measure_id;

      update public.activity_object_facts set
        value_numeric=p_value_numeric,value_text=p_value_text,value_boolean=p_value_boolean,
        unit=v_unit,source_type='user_edit',confidence=1,is_user_confirmed=true,
        semantic_match_method_code='user_confirmed',
        metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('lastFactMutationV1',jsonb_build_object('action','edit','reason',v_reason,'at',clock_timestamp()))
      where measure_id=v_target.measure_id and user_id=p_owner_user_id and acting_as_actor_id=p_owner_actor_id;
    else
      if v_target.fact_role_code<>'snapshot' then
        raise exception using errcode='23514', message='FACT_MUTATION_STANDALONE_ONLY_SNAPSHOT_SUPPORTED';
      end if;
      update public.activity_object_facts set
        value_numeric=p_value_numeric,value_text=p_value_text,value_boolean=p_value_boolean,
        unit=v_unit,confidence=1,is_user_confirmed=true,semantic_match_method_code='user_confirmed',
        metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('lastFactMutationV1',jsonb_build_object('action','edit','reason',v_reason,'at',clock_timestamp()))
      where id=v_target.id;
    end if;
  else
    update public.activity_object_facts set
      fact_status='deleted',
      metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('softDeleteV1',jsonb_build_object('reason',v_reason,'at',clock_timestamp()))
    where user_id=p_owner_user_id and acting_as_actor_id=p_owner_actor_id
      and (id=v_target.id or (v_target.measure_id is not null and measure_id=v_target.measure_id));
  end if;

  select jsonb_build_object('facts',coalesce(jsonb_agg(to_jsonb(f) order by f.id),'[]'::jsonb)) into v_after
  from public.activity_object_facts f
  where f.id=v_target.id or (v_target.measure_id is not null and f.measure_id=v_target.measure_id);

  v_result:=jsonb_build_object('ok',true,'contractVersion','ARCTOR_ACTIVITY_FACT_MUTATION_V1','writeStatus','written','dbWriteExecuted',true,'action',v_action,'factId',p_fact_id,'measureId',v_target.measure_id);

  insert into public.activity_fact_mutation_audit_v1(owner_user_id,owner_actor_id,fact_id,measure_id,activity_event_id,action_code,reason,idempotency_key,before_json,after_json,result_json)
  values(p_owner_user_id,p_owner_actor_id,p_fact_id,v_target.measure_id,v_target.activity_event_id,v_action,v_reason,v_key,v_before,v_after,v_result);

  return v_result;
end;
$function$;

revoke all on function public.mutate_activity_fact_v1(uuid,uuid,uuid,text,timestamptz,text,text,numeric,text,boolean,text)
  from public,anon,authenticated;
grant execute on function public.mutate_activity_fact_v1(uuid,uuid,uuid,text,timestamptz,text,text,numeric,text,boolean,text)
  to service_role;

commit;
