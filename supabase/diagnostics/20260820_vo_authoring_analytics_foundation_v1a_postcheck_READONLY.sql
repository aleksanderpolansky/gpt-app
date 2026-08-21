-- ARCTor.app
-- Value Object authoring + analytics foundation V1A
-- READ-ONLY POSTCHECK

with checks(check_name,passed,detail) as (
  select '01_profiles_table',
    to_regclass('public.value_object_analytics_profiles_v1') is not null,
    coalesce(to_regclass('public.value_object_analytics_profiles_v1')::text,'missing')
  union all
  select '02_effect_rules_table',
    to_regclass('public.value_object_analytics_effect_rules_v1') is not null,
    coalesce(to_regclass('public.value_object_analytics_effect_rules_v1')::text,'missing')
  union all
  select '03_profiles_rls',
    coalesce((select c.relrowsecurity from pg_class c where c.oid=to_regclass('public.value_object_analytics_profiles_v1')),false),
    null
  union all
  select '04_effect_rules_rls',
    coalesce((select c.relrowsecurity from pg_class c where c.oid=to_regclass('public.value_object_analytics_effect_rules_v1')),false),
    null
  union all
  select '05_browser_profiles_blocked',
    case when to_regclass('public.value_object_analytics_profiles_v1') is null then false else
      not has_table_privilege('anon',to_regclass('public.value_object_analytics_profiles_v1'),'SELECT')
      and not has_table_privilege('authenticated',to_regclass('public.value_object_analytics_profiles_v1'),'SELECT')
    end,
    null
  union all
  select '06_browser_effect_rules_blocked',
    case when to_regclass('public.value_object_analytics_effect_rules_v1') is null then false else
      not has_table_privilege('anon',to_regclass('public.value_object_analytics_effect_rules_v1'),'SELECT')
      and not has_table_privilege('authenticated',to_regclass('public.value_object_analytics_effect_rules_v1'),'SELECT')
    end,
    null
  union all
  select '07_service_profiles_crud',
    case when to_regclass('public.value_object_analytics_profiles_v1') is null then false else
      has_table_privilege('service_role',to_regclass('public.value_object_analytics_profiles_v1'),'SELECT')
      and has_table_privilege('service_role',to_regclass('public.value_object_analytics_profiles_v1'),'INSERT')
      and has_table_privilege('service_role',to_regclass('public.value_object_analytics_profiles_v1'),'UPDATE')
      and has_table_privilege('service_role',to_regclass('public.value_object_analytics_profiles_v1'),'DELETE')
    end,
    null
  union all
  select '08_service_effect_rules_crud',
    case when to_regclass('public.value_object_analytics_effect_rules_v1') is null then false else
      has_table_privilege('service_role',to_regclass('public.value_object_analytics_effect_rules_v1'),'SELECT')
      and has_table_privilege('service_role',to_regclass('public.value_object_analytics_effect_rules_v1'),'INSERT')
      and has_table_privilege('service_role',to_regclass('public.value_object_analytics_effect_rules_v1'),'UPDATE')
      and has_table_privilege('service_role',to_regclass('public.value_object_analytics_effect_rules_v1'),'DELETE')
    end,
    null
  union all
  select '09_symptom_state_leaf_kind',
    exists(
      select 1 from public.value_object_kind_registry k
      where k.facet_code='STATE'
        and k.object_kind_code='symptom_state'
        and k.status='active'
        and k.allowed_node_roles_json ? 'leaf'
    ),
    null
  union all
  select '10_old_active_fact_mutating_rules_zero',
    not exists(
      select 1
      from public.activity_leaf_fact_coefficient_rules_a31
      where status='active'
    ),
    (select count(*)::text from public.activity_leaf_fact_coefficient_rules_a31 where status='active')
  union all
  select '11_fact_mutating_rule_lock_trigger',
    exists(
      select 1
      from pg_trigger t
      where t.tgrelid='public.activity_leaf_fact_coefficient_rules_a31'::regclass
        and t.tgname='block_active_fact_mutating_coefficient_rule_v1a_trg'
        and not t.tgisinternal
    ),
    null
  union all
  select '12_product_type_preserved',
    exists(select 1 from public.value_object_kind_registry k where k.object_kind_code='product_type' and k.status='active'),
    null
  union all
  select '13_service_type_preserved',
    exists(select 1 from public.value_object_kind_registry k where k.object_kind_code='service_type' and k.status='active'),
    null
), summary as (
  select bool_and(passed) as all_pass,
    jsonb_agg(jsonb_build_object('check',check_name,'passed',passed,'detail',detail) order by check_name) as rows
  from checks
)
select jsonb_pretty(jsonb_build_object(
  'contract','ARCTOR_VO_AUTHORING_ANALYTICS_FOUNDATION_V1A_POSTCHECK',
  'checkedAt',now(),
  'allPass',summary.all_pass,
  'checks',summary.rows,
  'readOnly',true
)) as arctor_vo_analytics_v1a_postcheck
from summary;
