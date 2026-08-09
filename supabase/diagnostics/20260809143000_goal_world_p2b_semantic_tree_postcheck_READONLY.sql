-- ARCTor.app Goal World P2B
-- READ ONLY POSTCHECK.

with checks as (
  select '01_contract_version_column' as check_name,
    exists (
      select 1 from information_schema.columns
      where table_schema='public'
        and table_name='value_object_tree_operations'
        and column_name='contract_version'
        and is_nullable='NO'
    ) as passed

  union all
  select '02_context_rpc',
    to_regprocedure('public.get_value_object_tree_restructure_context_v2(uuid,uuid,uuid)') is not null

  union all
  select '03_preview_v2_rpc',
    to_regprocedure('public.preview_value_object_tree_restructure_v2(uuid,uuid,uuid,text,jsonb)') is not null

  union all
  select '04_apply_v2_rpc',
    to_regprocedure('public.apply_value_object_tree_restructure_v2(uuid,uuid,uuid,uuid,text,jsonb,text,text,text)') is not null

  union all
  select '05_rollback_v2_rpc',
    to_regprocedure('public.rollback_value_object_tree_restructure_v2(uuid,uuid,uuid,uuid,text,text)') is not null

  union all
  select '06_preview_security_definer',
    coalesce((
      select p.prosecdef from pg_proc p
      where p.oid='public.preview_value_object_tree_restructure_v2(uuid,uuid,uuid,text,jsonb)'::regprocedure
    ),false)

  union all
  select '07_apply_security_definer',
    coalesce((
      select p.prosecdef from pg_proc p
      where p.oid='public.apply_value_object_tree_restructure_v2(uuid,uuid,uuid,uuid,text,jsonb,text,text,text)'::regprocedure
    ),false)

  union all
  select '08_rollback_security_definer',
    coalesce((
      select p.prosecdef from pg_proc p
      where p.oid='public.rollback_value_object_tree_restructure_v2(uuid,uuid,uuid,uuid,text,text)'::regprocedure
    ),false)

  union all
  select '09_service_role_execute',
    has_function_privilege('service_role','public.apply_value_object_tree_restructure_v2(uuid,uuid,uuid,uuid,text,jsonb,text,text,text)','EXECUTE')
    and has_function_privilege('service_role','public.rollback_value_object_tree_restructure_v2(uuid,uuid,uuid,uuid,text,text)','EXECUTE')

  union all
  select '10_browser_roles_no_execute',
    not has_function_privilege('anon','public.apply_value_object_tree_restructure_v2(uuid,uuid,uuid,uuid,text,jsonb,text,text,text)','EXECUTE')
    and not has_function_privilege('authenticated','public.apply_value_object_tree_restructure_v2(uuid,uuid,uuid,uuid,text,jsonb,text,text,text)','EXECUTE')

  union all
  select '11_p8_v1_preserved',
    to_regprocedure('public.preview_value_object_tree_restructure_v1(uuid,uuid,uuid,text,jsonb)') is not null
    and to_regprocedure('public.apply_value_object_tree_restructure_v1(uuid,uuid,uuid,uuid,text,jsonb,text,text,text)') is not null
    and to_regprocedure('public.rollback_value_object_tree_restructure_v1(uuid,uuid,uuid,uuid,text,text)') is not null

  union all
  select '12_baseline_value_objects_preserved',
    (select count(*)=15 from public.value_objects)

  union all
  select '13_baseline_definition_versions_preserved',
    (select count(*)=15 from public.value_object_definition_versions)

  union all
  select '14_no_operations_created_by_migration',
    (select count(*)=0 from public.value_object_tree_operations)
    and (select count(*)=0 from public.value_object_tree_operation_items)

  union all
  select '15_historical_recalc_off',
    position('requiresSeparateBudgetedConfirmation' in pg_get_functiondef('public.preview_value_object_tree_restructure_v2(uuid,uuid,uuid,text,jsonb)'::regprocedure)) > 0

  union all
  select '16_insert_rollback_retires_not_deletes',
    position('status=''retired''' in pg_get_functiondef('public.rollback_value_object_tree_restructure_v2(uuid,uuid,uuid,uuid,text,text)'::regprocedure)) > 0

  union all
  select '17_p2b_operation_contract_guard',
    to_regprocedure(
      'public.enforce_value_object_tree_operation_p2b_contract_v1()'
    ) is not null
    and exists (
      select 1
      from pg_trigger trigger_row
      where trigger_row.tgrelid='public.value_object_tree_operations'::regclass
        and trigger_row.tgname='value_object_tree_operations_p2b_contract_trg'
        and not trigger_row.tgisinternal
    )
    and position(
      'P2B_OPERATION_REQUIRES_P2B_CONTROLLED_FLOW'
      in pg_get_functiondef(
        'public.enforce_value_object_tree_operation_p2b_contract_v1()'::regprocedure
      )
    ) > 0

  union all
  select '18_p2a_retired_descendants_hidden',
    position(
      'grandchild.status <> ''retired'''
      in pg_get_functiondef(
        'public.get_value_object_structure_card_v1(uuid,uuid,uuid)'::regprocedure
      )
    ) > 0
    and position(
      'child.status <> ''retired'''
      in pg_get_functiondef(
        'public.get_value_object_structure_card_v1(uuid,uuid,uuid)'::regprocedure
      )
    ) > 0

  union all
  select '19_apply_response_tracks_rollback_state',
    position(
      '''operationStatus'',''applied'''
      in pg_get_functiondef(
        'public.apply_value_object_tree_restructure_v2(uuid,uuid,uuid,uuid,text,jsonb,text,text,text)'::regprocedure
      )
    ) > 0
    and position(
      '''rolledBackByOperationId'''
      in pg_get_functiondef(
        'public.rollback_value_object_tree_restructure_v2(uuid,uuid,uuid,uuid,text,text)'::regprocedure
      )
    ) > 0
)
select check_name, passed
from checks
order by check_name;
