-- ARCTor.app PP1A runtime residual check — READ ONLY
select
  (select count(*) from public.activity_event_write_operations where idempotency_key like 'pp1_runtime_%') as runtime_operation_rows,
  (select count(*) from public.activity_events where event_code like 'pp1:%:pp1_runtime_%' or metadata_json->>'fixture'='pp1a_runtime_compat') as runtime_activity_rows,
  (select count(*) from public.calendar_events where source='activity_projection_pp1_v1' and title like 'PP1 %') as runtime_calendar_rows,
  (select count(*) from public.activity_value_object_links link join public.activity_events event on event.id=link.activity_event_id where event.event_code like 'pp1:%:pp1_runtime_%') as runtime_target_links,
  (select count(*) from public.value_objects where metadata_json->>'fixture' in ('pp1a_runtime','pp1a_runtime_foreign')) as runtime_value_object_rows;
