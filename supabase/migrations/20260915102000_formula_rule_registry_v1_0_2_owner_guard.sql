/*
ARCTor.app — Formula Rule Registry Foundation V1.0.2

Additive ownership hardening only.

Purpose:
- directly prove that a user-scoped formula rule owner_actor_id belongs to owner_user_id;
- mirror the canonical application actor-context ownership path:
  actor_public_profiles.owner_user_id -> actor_id -> active actors row;
- keep the already committed V1 migration immutable;
- do not execute formulas;
- do not write facts;
- do not touch the recalculation queue.
*/

begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

do $preflight$
begin
  if to_regclass('public.activity_fact_calculation_rule_series_v1') is null
     or to_regclass('public.actor_public_profiles') is null
     or to_regclass('public.actors') is null then
    raise exception using
      errcode = '42P01',
      message = 'FORMULA_RULE_V1_0_2_REQUIRED_FOUNDATION_MISSING';
  end if;

  if to_regprocedure(
    'public.enforce_activity_fact_calculation_rule_user_owner_v1_0_2()'
  ) is not null then
    raise exception using
      errcode = '42P07',
      message = 'FORMULA_RULE_V1_0_2_ALREADY_INSTALLED_OR_PARTIALLY_APPLIED';
  end if;

  /*
  Safe upgrade guard for any environment where V1 may already contain rows.
  Production is expected to receive V1 and V1.0.2 sequentially, but V1.0.2
  must never silently accept a pre-existing invalid user/actor pair.
  */
  if exists (
    select 1
    from public.activity_fact_calculation_rule_series_v1 rule_series
    where rule_series.scope_code = 'user'
      and not exists (
        select 1
        from public.actor_public_profiles profile
        join public.actors actor
          on actor.id = profile.actor_id
        where profile.owner_user_id = rule_series.owner_user_id
          and profile.actor_id = rule_series.owner_actor_id
          and profile.profile_kind in ('personal', 'avatar')
          and actor.status = 'active'
          and (
            (
              profile.profile_kind = 'personal'
              and actor.actor_type = 'person'
            )
            or
            (
              profile.profile_kind = 'avatar'
              and actor.actor_type = 'avatar'
            )
          )
      )
  ) then
    raise exception using
      errcode = '23514',
      message = 'FORMULA_RULE_V1_0_2_EXISTING_USER_OWNER_MISMATCH';
  end if;
end;
$preflight$;

create function public.enforce_activity_fact_calculation_rule_user_owner_v1_0_2()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if new.scope_code = 'user' then
    if new.owner_user_id is null or new.owner_actor_id is null then
      raise exception using
        errcode = '23514',
        message = 'FORMULA_RULE_V1_0_2_USER_OWNER_PAIR_REQUIRED';
    end if;

    if not exists (
      select 1
      from public.actor_public_profiles profile
      join public.actors actor
        on actor.id = profile.actor_id
      where profile.owner_user_id = new.owner_user_id
        and profile.actor_id = new.owner_actor_id
        and profile.profile_kind in ('personal', 'avatar')
        and actor.status = 'active'
        and (
          (
            profile.profile_kind = 'personal'
            and actor.actor_type = 'person'
          )
          or
          (
            profile.profile_kind = 'avatar'
            and actor.actor_type = 'avatar'
          )
        )
    ) then
      raise exception using
        errcode = '42501',
        message = 'FORMULA_RULE_V1_0_2_USER_ACTOR_NOT_OWNED_BY_USER';
    end if;
  end if;

  return new;
end;
$function$;

create trigger afcrs_v1_user_owner_guard_v1_0_2_trg
before insert or update
on public.activity_fact_calculation_rule_series_v1
for each row
execute function public.enforce_activity_fact_calculation_rule_user_owner_v1_0_2();

comment on function public.enforce_activity_fact_calculation_rule_user_owner_v1_0_2() is
  'Formula Rule Registry V1.0.2 direct user/actor ownership guard. Mirrors actor-context ownership through actor_public_profiles and active actors.';

commit;
