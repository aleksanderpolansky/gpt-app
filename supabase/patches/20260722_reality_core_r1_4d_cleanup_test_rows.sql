-- ARCTOR REALITY CORE R1-4D
-- FIXED CLEANUP: no temporary table, no session dependency.
-- Removes only technical fixtures created by R1-3C / R1-4C.

-- 1. Optional read-only preview.
with target_events as (
  select id
  from public.activity_events
  where event_code like 'save_gate:reality-core-r1-3c-%'
     or event_code like 'save_gate:reality-core-r1-4c-%'
)
select
  (select count(*) from target_events) as activity_events,
  (
    select count(*)
    from public.activity_event_measures m
    where m.activity_event_id in (select id from target_events)
  ) as measures,
  (
    select count(*)
    from public.activity_object_facts f
    where f.activity_event_id in (select id from target_events)
  ) as object_facts,
  (
    select count(*)
    from public.activity_fact_review_items r
    where r.activity_event_id in (select id from target_events)
  ) as review_items,
  (
    select count(*)
    from public.activity_fact_recalculation_queue q
    where q.activity_event_id in (select id from target_events)
  ) as recalculation_queue;

-- 2. Atomic cleanup in one PostgreSQL statement.
do $cleanup$
declare
  v_activity_event_ids uuid[];
begin
  select coalesce(array_agg(id), array[]::uuid[])
  into v_activity_event_ids
  from public.activity_events
  where event_code like 'save_gate:reality-core-r1-3c-%'
     or event_code like 'save_gate:reality-core-r1-4c-%';

  if cardinality(v_activity_event_ids) > 0 then
    delete from public.activity_fact_recalculation_queue
    where activity_event_id = any(v_activity_event_ids);

    delete from public.activity_fact_review_items
    where activity_event_id = any(v_activity_event_ids);

    delete from public.activity_object_facts
    where activity_event_id = any(v_activity_event_ids);

    delete from public.activity_event_measures
    where activity_event_id = any(v_activity_event_ids);

    delete from public.activity_events
    where id = any(v_activity_event_ids);
  end if;
end
$cleanup$;

-- 3. Final verification.
with target_events as (
  select id
  from public.activity_events
  where event_code like 'save_gate:reality-core-r1-3c-%'
     or event_code like 'save_gate:reality-core-r1-4c-%'
)
select
  'remaining_reality_core_test_rows' as check_name,
  (select count(*) from target_events) as activity_events,
  (
    select count(*)
    from public.activity_event_measures m
    where m.activity_event_id in (select id from target_events)
  ) as measures,
  (
    select count(*)
    from public.activity_object_facts f
    where f.activity_event_id in (select id from target_events)
  ) as object_facts,
  (
    select count(*)
    from public.activity_fact_review_items r
    where r.activity_event_id in (select id from target_events)
  ) as review_items,
  (
    select count(*)
    from public.activity_fact_recalculation_queue q
    where q.activity_event_id in (select id from target_events)
  ) as recalculation_queue;
