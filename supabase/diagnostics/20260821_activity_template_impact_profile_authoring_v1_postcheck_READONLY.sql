-- READ ONLY POSTCHECK: ARCTOR_ACTIVITY_TEMPLATE_IMPACT_PROFILE_AUTHORING_V1
with checks as (
  select '01_profiles_table' as check_name,
         to_regclass('public.activity_template_impact_profiles_v1') is not null as passed
  union all select '02_parameters_table', to_regclass('public.activity_template_profile_parameters_v1') is not null
  union all select '03_links_table', to_regclass('public.activity_template_profile_object_links_v1') is not null
  union all select '04_routes_table', to_regclass('public.activity_template_parameter_routes_v1') is not null
  union all select '05_object_view', to_regclass('public.activity_event_profile_object_contributions_v1') is not null
  union all select '06_parameter_view', to_regclass('public.activity_event_virtual_parameter_contributions_v1') is not null
  union all select '07_event_profile_column', exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='activity_events' and column_name='impact_profile_id'
  )
  union all select '08_snapshot_trigger', exists (
    select 1 from pg_trigger where tgname='trg_activity_events_impact_profile_v1' and not tgisinternal
  )
  union all select '09_save_rpc', exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='save_activity_template_impact_profile_v1'
  )
  union all select '10_bidirectional_profile_index', to_regclass('public.idx_atipol_v1_profile_target') is not null
  union all select '11_bidirectional_object_index', to_regclass('public.idx_atipol_v1_target_profile') is not null
  union all select '12_event_profile_index', to_regclass('public.idx_activity_events_impact_profile_id') is not null
  union all select '13_profiles_rls', coalesce((select relrowsecurity from pg_class where oid='public.activity_template_impact_profiles_v1'::regclass),false)
  union all select '14_links_rls', coalesce((select relrowsecurity from pg_class where oid='public.activity_template_profile_object_links_v1'::regclass),false)
  union all select '15_anon_no_profiles_select', not has_table_privilege('anon','public.activity_template_impact_profiles_v1','SELECT')
  union all select '16_authenticated_no_profiles_select', not has_table_privilege('authenticated','public.activity_template_impact_profiles_v1','SELECT')
  union all select '17_service_role_profiles_select', has_table_privilege('service_role','public.activity_template_impact_profiles_v1','SELECT')
  union all select '18_service_role_links_rw', has_table_privilege('service_role','public.activity_template_profile_object_links_v1','SELECT,INSERT,UPDATE,DELETE')
  union all select '19_service_role_rpc_execute', has_function_privilege('service_role','public.save_activity_template_impact_profile_v1(uuid,uuid,uuid,text,text,text,integer,text,jsonb,jsonb)','EXECUTE')
  union all select '20_anon_rpc_blocked', not has_function_privilege('anon','public.save_activity_template_impact_profile_v1(uuid,uuid,uuid,text,text,text,integer,text,jsonb,jsonb)','EXECUTE')
)
select jsonb_build_object(
  'release','ARCTOR_ACTIVITY_TEMPLATE_IMPACT_PROFILE_AUTHORING_V1',
  'allPass', bool_and(passed),
  'passed', count(*) filter (where passed),
  'total', count(*),
  'checks', jsonb_agg(jsonb_build_object('name',check_name,'passed',passed) order by check_name)
) as postcheck
from checks;
