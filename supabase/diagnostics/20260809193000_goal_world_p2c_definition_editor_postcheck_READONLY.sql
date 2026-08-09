-- ARCTor.app Goal World P2C
-- READ ONLY POSTCHECK.

with checks as (
  select
    '01_request_table' as check_name,
    to_regclass(
      'public.value_object_definition_edit_requests'
    ) is not null as passed

  union all

  select
    '02_editor_read_rpc',
    to_regprocedure(
      'public.get_value_object_definition_editor_v1(uuid,uuid,uuid)'
    ) is not null

  union all

  select
    '03_editor_write_rpc',
    to_regprocedure(
      'public.edit_value_object_ontology_definition_v1(uuid,uuid,uuid,uuid,text,jsonb,text,text)'
    ) is not null

  union all

  select
    '04_write_security_definer',
    coalesce((
      select p.prosecdef
      from pg_proc p
      where p.oid=
        'public.edit_value_object_ontology_definition_v1(uuid,uuid,uuid,uuid,text,jsonb,text,text)'::regprocedure
    ),false)

  union all

  select
    '05_service_role_execute',
    has_function_privilege(
      'service_role',
      'public.edit_value_object_ontology_definition_v1(uuid,uuid,uuid,uuid,text,jsonb,text,text)',
      'EXECUTE'
    )

  union all

  select
    '06_browser_roles_no_execute',
    not has_function_privilege(
      'anon',
      'public.edit_value_object_ontology_definition_v1(uuid,uuid,uuid,uuid,text,jsonb,text,text)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'authenticated',
      'public.edit_value_object_ontology_definition_v1(uuid,uuid,uuid,uuid,text,jsonb,text,text)',
      'EXECUTE'
    )

  union all

  select
    '07_snapshot_provenance_marker',
    position(
      'P2C_RENAME_V1'
      in pg_get_functiondef(
        'public.write_value_object_definition_snapshot_p1c()'::regprocedure
      )
    ) > 0
    and position(
      'P2C_SEMANTIC_DEFINITION_EDIT_V1'
      in pg_get_functiondef(
        'public.write_value_object_definition_snapshot_p1c()'::regprocedure
      )
    ) > 0

  union all

  select
    '08_structure_fields_not_editable',
    position(
      'parent_value_object_id'
      in pg_get_functiondef(
        'public.edit_value_object_ontology_definition_v1(uuid,uuid,uuid,uuid,text,jsonb,text,text)'::regprocedure
      )
    ) > 0
    and position(
      'P2C_SEMANTIC_PATCH_KEY_FORBIDDEN'
      in pg_get_functiondef(
        'public.edit_value_object_ontology_definition_v1(uuid,uuid,uuid,uuid,text,jsonb,text,text)'::regprocedure
      )
    ) > 0

  union all

  select
    '09_alias_table_untouched',
    (
      select count(*)
      from public.concept_aliases
      where concept_type='value_object'
    )=0

  union all

  select
    '10_baseline_rows_preserved',
    (select count(*)=15 from public.value_objects)
    and
    (select count(*)=15 from public.value_object_definition_versions)
    and
    (select count(*)=0 from public.value_object_definition_edit_requests)
)
select check_name,passed
from checks
order by check_name;
