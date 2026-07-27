-- ARCTor.app
-- P8 hierarchy-audit rollback dependency hotfix
-- Date: 2026-07-27
--
-- Problem:
-- public.value_object_hierarchy_events is an existing technical audit table.
-- Its FK policies are intentionally:
--   child_value_object_id      -> value_objects(id) ON DELETE CASCADE
--   old_parent_value_object_id -> value_objects(id) ON DELETE SET NULL
--   new_parent_value_object_id -> value_objects(id) ON DELETE SET NULL
--
-- When P8 creates an intermediate object, the existing hierarchy trigger writes
-- an audit event for that object. The generic P8 "dependent data" scan then
-- mistook this expected technical audit row for product data and blocked the
-- rollback.
--
-- Fix:
-- Exclude value_object_hierarchy_events from the generic dependent-data scan.
-- PostgreSQL will enforce its explicit FK policies during deletion. All other
-- foreign-key references to value_objects remain protected.
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
          namespace.nspname = 'public'
          and relation.relname in (
            'value_object_tree_operations',
            'value_object_tree_operation_items'
          )
$old$;

  v_new_fragment text :=
$new$
          namespace.nspname = 'public'
          and relation.relname in (
            'value_object_tree_operations',
            'value_object_tree_operation_items',
            'value_object_hierarchy_events'
          )
$new$;

  v_child_delete_type "char";
  v_old_parent_delete_type "char";
  v_new_parent_delete_type "char";
begin
  if v_oid is null then
    raise exception 'P8_ROLLBACK_FUNCTION_NOT_FOUND';
  end if;

  if to_regclass('public.value_object_hierarchy_events') is null then
    raise exception 'P8_HIERARCHY_EVENTS_TABLE_NOT_FOUND';
  end if;

  select constraint_row.confdeltype
  into v_child_delete_type
  from pg_constraint constraint_row
  where constraint_row.conname =
    'value_object_hierarchy_events_child_value_object_id_fkey';

  select constraint_row.confdeltype
  into v_old_parent_delete_type
  from pg_constraint constraint_row
  where constraint_row.conname =
    'value_object_hierarchy_events_old_parent_value_object_id_fkey';

  select constraint_row.confdeltype
  into v_new_parent_delete_type
  from pg_constraint constraint_row
  where constraint_row.conname =
    'value_object_hierarchy_events_new_parent_value_object_id_fkey';

  if v_child_delete_type is distinct from 'c'
     or v_old_parent_delete_type is distinct from 'n'
     or v_new_parent_delete_type is distinct from 'n' then
    raise exception using
      message = 'P8_HIERARCHY_EVENTS_FK_POLICY_UNEXPECTED',
      detail = format(
        'child=%s old_parent=%s new_parent=%s',
        coalesce(v_child_delete_type::text, 'missing'),
        coalesce(v_old_parent_delete_type::text, 'missing'),
        coalesce(v_new_parent_delete_type::text, 'missing')
      );
  end if;

  v_before := pg_get_functiondef(v_oid);

  if position(v_new_fragment in v_before) > 0 then
    -- Idempotent replay: already corrected.
    return;
  end if;

  if position(v_old_fragment in v_before) = 0 then
    raise exception 'P8_HIERARCHY_EVENTS_EXCLUSION_FRAGMENT_NOT_FOUND';
  end if;

  v_after := replace(v_before, v_old_fragment, v_new_fragment);

  if v_after = v_before then
    raise exception 'P8_HIERARCHY_EVENTS_EXCLUSION_PATCH_NOT_APPLIED';
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
  'P8 guarded rollback. Refuses rollback after newer overlapping applied structural operations, structural conflicts, new children or real dependent product data. Existing value_object_hierarchy_events audit rows follow their explicit CASCADE/SET NULL FK policies.';

commit;
