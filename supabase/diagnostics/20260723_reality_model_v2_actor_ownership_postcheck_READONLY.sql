/*
ARCTor.app — Reality Model v2 / P4 Actor ownership postcheck

SELECT-only. Run only after
20260723150000_reality_model_v2_actor_ownership.sql completed.
The query does not create, update or delete data and does not call RPCs.
*/

with
owned_actor_pairs as (
  select distinct
    profile.owner_user_id,
    profile.actor_id
  from public.actor_public_profiles profile
  join public.app_users app_user
    on app_user.id = profile.owner_user_id
  join public.actors actor
    on actor.id = profile.actor_id
   and actor.status = 'active'
),
expected_triggers(table_name, trigger_name) as (
  values
    (
      'activity_events'::text,
      'activity_events_actor_ownership_v2_trg'::text
    ),
    (
      'activity_event_measures'::text,
      'activity_event_measures_actor_alignment_v2_trg'::text
    ),
    (
      'activity_object_facts'::text,
      'activity_object_facts_actor_alignment_v2_trg'::text
    ),
    (
      'value_objects'::text,
      'value_objects_actor_ownership_v2_trg'::text
    )
),
missing_triggers as (
  select expected.table_name, expected.trigger_name
  from expected_triggers expected
  left join pg_trigger actual
    on actual.tgrelid =
       to_regclass('public.' || expected.table_name)
   and actual.tgname = expected.trigger_name
   and not actual.tgisinternal
  where actual.oid is null
),
rpc as (
  select
    procedure.oid,
    procedure.prosecdef,
    lower(pg_get_functiondef(procedure.oid)) as definition
  from pg_proc procedure
  join pg_namespace namespace
    on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname = 'save_reality_activity_v1'
    and procedure.pronargs = 5
),
idempotency_index as (
  select
    index_metadata.indisunique,
    lower(pg_get_indexdef(index_class.oid)) as definition,
    lower(
      coalesce(
        pg_get_expr(index_metadata.indpred, index_metadata.indrelid),
        ''
      )
    ) as predicate
  from pg_class table_class
  join pg_namespace namespace
    on namespace.oid = table_class.relnamespace
  join pg_index index_metadata
    on index_metadata.indrelid = table_class.oid
  join pg_class index_class
    on index_class.oid = index_metadata.indexrelid
  where namespace.nspname = 'public'
    and table_class.relname = 'activity_events'
    and index_class.relname =
      'activity_events_user_event_code_unique_idx'
),
checks(check_name, severity, observed_count, expected_count) as (
  select
    'missing_actor_ownership_triggers',
    'error',
    count(*)::bigint,
    0::bigint
  from missing_triggers

  union all

  select
    'save_gate_idempotency_index_exact',
    'error',
    count(*)::bigint,
    1::bigint
  from idempotency_index
  where indisunique
    and position('(user_id, event_code)' in definition) > 0
    and position('left' in predicate) > 0
    and position('event_code' in predicate) > 0
    and position('10' in predicate) > 0
    and position('save_gate:' in predicate) > 0

  union all

  select
    'actor_ids_with_multiple_account_owners',
    'error',
    count(*)::bigint,
    0::bigint
  from (
    select profile.actor_id
    from public.actor_public_profiles profile
    group by profile.actor_id
    having count(distinct profile.owner_user_id) > 1
  ) ambiguous_actor

  union all

  select
    'activity_rows_without_primary_actor_context',
    'error',
    count(*)::bigint,
    0::bigint
  from public.activity_events event
  where event.user_id is null
     or event.performed_by_actor_id is null
     or event.acting_as_actor_id is null

  union all

  select
    'activity_actor_refs_not_owned_by_event_user',
    'error',
    count(*)::bigint,
    0::bigint
  from public.activity_events event
  cross join lateral (
    values
      (event.performed_by_actor_id),
      (event.acting_as_actor_id),
      (event.acting_for_actor_id)
  ) referenced_actor(actor_id)
  where referenced_actor.actor_id is not null
    and not exists (
    select 1
    from owned_actor_pairs owned
    where owned.owner_user_id = event.user_id
      and owned.actor_id = referenced_actor.actor_id
  )

  union all

  select
    'measure_event_security_context_mismatch',
    'error',
    count(*)::bigint,
    0::bigint
  from public.activity_event_measures measure
  join public.activity_events event
    on event.id = measure.activity_event_id
  where measure.user_id is distinct from event.user_id
     or measure.performed_by_actor_id is distinct from
        event.performed_by_actor_id
     or measure.acting_as_actor_id is distinct from
        event.acting_as_actor_id
     or measure.acting_for_actor_id is distinct from
        event.acting_for_actor_id

  union all

  select
    'object_fact_measure_security_context_mismatch',
    'error',
    count(*)::bigint,
    0::bigint
  from public.activity_object_facts fact
  join public.activity_event_measures measure
    on measure.id = fact.measure_id
  where fact.activity_event_id is distinct from measure.activity_event_id
     or fact.user_id is distinct from measure.user_id
     or fact.performed_by_actor_id is distinct from
        measure.performed_by_actor_id
     or fact.acting_as_actor_id is distinct from
        measure.acting_as_actor_id
     or fact.acting_for_actor_id is distinct from
        measure.acting_for_actor_id

  union all

  select
    'fact_value_object_actor_ownership_mismatch',
    'error',
    count(*)::bigint,
    0::bigint
  from public.activity_object_facts fact
  join public.value_objects value_object
    on value_object.id = fact.value_object_id
  where value_object.owner_user_id is distinct from fact.user_id
     or value_object.owner_actor_id is distinct from fact.acting_as_actor_id

  union all

  select
    'value_object_owner_pair_invalid',
    'error',
    count(*)::bigint,
    0::bigint
  from public.value_objects value_object
  where value_object.owner_user_id is null
     or value_object.owner_actor_id is null
     or not exists (
       select 1
       from owned_actor_pairs owned
       where owned.owner_user_id = value_object.owner_user_id
         and owned.actor_id = value_object.owner_actor_id
     )

  union all

  select
    'save_reality_activity_v1_exact_overloads',
    'error',
    count(*)::bigint,
    1::bigint
  from rpc

  union all

  select
    'save_reality_activity_v1_not_security_definer',
    'error',
    count(*)::bigint,
    0::bigint
  from rpc
  where not prosecdef

  union all

  select
    'save_reality_activity_v1_browser_execute_grants',
    'error',
    count(*)::bigint,
    0::bigint
  from information_schema.routine_privileges privilege
  where privilege.specific_schema = 'public'
    and privilege.routine_name = 'save_reality_activity_v1'
    and privilege.privilege_type = 'EXECUTE'
    and privilege.grantee in ('PUBLIC', 'anon', 'authenticated')

  union all

  select
    'rpc_missing_actor_account_ownership_guard',
    'error',
    count(*)::bigint,
    0::bigint
  from rpc
  where position('actor_public_profiles' in definition) = 0
     or position(
       'save_reality_activity_actor_not_owned_by_user'
       in definition
     ) = 0

  union all

  select
    'rpc_missing_existing_activity_actor_alignment_guard',
    'error',
    count(*)::bigint,
    0::bigint
  from rpc
  where position(
    'save_reality_activity_existing_activity_actor_mismatch'
    in definition
  ) = 0

  union all

  select
    'rpc_missing_idempotent_replay_actor_alignment_guard',
    'error',
    count(*)::bigint,
    0::bigint
  from rpc
  where position(
    'save_reality_activity_idempotent_replay_actor_mismatch'
    in definition
  ) = 0

  union all

  select
    'rpc_acting_for_actor_incorrectly_required',
    'error',
    count(*)::bigint,
    0::bigint
  from rpc
  where position(
    'save_reality_activity_acting_for_actor_required'
    in definition
  ) > 0

  union all

  select
    'rpc_missing_value_object_actor_ownership_guard',
    'error',
    count(*)::bigint,
    0::bigint
  from rpc
  where position('owner_actor_id' in definition) = 0
     or position(
       'save_reality_activity_value_object_actor_ownership_mismatch'
       in definition
     ) = 0

  union all

  select
    'activity_rows_after_test_cleanup',
    'error',
    count(*)::bigint,
    0::bigint
  from public.activity_events

  union all

  select
    'measure_rows_after_test_cleanup',
    'error',
    count(*)::bigint,
    0::bigint
  from public.activity_event_measures

  union all

  select
    'object_fact_rows_after_test_cleanup',
    'error',
    count(*)::bigint,
    0::bigint
  from public.activity_object_facts

  union all

  select
    'owned_actor_pairs',
    'info',
    count(*)::bigint,
    null::bigint
  from owned_actor_pairs

  union all

  select
    'value_object_rows',
    'info',
    count(*)::bigint,
    null::bigint
  from public.value_objects
)
select
  check_name,
  severity,
  observed_count,
  expected_count,
  case
    when expected_count is null then true
    else observed_count = expected_count
  end as ok
from checks
order by
  case severity when 'error' then 0 else 1 end,
  check_name;
