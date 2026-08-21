-- ARCTor.app
-- Value Object authoring + analytics foundation V1A
-- CONTROLLED ROLLBACK
-- Refuses to delete user analytics configuration.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

do $guard$
declare
  v_profiles bigint := 0;
  v_rules bigint := 0;
begin
  if to_regclass('public.value_object_analytics_profiles_v1') is not null then
    select count(*) into v_profiles from public.value_object_analytics_profiles_v1;
  end if;
  if to_regclass('public.value_object_analytics_effect_rules_v1') is not null then
    select count(*) into v_rules from public.value_object_analytics_effect_rules_v1;
  end if;
  if v_profiles <> 0 or v_rules <> 0 then
    raise exception using
      errcode='23514',
      message='VO_ANALYTICS_V1A_ROLLBACK_BLOCKED_USER_DATA_EXISTS',
      detail='profiles='||v_profiles||', effect_rules='||v_rules;
  end if;
end
$guard$;

drop trigger if exists block_active_fact_mutating_coefficient_rule_v1a_trg
  on public.activity_leaf_fact_coefficient_rules_a31;
drop function if exists public.block_active_fact_mutating_coefficient_rule_v1a();
drop table if exists public.value_object_analytics_effect_rules_v1;
drop table if exists public.value_object_analytics_profiles_v1;

commit;

select jsonb_build_object(
  'status','PASS',
  'profilesRemoved',to_regclass('public.value_object_analytics_profiles_v1') is null,
  'effectRulesRemoved',to_regclass('public.value_object_analytics_effect_rules_v1') is null,
  'oldRuleLockRemoved',to_regprocedure('public.block_active_fact_mutating_coefficient_rule_v1a()') is null
) as arctor_vo_analytics_v1a_rollback_result;
