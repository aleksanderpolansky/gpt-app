-- ARCTor.app
-- AI-A1.1 usage-event operation-kind schema compatibility hotfix v2
-- ROLLBACK
-- Safe only before any content_localization usage-event row has been written.
-- Uses exact SET comparison and is independent of pg_get_constraintdef() formatting/order.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

do $preflight$
declare
  v_constraint_def text;
  v_values text[];
  v_expected constant text[] := array[
    'admin_test',
    'activity_preview',
    'chat_message',
    'content_localization',
    'other',
    'semantic_intake'
  ]::text[];
begin
  if to_regclass('public.ai_usage_events') is null then
    raise exception using
      errcode = '42P01',
      message = 'AI_A1_1_ROLLBACK_USAGE_EVENTS_TABLE_MISSING';
  end if;

  if exists (
    select 1
    from public.ai_usage_events
    where operation_kind = 'content_localization'
  ) then
    raise exception using
      errcode = '23514',
      message = 'AI_A1_1_ROLLBACK_BLOCKED_CONTENT_LOCALIZATION_ROWS_EXIST';
  end if;

  select pg_get_constraintdef(c.oid, true)
  into v_constraint_def
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'ai_usage_events'
    and c.conname = 'ai_usage_events_operation_kind_allowed'
    and c.contype = 'c'
  limit 1;

  if v_constraint_def is null then
    raise exception using
      errcode = '42704',
      message = 'AI_A1_1_ROLLBACK_CONSTRAINT_MISSING';
  end if;

  select array_agg(distinct x.capture[1])
  into v_values
  from regexp_matches(
    v_constraint_def,
    '''([^'']+)''',
    'g'
  ) as x(capture);

  if v_values is null
     or not (v_values @> v_expected and v_values <@ v_expected) then
    raise exception using
      errcode = '23514',
      message = 'AI_A1_1_ROLLBACK_CONSTRAINT_UNEXPECTED',
      detail = v_constraint_def;
  end if;
end;
$preflight$;

alter table public.ai_usage_events
  drop constraint ai_usage_events_operation_kind_allowed;

alter table public.ai_usage_events
  add constraint ai_usage_events_operation_kind_allowed
  check (
    operation_kind in (
      'chat_message',
      'activity_preview',
      'semantic_intake',
      'admin_test',
      'other'
    )
  ) not valid;

alter table public.ai_usage_events
  validate constraint ai_usage_events_operation_kind_allowed;

commit;

select jsonb_pretty(
  jsonb_build_object(
    'check', 'ARCTOR_AI_A1_1_USAGE_OPERATION_KIND_SCHEMA_HOTFIX_V2_ROLLBACK',
    'rolledBack', true,
    'contentLocalizationRows', (
      select count(*)
      from public.ai_usage_events
      where operation_kind = 'content_localization'
    )
  )
) as arctor_ai_a1_1_usage_operation_kind_schema_hotfix_v2_rollback;
