-- ARCTor.app Goal World P2A
-- READ ONLY POSTCHECK.

with checks as (
  select
    '01_structure_card_rpc_exists' as check_name,
    to_regprocedure(
      'public.get_value_object_structure_card_v1(uuid,uuid,uuid)'
    ) is not null as passed

  union all

  select
    '02_structure_card_security_definer',
    coalesce((
      select p.prosecdef
      from pg_proc p
      join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public'
        and p.oid='public.get_value_object_structure_card_v1(uuid,uuid,uuid)'::regprocedure
    ), false)

  union all

  select
    '03_structure_card_search_path_locked',
    coalesce((
      select p.proconfig @> array['search_path=public, pg_temp']::text[]
      from pg_proc p
      join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public'
        and p.oid='public.get_value_object_structure_card_v1(uuid,uuid,uuid)'::regprocedure
    ), false)

  union all

  select
    '04_service_role_execute',
    has_function_privilege(
      'service_role',
      'public.get_value_object_structure_card_v1(uuid,uuid,uuid)',
      'EXECUTE'
    )

  union all

  select
    '05_anon_no_execute',
    not has_function_privilege(
      'anon',
      'public.get_value_object_structure_card_v1(uuid,uuid,uuid)',
      'EXECUTE'
    )

  union all

  select
    '06_authenticated_no_execute',
    not has_function_privilege(
      'authenticated',
      'public.get_value_object_structure_card_v1(uuid,uuid,uuid)',
      'EXECUTE'
    )

  union all

  select
    '07_value_objects_preserved',
    (select count(*)=15 from public.value_objects)

  union all

  select
    '08_definition_versions_preserved',
    (select count(*)=15 from public.value_object_definition_versions)

  union all

  select
    '09_p8_preview_preserved',
    to_regprocedure(
      'public.preview_value_object_tree_restructure_v1(uuid,uuid,uuid,text,jsonb)'
    ) is not null

  union all

  select
    '10_p8_apply_preserved',
    to_regprocedure(
      'public.apply_value_object_tree_restructure_v1(uuid,uuid,uuid,uuid,text,jsonb,text,text,text)'
    ) is not null

  union all

  select
    '11_p8_rollback_preserved',
    to_regprocedure(
      'public.rollback_value_object_tree_restructure_v1(uuid,uuid,uuid,uuid,text,text)'
    ) is not null

  union all

  select
    '12_concept_aliases_preserved',
    to_regclass('public.concept_aliases') is not null

  union all

  select
    '13_structure_card_owner_scope_hardened',
    position(
      'child.owner_user_id = p_owner_user_id'
      in pg_get_functiondef(
        'public.get_value_object_structure_card_v1(uuid,uuid,uuid)'::regprocedure
      )
    ) > 0
    and position(
      'parent.owner_actor_id = p_owner_actor_id'
      in pg_get_functiondef(
        'public.get_value_object_structure_card_v1(uuid,uuid,uuid)'::regprocedure
      )
    ) > 0
)
select check_name, passed
from checks
order by check_name;

select
  p.proname,
  p.prosecdef as security_definer,
  p.proconfig,
  obj_description(p.oid, 'pg_proc') as comment
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname='get_value_object_structure_card_v1';
