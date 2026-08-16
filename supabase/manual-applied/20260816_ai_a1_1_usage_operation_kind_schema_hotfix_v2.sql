-- ARCTor.app
-- AI-A1.1 usage-event operation-kind schema compatibility hotfix v2
-- SET-COMPARE FIX
-- 2026-08-16
--
-- PURPOSE
-- The AI-A1.1 runtime correctly records localization as operation_kind='content_localization'.
-- The live ai_usage_events check constraint still contains the older five-value registry.
-- V1 preflight was too strict about ARRAY ORDER after extracting pg_get_constraintdef().
-- V2 compares exact SET membership instead of array order and therefore accepts both:
--   CHECK (operation_kind IN (...))
--   CHECK (operation_kind = ANY (ARRAY['...'::text, ...]))
--
-- SAFETY
-- * No INSERT / UPDATE / DELETE / TRUNCATE of user data.
-- * Fail-closed preflight accepts only the exact known old registry or exact patched registry.
-- * Any unexpected literal in the constraint aborts before ALTER TABLE.
-- * Existing rows are validated against the new registry before COMMIT.
-- * Browser privileges / RLS are not changed.
-- * Re-running after successful application is safe.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- ---------------------------------------------------------------------------
-- 1. Fail-closed preflight using exact SET comparison
-- ---------------------------------------------------------------------------

do $preflight$
declare
  v_constraint_def text;
  v_values text[];
  v_old constant text[] := array[
    'admin_test',
    'activity_preview',
    'chat_message',
    'other',
    'semantic_intake'
  ]::text[];
  v_new constant text[] := array[
    'admin_test',
    'activity_preview',
    'chat_message',
    'content_localization',
    'other',
    'semantic_intake'
  ]::text[];
  v_is_old boolean := false;
  v_is_new boolean := false;
begin
  if to_regclass('public.ai_usage_events') is null then
    raise exception using
      errcode = '42P01',
      message = 'AI_A1_1_USAGE_EVENTS_TABLE_MISSING';
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
      message = 'AI_A1_1_USAGE_OPERATION_KIND_CONSTRAINT_MISSING';
  end if;

  select array_agg(distinct x.capture[1])
  into v_values
  from regexp_matches(
    v_constraint_def,
    '''([^'']+)''',
    'g'
  ) as x(capture);

  v_is_old :=
    v_values is not null
    and v_values @> v_old
    and v_values <@ v_old;

  v_is_new :=
    v_values is not null
    and v_values @> v_new
    and v_values <@ v_new;

  if not v_is_old and not v_is_new then
    raise exception using
      errcode = '23514',
      message = 'AI_A1_1_USAGE_OPERATION_KIND_CONSTRAINT_UNEXPECTED',
      detail = v_constraint_def;
  end if;

  if exists (
    select 1
    from public.ai_usage_events u
    where u.operation_kind not in (
      'chat_message',
      'activity_preview',
      'semantic_intake',
      'admin_test',
      'other',
      'content_localization'
    )
  ) then
    raise exception using
      errcode = '23514',
      message = 'AI_A1_1_USAGE_OPERATION_KIND_EXISTING_ROW_UNEXPECTED';
  end if;
end;
$preflight$;

-- ---------------------------------------------------------------------------
-- 2. Replace only the stale registry constraint
-- ---------------------------------------------------------------------------

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
      'other',
      'content_localization'
    )
  ) not valid;

alter table public.ai_usage_events
  validate constraint ai_usage_events_operation_kind_allowed;

-- ---------------------------------------------------------------------------
-- 3. Exact acceptance before COMMIT
-- ---------------------------------------------------------------------------

do $acceptance$
declare
  v_constraint_def text;
  v_values text[];
  v_validated boolean;
  v_expected constant text[] := array[
    'admin_test',
    'activity_preview',
    'chat_message',
    'content_localization',
    'other',
    'semantic_intake'
  ]::text[];
begin
  select
    pg_get_constraintdef(c.oid, true),
    c.convalidated
  into
    v_constraint_def,
    v_validated
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'ai_usage_events'
    and c.conname = 'ai_usage_events_operation_kind_allowed'
    and c.contype = 'c'
  limit 1;

  if v_constraint_def is null or v_validated is distinct from true then
    raise exception using
      errcode = '23514',
      message = 'AI_A1_1_USAGE_OPERATION_KIND_CONSTRAINT_NOT_VALIDATED';
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
      message = 'AI_A1_1_USAGE_OPERATION_KIND_ACCEPTANCE_VALUES_MISMATCH',
      detail = v_constraint_def;
  end if;

  if exists (
    select 1
    from public.ai_usage_events u
    where u.operation_kind not in (
      'chat_message',
      'activity_preview',
      'semantic_intake',
      'admin_test',
      'other',
      'content_localization'
    )
  ) then
    raise exception using
      errcode = '23514',
      message = 'AI_A1_1_USAGE_OPERATION_KIND_ACCEPTANCE_ROW_MISMATCH';
  end if;
end;
$acceptance$;

commit;

-- ---------------------------------------------------------------------------
-- 4. Compact result row
-- ---------------------------------------------------------------------------

select jsonb_pretty(
  jsonb_build_object(
    'check', 'ARCTOR_AI_A1_1_USAGE_OPERATION_KIND_SCHEMA_HOTFIX_V2',
    'constraintName', 'ai_usage_events_operation_kind_allowed',
    'constraintValidated', (
      select c.convalidated
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public'
        and t.relname = 'ai_usage_events'
        and c.conname = 'ai_usage_events_operation_kind_allowed'
        and c.contype = 'c'
      limit 1
    ),
    'contentLocalizationInConstraint', (
      select position(
        'content_localization'
        in pg_get_constraintdef(c.oid, true)
      ) > 0
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public'
        and t.relname = 'ai_usage_events'
        and c.conname = 'ai_usage_events_operation_kind_allowed'
        and c.contype = 'c'
      limit 1
    ),
    'invalidExistingRows', (
      select count(*)
      from public.ai_usage_events u
      where u.operation_kind not in (
        'chat_message',
        'activity_preview',
        'semantic_intake',
        'admin_test',
        'other',
        'content_localization'
      )
    ),
    'dataRowsModified', 0,
    'browserPrivilegesChanged', false,
    'rlsChanged', false,
    'preflightComparisonMode', 'exact_set_not_array_order'
  )
) as arctor_ai_a1_1_usage_operation_kind_schema_hotfix_v2;
