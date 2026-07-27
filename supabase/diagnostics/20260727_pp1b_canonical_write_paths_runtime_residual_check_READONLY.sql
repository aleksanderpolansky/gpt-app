-- ARCTor.app PP1B runtime residual check — READ ONLY
select
  (select count(*) from public.activity_event_write_operations where idempotency_key like 'pp1b_runtime_%') as runtime_activity_operation_rows,
  (select count(*) from public.activity_fact_write_operations_pp1 where idempotency_key like 'pp1b_runtime_%') as runtime_fact_operation_rows,
  (select count(*) from public.activity_events where event_code like 'pp1:%:pp1b_runtime_%') as runtime_activity_rows,
  (select count(*) from public.calendar_events where source='activity_projection_pp1_v1' and title like 'PP1B Runtime%') as runtime_calendar_rows,
  (select count(*) from public.activity_event_measures where metadata->>'fixture'='pp1b_runtime') as runtime_measure_rows,
  (select count(*) from public.activity_object_facts where metadata->>'fixture'='pp1b_runtime') as runtime_fact_rows;
