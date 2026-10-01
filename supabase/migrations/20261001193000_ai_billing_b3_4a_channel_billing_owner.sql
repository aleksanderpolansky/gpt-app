-- ARCTor.app
-- AI Billing B3.4A — durable AI Channel billing-owner policy
-- 2026-10-01
--
-- Product rule:
--   1) channel created by ordinary user -> creator/owner pays;
--   2) channel created by administrator -> fixed platform billing owner pays:
--        aleksanderpolansky@gmail.com
--   3) unresolved owner/payer -> channel must not reach provider execution;
--   4) reading an already-created publication is not an AI billing event.
--
-- This migration:
--   * stores the billing policy and payer durably on ai_channels_v1;
--   * backfills existing channels from their current creator/owner admin state;
--   * assigns the policy atomically on every future INSERT through a DB trigger;
--   * updates the B3.0 binding RPCs so payer may differ from channel owner.
--
-- It does NOT fabricate billing links or charges for historical pre-gateway runs.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

do $preflight$
declare
  v_platform_owner_count bigint;
  v_platform_owner_wallet_count bigint;
  v_unresolved_channels bigint;
begin
  if to_regclass('public.ai_channels_v1') is null
     or to_regclass('public.ai_channel_runs_v1') is null
     or to_regclass('public.ai_usage_events') is null
     or to_regclass('public.app_users') is null
     or to_regclass('public.platform_admins') is null
     or to_regclass('public.ai_credit_wallets') is null then
    raise exception using
      errcode='42P01',
      message='ARCTOR_AI_BILLING_B3_4A_REQUIRED_TABLES_MISSING';
  end if;

  select count(*)
  into v_platform_owner_count
  from public.app_users
  where lower(email)=lower('aleksanderpolansky@gmail.com')
    and access_status is distinct from 'blocked';

  if v_platform_owner_count <> 1 then
    raise exception using
      errcode='23514',
      message='ARCTOR_AI_BILLING_B3_4A_PLATFORM_OWNER_INVALID:'
        || v_platform_owner_count::text;
  end if;

  select count(*)
  into v_platform_owner_wallet_count
  from public.ai_credit_wallets w
  join public.app_users u on u.id=w.app_user_id
  where lower(u.email)=lower('aleksanderpolansky@gmail.com')
    and u.access_status is distinct from 'blocked'
    and w.status='active';

  if v_platform_owner_wallet_count <> 1 then
    raise exception using
      errcode='23514',
      message='ARCTOR_AI_BILLING_B3_4A_PLATFORM_OWNER_WALLET_INVALID:'
        || v_platform_owner_wallet_count::text;
  end if;

  select count(*)
  into v_unresolved_channels
  from public.ai_channels_v1 c
  left join public.app_users u on u.id=c.owner_user_id
  where c.owner_user_id is null
     or c.creator_actor_id is null
     or u.id is null
     or u.access_status='blocked';

  if v_unresolved_channels <> 0 then
    raise exception using
      errcode='23514',
      message='ARCTOR_AI_BILLING_B3_4A_UNRESOLVED_EXISTING_CHANNELS:'
        || v_unresolved_channels::text;
  end if;

  if to_regprocedure(
       'public.bind_ai_channel_run_billing_v1(uuid,uuid,uuid,uuid,text)'
     ) is null
     or to_regprocedure(
       'public.bind_ai_channel_provider_response_v1(uuid,uuid,uuid,uuid,text,jsonb)'
     ) is null then
    raise exception using
      errcode='42883',
      message='ARCTOR_AI_BILLING_B3_4A_BACKGROUND_BIND_RPCS_MISSING';
  end if;
end;
$preflight$;

alter table public.ai_channels_v1
  add column if not exists billing_policy text;

alter table public.ai_channels_v1
  add column if not exists billing_user_id uuid
    references public.app_users(id);

-- Backfill only channel-level billing identity.
-- Historical runs and historical usage are intentionally untouched.
with platform_owner as (
  select id
  from public.app_users
  where lower(email)=lower('aleksanderpolansky@gmail.com')
    and access_status is distinct from 'blocked'
  limit 1
)
update public.ai_channels_v1 c
set
  billing_policy =
    case
      when exists(
        select 1
        from public.platform_admins a
        where a.app_user_id=c.owner_user_id
          and a.status='active'
          and a.role in ('owner','admin')
      )
      then 'platform_owner'
      else 'creator'
    end,
  billing_user_id =
    case
      when exists(
        select 1
        from public.platform_admins a
        where a.app_user_id=c.owner_user_id
          and a.status='active'
          and a.role in ('owner','admin')
      )
      then (select id from platform_owner)
      else c.owner_user_id
    end
where c.billing_policy is null
   or c.billing_user_id is null;

do $backfill_guard$
begin
  if exists(
    select 1
    from public.ai_channels_v1
    where billing_policy is null
       or billing_user_id is null
       or billing_policy not in ('creator','platform_owner')
       or (
         billing_policy='creator'
         and billing_user_id is distinct from owner_user_id
       )
  ) then
    raise exception using
      errcode='23514',
      message='ARCTOR_AI_BILLING_B3_4A_CHANNEL_BACKFILL_INVALID';
  end if;
end;
$backfill_guard$;

alter table public.ai_channels_v1
  alter column billing_policy set not null;

alter table public.ai_channels_v1
  alter column billing_user_id set not null;

alter table public.ai_channels_v1
  drop constraint if exists ai_channels_v1_billing_policy_allowed;

alter table public.ai_channels_v1
  add constraint ai_channels_v1_billing_policy_allowed
  check (billing_policy in ('creator','platform_owner'));

alter table public.ai_channels_v1
  drop constraint if exists ai_channels_v1_creator_billing_owner_matches;

alter table public.ai_channels_v1
  add constraint ai_channels_v1_creator_billing_owner_matches
  check (
    billing_policy <> 'creator'
    or billing_user_id=owner_user_id
  );

create or replace function public.assign_ai_channel_billing_owner_v1()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_owner_is_admin boolean;
  v_platform_owner_user_id uuid;
begin
  if new.owner_user_id is null
     or new.creator_actor_id is null then
    raise exception using
      errcode='22023',
      message='CHANNEL_BILLING_OWNER_REQUIRED';
  end if;

  if not exists(
    select 1
    from public.app_users u
    where u.id=new.owner_user_id
      and u.access_status is distinct from 'blocked'
  ) then
    raise exception using
      errcode='42501',
      message='CHANNEL_BILLING_OWNER_REQUIRED';
  end if;

  select exists(
    select 1
    from public.platform_admins a
    where a.app_user_id=new.owner_user_id
      and a.status='active'
      and a.role in ('owner','admin')
  )
  into v_owner_is_admin;

  if v_owner_is_admin then
    select u.id
    into v_platform_owner_user_id
    from public.app_users u
    where lower(u.email)=lower('aleksanderpolansky@gmail.com')
      and u.access_status is distinct from 'blocked'
    limit 1;

    if v_platform_owner_user_id is null then
      raise exception using
        errcode='23514',
        message='CHANNEL_PLATFORM_BILLING_OWNER_UNAVAILABLE';
    end if;

    new.billing_policy := 'platform_owner';
    new.billing_user_id := v_platform_owner_user_id;
  else
    new.billing_policy := 'creator';
    new.billing_user_id := new.owner_user_id;
  end if;

  return new;
end;
$function$;

revoke all on function public.assign_ai_channel_billing_owner_v1()
from public,anon,authenticated;

drop trigger if exists ai_channels_v1_assign_billing_owner
on public.ai_channels_v1;

create trigger ai_channels_v1_assign_billing_owner
before insert on public.ai_channels_v1
for each row
execute function public.assign_ai_channel_billing_owner_v1();

comment on column public.ai_channels_v1.billing_policy is
  'B3.4A durable AI billing policy fixed at channel creation: creator or platform_owner.';

comment on column public.ai_channels_v1.billing_user_id is
  'B3.4A durable app_user payer for every paid AI execution of this channel.';

comment on function public.assign_ai_channel_billing_owner_v1() is
  'B3.4A server-side INSERT policy: active admin owner -> fixed platform payer; ordinary owner -> creator payer; unresolved -> reject.';

-- Replace B3.0 binding RPC with the same behavior except that the billing
-- identity is now checked against ai_channels_v1.billing_user_id rather than
-- ai_channels_v1.owner_user_id.
create or replace function public.bind_ai_channel_run_billing_v1(
  p_channel_id uuid,
  p_run_id uuid,
  p_billing_user_id uuid,
  p_usage_event_id uuid,
  p_request_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_channel public.ai_channels_v1%rowtype;
  v_run public.ai_channel_runs_v1%rowtype;
  v_usage public.ai_usage_events%rowtype;
  v_key text;
  v_already boolean := false;
begin
  if p_channel_id is null
     or p_run_id is null
     or p_billing_user_id is null
     or p_usage_event_id is null then
    raise exception using
      errcode='22023',
      message='AI_CHANNEL_BACKGROUND_BILLING_BIND_IDS_REQUIRED';
  end if;

  v_key := nullif(btrim(coalesce(p_request_idempotency_key,'')),'');
  if v_key is null or char_length(v_key) not between 8 and 200 then
    raise exception using
      errcode='22023',
      message='AI_CHANNEL_BACKGROUND_BILLING_BIND_KEY_INVALID';
  end if;

  select *
  into v_channel
  from public.ai_channels_v1
  where id=p_channel_id
  for update;

  if not found then
    raise exception using
      errcode='23503',
      message='AI_CHANNEL_BACKGROUND_BILLING_CHANNEL_NOT_FOUND';
  end if;

  if v_channel.billing_user_id is null
     or v_channel.billing_user_id <> p_billing_user_id then
    raise exception using
      errcode='42501',
      message='AI_CHANNEL_BACKGROUND_BILLING_OWNER_MISMATCH';
  end if;

  select *
  into v_run
  from public.ai_channel_runs_v1
  where id=p_run_id
    and channel_id=p_channel_id
  for update;

  if not found then
    raise exception using
      errcode='23503',
      message='AI_CHANNEL_BACKGROUND_BILLING_RUN_NOT_FOUND';
  end if;

  select *
  into v_usage
  from public.ai_usage_events
  where id=p_usage_event_id
    and app_user_id=p_billing_user_id
  for update;

  if not found then
    raise exception using
      errcode='23503',
      message='AI_CHANNEL_BACKGROUND_BILLING_USAGE_NOT_FOUND';
  end if;

  if coalesce(v_usage.request_idempotency_key,'') <> v_key then
    raise exception using
      errcode='23514',
      message='AI_CHANNEL_BACKGROUND_BILLING_KEY_MISMATCH';
  end if;

  if v_usage.status='openai_failed' then
    raise exception using
      errcode='23514',
      message='AI_CHANNEL_BACKGROUND_BILLING_USAGE_ALREADY_FAILED';
  end if;

  if coalesce(v_usage.reservation_eur,0) <= 0
     and v_usage.status <> 'wallet_debited' then
    raise exception using
      errcode='23514',
      message='AI_CHANNEL_BACKGROUND_BILLING_RESERVATION_REQUIRED';
  end if;

  if v_run.ai_usage_event_id is not null
     or v_run.billing_user_id is not null
     or v_run.billing_request_idempotency_key is not null then
    if v_run.ai_usage_event_id=p_usage_event_id
       and v_run.billing_user_id=p_billing_user_id
       and v_run.billing_request_idempotency_key=v_key then
      v_already := true;
    else
      raise exception using
        errcode='23505',
        message='AI_CHANNEL_BACKGROUND_BILLING_RUN_BIND_CONFLICT';
    end if;
  end if;

  if not v_already then
    update public.ai_channel_runs_v1
    set
      billing_user_id=p_billing_user_id,
      ai_usage_event_id=p_usage_event_id,
      billing_request_idempotency_key=v_key
    where id=p_run_id;
  end if;

  return jsonb_build_object(
    'ok',true,
    'alreadyBound',v_already,
    'channelId',p_channel_id,
    'runId',p_run_id,
    'billingUserId',p_billing_user_id,
    'usageEventId',p_usage_event_id,
    'requestIdempotencyKey',v_key
  );
end;
$function$;

revoke all on function public.bind_ai_channel_run_billing_v1(
  uuid,uuid,uuid,uuid,text
) from public,anon,authenticated;

grant execute on function public.bind_ai_channel_run_billing_v1(
  uuid,uuid,uuid,uuid,text
) to service_role;

create or replace function public.bind_ai_channel_provider_response_v1(
  p_channel_id uuid,
  p_run_id uuid,
  p_billing_user_id uuid,
  p_usage_event_id uuid,
  p_response_id text,
  p_usage jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_channel public.ai_channels_v1%rowtype;
  v_run public.ai_channel_runs_v1%rowtype;
  v_usage public.ai_usage_events%rowtype;
  v_response text;
  v_usage_patch jsonb;
  v_already boolean := false;
begin
  if p_channel_id is null
     or p_run_id is null
     or p_billing_user_id is null
     or p_usage_event_id is null then
    raise exception using
      errcode='22023',
      message='AI_CHANNEL_BACKGROUND_PROVIDER_BIND_IDS_REQUIRED';
  end if;

  v_response := nullif(btrim(coalesce(p_response_id,'')),'');
  if v_response is null
     or v_response !~ '^resp_[A-Za-z0-9_-]+$' then
    raise exception using
      errcode='22023',
      message='AI_CHANNEL_BACKGROUND_PROVIDER_RESPONSE_ID_INVALID';
  end if;

  v_usage_patch := coalesce(p_usage,'{}'::jsonb);
  if jsonb_typeof(v_usage_patch) <> 'object' then
    raise exception using
      errcode='22023',
      message='AI_CHANNEL_BACKGROUND_PROVIDER_USAGE_PATCH_INVALID';
  end if;

  select *
  into v_channel
  from public.ai_channels_v1
  where id=p_channel_id
  for update;

  if not found
     or v_channel.billing_user_id is null
     or v_channel.billing_user_id<>p_billing_user_id then
    raise exception using
      errcode='42501',
      message='AI_CHANNEL_BACKGROUND_PROVIDER_OWNER_MISMATCH';
  end if;

  select *
  into v_run
  from public.ai_channel_runs_v1
  where id=p_run_id
    and channel_id=p_channel_id
  for update;

  if not found
     or v_run.billing_user_id<>p_billing_user_id
     or v_run.ai_usage_event_id<>p_usage_event_id then
    raise exception using
      errcode='23514',
      message='AI_CHANNEL_BACKGROUND_PROVIDER_RUN_NOT_BOUND';
  end if;

  select *
  into v_usage
  from public.ai_usage_events
  where id=p_usage_event_id
    and app_user_id=p_billing_user_id
  for update;

  if not found then
    raise exception using
      errcode='23503',
      message='AI_CHANNEL_BACKGROUND_PROVIDER_USAGE_NOT_FOUND';
  end if;

  if v_run.provider_response_id is not null
     and v_run.provider_response_id<>v_response then
    raise exception using
      errcode='23505',
      message='AI_CHANNEL_BACKGROUND_PROVIDER_RUN_RESPONSE_CONFLICT';
  end if;

  if v_usage.openai_response_id is not null
     and v_usage.openai_response_id<>v_response then
    raise exception using
      errcode='23505',
      message='AI_CHANNEL_BACKGROUND_PROVIDER_USAGE_RESPONSE_CONFLICT';
  end if;

  v_already :=
    v_run.provider_response_id=v_response
    and v_usage.openai_response_id=v_response;

  update public.ai_channel_runs_v1
  set
    provider_response_id=v_response,
    usage=coalesce(usage,'{}'::jsonb) || v_usage_patch
  where id=p_run_id;

  update public.ai_usage_events
  set
    openai_response_id=v_response,
    response_metadata=coalesce(response_metadata,'{}'::jsonb)
      || jsonb_build_object(
        'contract','ARCTOR_AI_BILLING_BACKGROUND_GATEWAY_B3_0_V1',
        'background',true,
        'providerBoundAt',clock_timestamp()
      )
  where id=p_usage_event_id;

  return jsonb_build_object(
    'ok',true,
    'alreadyBound',v_already,
    'channelId',p_channel_id,
    'runId',p_run_id,
    'billingUserId',p_billing_user_id,
    'usageEventId',p_usage_event_id,
    'providerResponseId',v_response
  );
end;
$function$;

revoke all on function public.bind_ai_channel_provider_response_v1(
  uuid,uuid,uuid,uuid,text,jsonb
) from public,anon,authenticated;

grant execute on function public.bind_ai_channel_provider_response_v1(
  uuid,uuid,uuid,uuid,text,jsonb
) to service_role;

do $acceptance$
declare
  v_platform_owner uuid;
begin
  select id
  into v_platform_owner
  from public.app_users
  where lower(email)=lower('aleksanderpolansky@gmail.com')
    and access_status is distinct from 'blocked'
  limit 1;

  if v_platform_owner is null then
    raise exception using
      errcode='23514',
      message='ARCTOR_AI_BILLING_B3_4A_PLATFORM_OWNER_MISSING_AFTER_WRITE';
  end if;

  if exists(
    select 1
    from public.ai_channels_v1 c
    where c.billing_policy is null
       or c.billing_user_id is null
       or (
         c.billing_policy='creator'
         and c.billing_user_id is distinct from c.owner_user_id
       )
       or (
         c.billing_policy='platform_owner'
         and c.billing_user_id is distinct from v_platform_owner
       )
  ) then
    raise exception using
      errcode='23514',
      message='ARCTOR_AI_BILLING_B3_4A_CHANNEL_POLICY_INVALID_AFTER_WRITE';
  end if;

  if not exists(
    select 1
    from pg_trigger t
    join pg_class c on c.oid=t.tgrelid
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public'
      and c.relname='ai_channels_v1'
      and t.tgname='ai_channels_v1_assign_billing_owner'
      and not t.tgisinternal
      and t.tgenabled <> 'D'
  ) then
    raise exception using
      errcode='23514',
      message='ARCTOR_AI_BILLING_B3_4A_TRIGGER_MISSING_AFTER_WRITE';
  end if;
end;
$acceptance$;

commit;

with platform_owner as (
  select id,email,name,access_status
  from public.app_users
  where lower(email)=lower('aleksanderpolansky@gmail.com')
  limit 1
),
platform_wallet as (
  select w.*
  from public.ai_credit_wallets w
  join platform_owner p on p.id=w.app_user_id
  limit 1
),
channel_state as (
  select
    c.id,
    c.name,
    c.scope,
    c.status,
    c.owner_user_id,
    c.billing_policy,
    c.billing_user_id,
    u.email as owner_email,
    bu.email as billing_email,
    exists(
      select 1
      from public.platform_admins a
      where a.app_user_id=c.owner_user_id
        and a.status='active'
        and a.role in ('owner','admin')
    ) as owner_is_current_admin
  from public.ai_channels_v1 c
  left join public.app_users u on u.id=c.owner_user_id
  left join public.app_users bu on bu.id=c.billing_user_id
),
checks as (
  select
    (
      select count(*)=2
      from information_schema.columns
      where table_schema='public'
        and table_name='ai_channels_v1'
        and column_name in ('billing_policy','billing_user_id')
        and is_nullable='NO'
    ) as billing_columns_not_null,

    exists(
      select 1
      from pg_trigger t
      join pg_class c on c.oid=t.tgrelid
      join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public'
        and c.relname='ai_channels_v1'
        and t.tgname='ai_channels_v1_assign_billing_owner'
        and not t.tgisinternal
        and t.tgenabled <> 'D'
    ) as insert_policy_trigger_enabled,

    position(
      'billing_user_id'
      in pg_get_functiondef(
        'public.bind_ai_channel_run_billing_v1(uuid,uuid,uuid,uuid,text)'::regprocedure
      )
    )>0 as bind_run_uses_channel_billing_user,

    position(
      'billing_user_id'
      in pg_get_functiondef(
        'public.bind_ai_channel_provider_response_v1(uuid,uuid,uuid,uuid,text,jsonb)'::regprocedure
      )
    )>0 as bind_provider_uses_channel_billing_user,

    (
      select count(*)=0
      from channel_state c
      cross join platform_owner p
      where c.billing_user_id is null
         or c.billing_policy not in ('creator','platform_owner')
         or (
           c.billing_policy='creator'
           and c.billing_user_id is distinct from c.owner_user_id
         )
         or (
           c.billing_policy='platform_owner'
           and c.billing_user_id is distinct from p.id
         )
    ) as all_existing_channels_resolved,

    exists(select 1 from platform_owner)
      as platform_owner_exists,

    coalesce(
      (select status='active' from platform_wallet),
      false
    ) as platform_owner_wallet_active
)
select jsonb_pretty(
  jsonb_build_object(
    'check','ARCTOR_AI_BILLING_B3_4A_CHANNEL_BILLING_OWNER',
    'pass',
      (
        select
          billing_columns_not_null
          and insert_policy_trigger_enabled
          and bind_run_uses_channel_billing_user
          and bind_provider_uses_channel_billing_user
          and all_existing_channels_resolved
          and platform_owner_exists
          and platform_owner_wallet_active
        from checks
      ),
    'platformOwner',
      coalesce(
        (
          select jsonb_build_object(
            'id',p.id,
            'email',p.email,
            'name',p.name,
            'accessStatus',p.access_status
          )
          from platform_owner p
        ),
        'null'::jsonb
      ),
    'platformOwnerWallet',
      coalesce(
        (
          select jsonb_build_object(
            'id',w.id,
            'status',w.status,
            'balanceEur',w.balance_eur,
            'reservedEur',w.reserved_eur
          )
          from platform_wallet w
        ),
        'null'::jsonb
      ),
    'checks',(select to_jsonb(c) from checks c),
    'channelCounts',
      jsonb_build_object(
        'total',(select count(*) from channel_state),
        'creatorPolicy',
          (
            select count(*)
            from channel_state
            where billing_policy='creator'
          ),
        'platformOwnerPolicy',
          (
            select count(*)
            from channel_state
            where billing_policy='platform_owner'
          ),
        'unresolved',
          (
            select count(*)
            from channel_state
            where billing_user_id is null
               or billing_policy not in ('creator','platform_owner')
          )
      ),
    'channels',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id',c.id,
              'name',c.name,
              'scope',c.scope,
              'status',c.status,
              'ownerUserId',c.owner_user_id,
              'ownerEmail',c.owner_email,
              'ownerIsCurrentAdmin',c.owner_is_current_admin,
              'billingPolicy',c.billing_policy,
              'billingUserId',c.billing_user_id,
              'billingEmail',c.billing_email
            )
            order by c.name
          )
          from channel_state c
        ),
        '[]'::jsonb
      ),
    'historicalRunsWithoutBillingLink',
      (
        select count(*)
        from public.ai_channel_runs_v1
        where billing_user_id is null
           or ai_usage_event_id is null
      ),
    'historicalRunsRewrittenByMigration',0,
    'next','B3.4A_SOURCE_DEPLOY_THEN_CONTROLLED_ADMIN_CHANNEL_EVIDENCE'
  )
) as arctor_ai_billing_b3_4a_channel_billing_owner;
