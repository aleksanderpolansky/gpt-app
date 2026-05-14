begin;

-- Add complete_event as an explicit processing stage.
-- Used by /api/activity/complete when an existing started/paused activity_event
-- is updated to completed before impact processing.

alter table public.activity_processing_logs
drop constraint if exists activity_processing_logs_processing_stage_check;

alter table public.activity_processing_logs
add constraint activity_processing_logs_processing_stage_check
check (
  processing_stage in (
    'ingest',
    'parse',
    'normalize',
    'validate',
    'deduplicate',
    'create_event',
    'complete_event',
    'link_event',
    'process_impacts',
    'aggregate',
    'snapshot',
    'correction',
    'rollback',
    'timeline_check',
    'timeline_adjustment',
    'finalize',
    'error',
    'debug'
  )
);

commit;
