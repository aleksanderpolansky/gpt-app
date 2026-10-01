-- ARCTor.app
-- AI Billing B3.1.1 V2 — allow AI Channel usage events while preserving
-- the live production operation_kind contract.
-- 2026-10-01
--
-- Production diagnostic before this migration:
--   chat_message          23 rows
--   content_localization 291 rows
--   semantic_intake      189 rows
-- Current validated constraint already includes content_localization.
--
-- B3.1 runtime additionally needs:
--   ai_channel
--
-- This migration changes only the CHECK constraint. It rewrites no
-- ai_usage_events / wallet / ledger rows.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

do $preflight$
declare
  v_definition text;
  v_unexpected text[];
begin
  if to_regclass('public.ai_usage_events') is null then
    raise exception using
      errcode='42P01',
      message='ARCTOR_AI_BILLING_B3_1_1_V2_AI_USAGE_EVENTS_MISSING';
  end if;

  select pg_get_constraintdef(c.oid, true)
  into v_definition
  from pg_constraint c
  where c.conrelid='public.ai_usage_events'::regclass
    and c.conname='ai_usage_events_operation_kind_allowed';

  if v_definition is null then
    raise exception using
      errcode='42704',
      message='ARCTOR_AI_BILLING_B3_1_1_V2_OPERATION_KIND_CONSTRAINT_MISSING';
  end if;

  -- Never narrow production data silently. If a new operation kind appeared
  -- after the diagnostic, stop and inspect it before changing the constraint.
  select array_agg(operation_kind order by operation_kind)
  into v_unexpected
  from (
    select distinct operation_kind
    from public.ai_usage_events
    where operation_kind not in (
      'chat_message',
      'activity_preview',
      'semantic_intake',
      'ai_channel',
      'admin_test',
      'other',
      'content_localization'
    )
  ) q;

  if coalesce(array_length(v_unexpected,1),0) > 0 then
    raise exception using
      errcode='23514',
      message='ARCTOR_AI_BILLING_B3_1_1_V2_UNEXPECTED_LIVE_OPERATION_KINDS:'
        || array_to_string(v_unexpected,',');
  end if;
end;
$preflight$;

do $fix$
declare
  v_definition text;
begin
  select pg_get_constraintdef(c.oid, true)
  into v_definition
  from pg_constraint c
  where c.conrelid='public.ai_usage_events'::regclass
    and c.conname='ai_usage_events_operation_kind_allowed';

  -- Idempotent: if both the new ai_channel value and the already-live
  -- content_localization value are present, no DDL is required.
  if position('ai_channel' in v_definition)=0
     or position('content_localization' in v_definition)=0 then

    alter table public.ai_usage_events
      drop constraint ai_usage_events_operation_kind_allowed;

    alter table public.ai_usage_events
      add constraint ai_usage_events_operation_kind_allowed
      check (
        operation_kind in (
          'chat_message',
          'activity_preview',
          'semantic_intake',
          'ai_channel',
          'admin_test',
          'other',
          'content_localization'
        )
      ) not valid;

    alter table public.ai_usage_events
      validate constraint ai_usage_events_operation_kind_allowed;
  end if;
end;
$fix$;

comment on constraint ai_usage_events_operation_kind_allowed
on public.ai_usage_events is
  'Unified AI billing operation kinds. B3.1.1 V2 preserves content_localization and adds ai_channel for Background Billing Gateway channel runs.';

commit;

with constraint_state as (
  select
    pg_get_constraintdef(c.oid, true) as definition,
    c.convalidated as validated
  from pg_constraint c
  where c.conrelid='public.ai_usage_events'::regclass
    and c.conname='ai_usage_events_operation_kind_allowed'
),
kind_counts as (
  select
    operation_kind,
    count(*)::bigint as row_count
  from public.ai_usage_events
  group by operation_kind
),
unexpected as (
  select operation_kind, row_count
  from kind_counts
  where operation_kind not in (
    'chat_message',
    'activity_preview',
    'semantic_intake',
    'ai_channel',
    'admin_test',
    'other',
    'content_localization'
  )
)
select jsonb_pretty(
  jsonb_build_object(
    'check','ARCTOR_AI_BILLING_B3_1_1_OPERATION_KIND_FIX_V2',
    'pass',
      coalesce(
        (
          select validated
             and position('ai_channel' in definition)>0
             and position('content_localization' in definition)>0
          from constraint_state
          limit 1
        ),
        false
      ),
    'operationKindAllowsAiChannel',
      coalesce(
        (select position('ai_channel' in definition)>0 from constraint_state limit 1),
        false
      ),
    'operationKindPreservesContentLocalization',
      coalesce(
        (select position('content_localization' in definition)>0 from constraint_state limit 1),
        false
      ),
    'constraintValidated',
      coalesce((select validated from constraint_state limit 1),false),
    'constraintDefinition',
      (select definition from constraint_state limit 1),
    'allOperationKinds',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'operationKind', operation_kind,
              'rows', row_count
            )
            order by operation_kind
          )
          from kind_counts
        ),
        '[]'::jsonb
      ),
    'unexpectedDataKinds',
      (select count(*)::bigint from unexpected),
    'contentLocalizationRows',
      coalesce(
        (
          select row_count
          from kind_counts
          where operation_kind='content_localization'
        ),
        0
      ),
    'aiChannelUsageRows',
      coalesce(
        (
          select row_count
          from kind_counts
          where operation_kind='ai_channel'
        ),
        0
      ),
    'totalUsageRows',
      (select coalesce(sum(row_count),0)::bigint from kind_counts),
    'dataRowsModifiedByMigration',0
  )
) as arctor_ai_billing_b3_1_1_operation_kind_fix_v2;
