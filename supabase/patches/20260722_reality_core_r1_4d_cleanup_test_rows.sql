-- ARCTOR REALITY CORE R1-4D
-- REMOVE ONLY TECHNICAL TEST ROWS CREATED BY R1-3C / R1-4C
--
-- This script deletes technical fixtures only. It does not change the
-- transactional RPC, indexes, RLS, or production interfaces.

begin;

create temporary table arctor_reality_core_test_activity_events
on commit drop
as
select id
from public.activity_events
where event_code like 'save_gate:reality-core-r1-3c-%'
   or event_code like 'save_gate:reality-core-r1-4c-%';

delete from public.activity_fact_recalculation_queue
where activity_event_id in (
  select id from arctor_reality_core_test_activity_events
);

delete from public.activity_fact_review_items
where activity_event_id in (
  select id from arctor_reality_core_test_activity_events
);

delete from public.activity_object_facts
where activity_event_id in (
  select id from arctor_reality_core_test_activity_events
);

delete from public.activity_event_measures
where activity_event_id in (
  select id from arctor_reality_core_test_activity_events
);

delete from public.activity_events
where id in (
  select id from arctor_reality_core_test_activity_events
);

commit;

select
  'remaining_reality_core_test_events' as check_name,
  count(*)::bigint as remaining_count
from public.activity_events
where event_code like 'save_gate:reality-core-r1-3c-%'
   or event_code like 'save_gate:reality-core-r1-4c-%';
