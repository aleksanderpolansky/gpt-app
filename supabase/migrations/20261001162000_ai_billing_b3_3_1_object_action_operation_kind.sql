-- ARCTor.app
-- AI Billing B3.3.1 — Object-Action suggestion operation kind
-- 2026-10-01
--
-- Purpose:
--   Preserve every currently approved AI usage operation kind and add:
--     object_action_suggestion
--
-- This migration changes only the CHECK constraint on
-- public.ai_usage_events.operation_kind.
-- It does not rewrite ai_usage_events, wallets, ledger rows, or suggestion data.

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
      message='ARCTOR_AI_BILLING_B3_3_1_AI_USAGE_EVENTS_MISSING';
  end if;

  select pg_get_constraintdef(c.oid, true)
  into v_definition
  from pg_constraint c
  where c.conrelid='public.ai_usage_events'::regclass
    and c.conname='ai_usage_events_operation_kind_allowed';

  if v_definition is null then
    raise exception using
      errcode='42704',
      message='ARCTOR_AI_BILLING_B3_3_1_OPERATION_KIND_CONSTRAINT_MISSING';
  end if;

  -- Preservation preflight: the live constraint must still contain every
  -- previously approved operation kind before we replace it.
  if position('chat_message' in v_definition)=0
     or position('activity_preview' in v_definition)=0
     or position('semantic_intake' in v_definition)=0
     or position('ai_channel' in v_definition)=0
     or position('admin_test' in v_definition)=0
     or position('other' in v_definition)=0
     or position('content_localization' in v_definition)=0 then
    raise exception using
      errcode='23514',
      message='ARCTOR_AI_BILLING_B3_3_1_EXISTING_OPERATION_KIND_CONTRACT_CHANGED';
  end if;

  -- Never narrow live data silently. If another operation kind appeared after
  -- the diagnostic, stop and inspect it before changing the constraint.
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
      'content_localization',
      'object_action_suggestion'
    )
  ) q;

  if coalesce(array_length(v_unexpected,1),0) > 0 then
    raise exception using
      errcode='23514',
      message='ARCTOR_AI_BILLING_B3_3_1_UNEXPECTED_LIVE_OPERATION_KINDS:'
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

  -- Idempotent: when object_action_suggestion is already present and the
  -- preservation preflight above passed, no DDL is required.
  if position('object_action_suggestion' in v_definition)=0 then
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
          'content_localization',
          'object_action_suggestion'
        )
      ) not valid;

    alter table public.ai_usage_events
      validate constraint ai_usage_events_operation_kind_allowed;
  end if;
end;
$fix$;

comment on constraint ai_usage_events_operation_kind_allowed
on public.ai_usage_events is
  'Unified AI billing operation kinds. B3.3.1 preserves all existing kinds and adds object_action_suggestion for paid Object-Action suggestion analysis.';

commit;

with constraint_state as (
  select
    pg_get_constraintdef(c.oid, true) as definition,
    c.convalidated as validated
  from pg_constraint c
  where c.conrelid='public.ai_usage_events'::regclass
    and c.conname='ai_usage_events_operation_kind_allowed'
  limit 1
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
    'content_localization',
    'object_action_suggestion'
  )
),
checks as (
  select
    coalesce((select validated from constraint_state),false)
      as constraint_validated,
    coalesce(
      (select position('chat_message' in definition)>0 from constraint_state),
      false
    ) as chat_message_preserved,
    coalesce(
      (select position('activity_preview' in definition)>0 from constraint_state),
      false
    ) as activity_preview_preserved,
    coalesce(
      (select position('semantic_intake' in definition)>0 from constraint_state),
      false
    ) as semantic_intake_preserved,
    coalesce(
      (select position('ai_channel' in definition)>0 from constraint_state),
      false
    ) as ai_channel_preserved,
    coalesce(
      (select position('admin_test' in definition)>0 from constraint_state),
      false
    ) as admin_test_preserved,
    coalesce(
      (select position('other' in definition)>0 from constraint_state),
      false
    ) as other_preserved,
    coalesce(
      (select position('content_localization' in definition)>0 from constraint_state),
      false
    ) as content_localization_preserved,
    coalesce(
      (select position('object_action_suggestion' in definition)>0 from constraint_state),
      false
    ) as object_action_suggestion_allowed,
    (select count(*)::bigint from unexpected)=0
      as no_unexpected_data_kinds
)
select jsonb_pretty(
  jsonb_build_object(
    'check','ARCTOR_AI_BILLING_B3_3_1_OPERATION_KIND_FIX',
    'pass',
      (
        select
          constraint_validated
          and chat_message_preserved
          and activity_preview_preserved
          and semantic_intake_preserved
          and ai_channel_preserved
          and admin_test_preserved
          and other_preserved
          and content_localization_preserved
          and object_action_suggestion_allowed
          and no_unexpected_data_kinds
        from checks
      ),
    'readOnlyVerification',true,
    'dataRowsModifiedByMigration',0,
    'constraintValidated',
      (select constraint_validated from checks),
    'objectActionSuggestionAllowed',
      (select object_action_suggestion_allowed from checks),
    'preserved',
      jsonb_build_object(
        'chat_message',(select chat_message_preserved from checks),
        'activity_preview',(select activity_preview_preserved from checks),
        'semantic_intake',(select semantic_intake_preserved from checks),
        'ai_channel',(select ai_channel_preserved from checks),
        'admin_test',(select admin_test_preserved from checks),
        'other',(select other_preserved from checks),
        'content_localization',(select content_localization_preserved from checks)
      ),
    'constraintDefinition',
      (select definition from constraint_state),
    'allOperationKinds',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'operationKind',operation_kind,
              'rows',row_count
            )
            order by operation_kind
          )
          from kind_counts
        ),
        '[]'::jsonb
      ),
    'objectActionSuggestionUsageRows',
      coalesce(
        (
          select row_count
          from kind_counts
          where operation_kind='object_action_suggestion'
        ),
        0
      ),
    'unexpectedDataKinds',
      (select count(*)::bigint from unexpected),
    'totalUsageRows',
      (select coalesce(sum(row_count),0)::bigint from kind_counts),
    'next','B3.3_SOURCE_MIGRATION'
  )
) as arctor_ai_billing_b3_3_1_operation_kind_fix;
