-- ARCTor.app
-- P8 operation timestamp ordering hotfix
-- Date: 2026-07-27
--
-- Why:
-- value_object_tree_operations.created_at originally used now(), which is the
-- transaction start timestamp. Multiple controlled operations executed inside
-- one transaction therefore received the same created_at value. The guarded
-- rollback correctly refused the unsafe rollback later through current-state
-- conflict, but could not classify the overlapping operation as "newer".
--
-- This hotfix uses wall-clock timestamps for new audit rows, so operation order
-- remains observable even when several operations occur in one transaction.
--
-- Run ONCE in Supabase SQL Editor as role postgres.

begin;

do $check$
begin
  if to_regclass('public.value_object_tree_operations') is null
     or to_regclass('public.value_object_tree_operation_items') is null then
    raise exception 'P8_OPERATION_AUDIT_TABLES_NOT_FOUND';
  end if;
end;
$check$;

alter table public.value_object_tree_operations
  alter column created_at set default clock_timestamp();

alter table public.value_object_tree_operation_items
  alter column created_at set default clock_timestamp();

comment on column public.value_object_tree_operations.created_at is
  'Wall-clock creation time used for deterministic ordering of multiple P8 operations, including operations created within one transaction.';

comment on column public.value_object_tree_operation_items.created_at is
  'Wall-clock audit-item creation time aligned with P8 operation ordering.';

commit;
