-- ARCTor.app Goal World P1C
-- READ ONLY POSTCHECK.

with checks as (
  select
    '01_write_request_table_exists' as check_name,
    to_regclass('public.value_object_ontology_write_requests') is not null
      as passed

  union all

  select
    '02_create_rpc_exists',
    to_regprocedure(
      'public.create_value_object_ontology_v1(uuid,uuid,uuid,jsonb,text,text)'
    ) is not null

  union all

  select
    '03_read_rpc_exists',
    to_regprocedure(
      'public.get_value_object_ontology_card_v1(uuid,uuid,uuid)'
    ) is not null

  union all

  select
    '04_lifecycle_rpc_exists',
    to_regprocedure(
      'public.set_value_object_ontology_lifecycle_v1(uuid,uuid,uuid,text)'
    ) is not null

  union all

  select
    '05_ontology_guard_exists',
    to_regprocedure(
      'public.enforce_value_object_ontology_p1c()'
    ) is not null

  union all

  select
    '06_snapshot_writer_exists',
    to_regprocedure(
      'public.write_value_object_definition_snapshot_p1c()'
    ) is not null

  union all

  select
    '07_ontology_trigger_exists',
    exists (
      select 1
      from pg_trigger
      where tgrelid = 'public.value_objects'::regclass
        and tgname = 'value_objects_ontology_p1c_enforce_trg'
        and not tgisinternal
    )

  union all

  select
    '08_snapshot_trigger_exists',
    exists (
      select 1
      from pg_trigger
      where tgrelid = 'public.value_objects'::regclass
        and tgname = 'value_objects_definition_snapshot_p1c_trg'
        and not tgisinternal
    )

  union all

  select
    '09_bridge_branch_inactive',
    exists (
      select 1
      from public.value_object_branch_types
      where branch_type_code = 'ontology_v1'
        and status = 'inactive'
    )

  union all

  select
    '10_p1b_objects_preserved',
    (
      select count(*) = 15
      from public.value_objects
      where origin_type_code = 'legacy'
        and definition_version = 1
    )

  union all

  select
    '11_p1b_versions_preserved',
    (
      select count(*) = 15
      from public.value_object_definition_versions
      where source_context = 'P1B_LEGACY_VALUE_OBJECT_MAPPING_V1'
    )

  union all

  select
    '12_service_role_execute_only',
    has_function_privilege(
      'service_role',
      'public.create_value_object_ontology_v1(uuid,uuid,uuid,jsonb,text,text)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'anon',
      'public.create_value_object_ontology_v1(uuid,uuid,uuid,jsonb,text,text)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'authenticated',
      'public.create_value_object_ontology_v1(uuid,uuid,uuid,jsonb,text,text)',
      'EXECUTE'
    )

  union all

  select
    '13_ontology_v1_legacy_injection_guard',
    position(
      'P1C_ONTOLOGY_V1_REQUIRES_ONTOLOGY_FIELDS'
      in pg_get_functiondef(
        'public.enforce_value_object_ontology_p1c()'::regprocedure
      )
    ) > 0

  union all

  select
    '14_semantic_leaf_child_guard',
    position(
      'P1C_SEMANTIC_LEAF_CANNOT_ACCEPT_CHILD'
      in pg_get_functiondef(
        'public.enforce_value_object_ontology_p1c()'::regprocedure
      )
    ) > 0
)
select check_name, passed
from checks
order by check_name;

select
  p.proname,
  p.prosecdef as security_definer,
  p.proconfig
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'create_value_object_ontology_v1',
    'get_value_object_ontology_card_v1',
    'set_value_object_ontology_lifecycle_v1',
    'enforce_value_object_ontology_p1c',
    'write_value_object_definition_snapshot_p1c'
  )
order by p.proname;
