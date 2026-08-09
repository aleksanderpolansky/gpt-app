-- ARCTor.app Goal World P2D
-- ROBUST READ-ONLY POSTCHECK.
-- Expected: 12 rows, all passed=true.

with checks as (
  select
    '01_value_object_concept_type_allowed' as check_name,
    exists (
      select 1
      from pg_constraint
      where conrelid='public.concept_aliases'::regclass
        and conname='concept_aliases_concept_type_allowed'
        and pg_get_constraintdef(oid) like '%value_object%'
    ) as passed

  union all

  select
    '02_alias_profile_rpc',
    to_regprocedure(
      'public.get_value_object_alias_profile_v1(uuid,uuid,uuid)'
    ) is not null

  union all

  select
    '03_alias_manage_rpc',
    to_regprocedure(
      'public.manage_value_object_alias_v1(uuid,uuid,uuid,uuid,text,jsonb)'
    ) is not null

  union all

  select
    '04_recognition_rpc',
    to_regprocedure(
      'public.recognize_value_object_text_v1(uuid,uuid,text,text)'
    ) is not null

  union all

  select
    '05_security_definer_all_p2d_rpcs',
    coalesce((
      select bool_and(p.prosecdef)
      from pg_proc p
      where p.oid in (
        'public.get_value_object_alias_profile_v1(uuid,uuid,uuid)'::regprocedure,
        'public.manage_value_object_alias_v1(uuid,uuid,uuid,uuid,text,jsonb)'::regprocedure,
        'public.recognize_value_object_text_v1(uuid,uuid,text,text)'::regprocedure
      )
    ),false)

  union all

  select
    '06_search_path_locked',
    coalesce((
      select bool_and(
        coalesce(array_to_string(p.proconfig,','),'')
          like '%search_path=public, pg_temp%'
      )
      from pg_proc p
      where p.oid in (
        'public.get_value_object_alias_profile_v1(uuid,uuid,uuid)'::regprocedure,
        'public.manage_value_object_alias_v1(uuid,uuid,uuid,uuid,text,jsonb)'::regprocedure,
        'public.recognize_value_object_text_v1(uuid,uuid,text,text)'::regprocedure
      )
    ),false)

  union all

  select
    '07_service_role_execute',
    has_function_privilege(
      'service_role',
      'public.get_value_object_alias_profile_v1(uuid,uuid,uuid)',
      'EXECUTE'
    )
    and has_function_privilege(
      'service_role',
      'public.manage_value_object_alias_v1(uuid,uuid,uuid,uuid,text,jsonb)',
      'EXECUTE'
    )
    and has_function_privilege(
      'service_role',
      'public.recognize_value_object_text_v1(uuid,uuid,text,text)',
      'EXECUTE'
    )

  union all

  select
    '08_browser_roles_no_execute',
    not has_function_privilege(
      'anon',
      'public.manage_value_object_alias_v1(uuid,uuid,uuid,uuid,text,jsonb)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'authenticated',
      'public.manage_value_object_alias_v1(uuid,uuid,uuid,uuid,text,jsonb)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'anon',
      'public.recognize_value_object_text_v1(uuid,uuid,text,text)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'authenticated',
      'public.recognize_value_object_text_v1(uuid,uuid,text,text)',
      'EXECUTE'
    )

  union all

  select
    '09_recognition_index_present',
    to_regclass(
      'public.concept_aliases_value_object_recognition_idx'
    ) is not null

  union all

  select
    '10_structure_card_p2d_repaired',
    position(
      'approved'
      in pg_get_functiondef(
        'public.get_value_object_structure_card_v1(uuid,uuid,uuid)'::regprocedure
      )
    ) > 0
    and position(
      'published'
      in pg_get_functiondef(
        'public.get_value_object_structure_card_v1(uuid,uuid,uuid)'::regprocedure
      )
    ) > 0
    and position(
      'writeEnabled'
      in pg_get_functiondef(
        'public.get_value_object_structure_card_v1(uuid,uuid,uuid)'::regprocedure
      )
    ) > 0

  union all

  select
    '11_no_persistent_alias_fixture',
    (
      select count(*)
      from public.concept_aliases
      where concept_type='value_object'
    )=0

  union all

  select
    '12_baseline_preserved',
    (select count(*)=15 from public.value_objects)
    and
    (select count(*)=15 from public.value_object_definition_versions)
    and
    (select count(*)=0 from public.value_object_definition_edit_requests)
)
select check_name,passed
from checks
order by check_name;
