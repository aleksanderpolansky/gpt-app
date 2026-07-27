-- ARCTor.app
-- P8 rollback ordering hotfix
-- Date: 2026-07-27
--
-- Problem:
-- A successful rollback is itself stored as an applied audit operation with
-- overlapping operation_items. The original rollback guard treated that audit
-- row as a newer structural operation, so after rolling back operation N+1 it
-- still blocked the legitimate rollback of operation N.
--
-- Fix:
-- Only newer applied STRUCTURAL operations (reparent / insert_intermediate)
-- block rollback. Applied rollback audit rows do not.
--
-- Run ONCE in Supabase SQL Editor as role postgres.

begin;

do $patch$
declare
  v_oid regprocedure :=
    to_regprocedure(
      'public.rollback_value_object_tree_restructure_v1(uuid,uuid,uuid,uuid,text,text)'
    );
  v_before text;
  v_after text;
  v_old_fragment text :=
$old$
      and newer_operation.status = 'applied'
      and newer_operation.created_at > v_original.created_at
$old$;
  v_new_fragment text :=
$new$
      and newer_operation.status = 'applied'
      and newer_operation.operation_type in ('reparent', 'insert_intermediate')
      and newer_operation.created_at > v_original.created_at
$new$;
begin
  if v_oid is null then
    raise exception 'P8_ROLLBACK_FUNCTION_NOT_FOUND';
  end if;

  v_before := pg_get_functiondef(v_oid);

  if position(v_new_fragment in v_before) > 0 then
    -- Idempotent replay: the function is already corrected.
    return;
  end if;

  if position(v_old_fragment in v_before) = 0 then
    raise exception 'P8_ROLLBACK_GUARD_FRAGMENT_NOT_FOUND';
  end if;

  v_after := replace(v_before, v_old_fragment, v_new_fragment);

  if v_after = v_before then
    raise exception 'P8_ROLLBACK_GUARD_PATCH_NOT_APPLIED';
  end if;

  execute v_after;
end;
$patch$;

comment on function public.rollback_value_object_tree_restructure_v1(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text
) is
  'P8 guarded rollback. Refuses rollback after newer overlapping applied structural operations or structural conflicts; rollback audit operations do not block earlier eligible rollback.';

commit;
