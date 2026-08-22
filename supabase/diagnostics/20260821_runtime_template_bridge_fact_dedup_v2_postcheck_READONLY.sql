-- ARCTOR_RUNTIME_TEMPLATE_BRIDGE_FACT_DEDUP_V2 / READ-ONLY POSTCHECK / FIX2
-- FIX2 makes check 15 alias-agnostic because pg_get_viewdef may rename a nested fact-table alias (for example f -> f_1).
-- No schema mutation. Do NOT re-run DB APPLY.

with ids as (
  select
    to_regprocedure(
      'public.apply_activity_template_match_v2(uuid,uuid,uuid,uuid,numeric,text,text,text,integer,boolean,numeric,numeric,numeric)'
    ) as rpc_oid,
    to_regclass('public.activity_object_analytics_inputs_v1') as analytics_view_oid
),
defs as (
  select
    ids.rpc_oid,
    ids.analytics_view_oid,
    coalesce(
      (
        select lower(p.prosrc)
        from pg_catalog.pg_proc p
        where p.oid = ids.rpc_oid
      ),
      ''
    ) as rpc_body,
    coalesce(
      lower(pg_get_viewdef(ids.analytics_view_oid, true)),
      ''
    ) as analytics_view_def
  from ids
),
normalized as (
  select
    defs.*,
    regexp_replace(defs.rpc_body, '[[:space:]]+', '', 'g') as rpc_compact,
    regexp_replace(defs.analytics_view_def, '[[:space:]]+', '', 'g') as analytics_view_compact
  from defs
),
checks(name, passed) as (
  select c.name, c.passed
  from normalized n
  cross join lateral (
    values
      ('01_previous_profile_table', to_regclass('public.activity_template_impact_profiles_v1') is not null),
      ('02_virtual_parameter_view', to_regclass('public.activity_event_virtual_parameter_contributions_v1') is not null),
      ('03_match_rpc', n.rpc_oid is not null),
      ('04_unified_analytics_view', n.analytics_view_oid is not null),
      ('05_profile_trigger', exists(
        select 1
        from pg_catalog.pg_trigger
        where tgrelid = 'public.activity_events'::regclass
          and tgname = 'trg_activity_events_impact_profile_v1'
          and not tgisinternal
      )),
      ('06_match_rpc_security_definer', coalesce((
        select p.prosecdef
        from pg_catalog.pg_proc p
        where p.oid = n.rpc_oid
      ), false)),
      ('07_match_rpc_service_role_execute', coalesce(
        has_function_privilege('service_role', n.rpc_oid, 'EXECUTE'),
        false
      )),
      ('08_match_rpc_anon_blocked', not coalesce(
        has_function_privilege('anon', n.rpc_oid, 'EXECUTE'),
        false
      )),
      ('09_match_rpc_authenticated_blocked', not coalesce(
        has_function_privilege('authenticated', n.rpc_oid, 'EXECUTE'),
        false
      )),
      ('10_view_service_role_select', coalesce(
        has_table_privilege('service_role', n.analytics_view_oid, 'SELECT'),
        false
      )),
      ('11_view_anon_blocked', not coalesce(
        has_table_privilege('anon', n.analytics_view_oid, 'SELECT'),
        false
      )),
      ('12_view_authenticated_blocked', not coalesce(
        has_table_privilege('authenticated', n.analytics_view_oid, 'SELECT'),
        false
      )),
      ('13_rpc_no_fact_insert', position(
        'insert into public.activity_object_facts' in n.rpc_body
      ) = 0),
      ('14_rpc_sets_template_only', position(
        'activity_template_id=p_template_id' in n.rpc_compact
      ) > 0),
      ('15_view_physical_first_dedup',
        position('notexists' in replace(n.analytics_view_compact, '(', '')) > 0
        and position('activity_event_id=v.event_id' in n.analytics_view_compact) > 0
        and position('value_object_id=v.target_value_object_id' in n.analytics_view_compact) > 0
        and position('user_id=v.user_id' in n.analytics_view_compact) > 0
        and position('acting_as_actor_id=v.acting_as_actor_id' in n.analytics_view_compact) > 0
        and position('fact_status=''confirmed''' in n.analytics_view_compact) > 0
      ),
      ('16_view_has_both_sources',
        position('physical_confirmed' in n.analytics_view_def) > 0
        and position('template_virtual' in n.analytics_view_def) > 0
      ),
      ('17_rpc_residual_gate', position(
        'residualreviewrequired' in replace(n.rpc_compact, '_', '')
      ) > 0),
      ('18_rpc_residual_receipt', position(
        'requireshumanreview' in replace(n.rpc_compact, '_', '')
      ) > 0),
      ('19_rpc_template_title_snapshot', position(
        'templatetitle' in replace(n.rpc_compact, '_', '')
      ) > 0),
      ('20_rpc_server_covered_parameters', position(
        'servercoveredparametercodes' in replace(n.rpc_compact, '_', '')
      ) > 0)
  ) as c(name, passed)
)
select jsonb_build_object(
  'release', 'ARCTOR_RUNTIME_TEMPLATE_BRIDGE_FACT_DEDUP_V2',
  'postcheckRevision', 'FIX2',
  'total', count(*),
  'passed', count(*) filter (where passed),
  'allPass', bool_and(passed),
  'checks', jsonb_agg(
    jsonb_build_object('name', name, 'passed', passed)
    order by name
  )
) as postcheck
from checks;
