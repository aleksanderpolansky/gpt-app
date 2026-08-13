-- ARCTor.app
-- AI-A3-P5A GLOBAL fact writer rowtype hotfix v3
--
-- V1/V2 both failed CLOSED before any change because their source matching was
-- too dependent on line formatting. V3 matches the semantic SELECT/INTO/FROM
-- sequence across arbitrary whitespace/newlines while preserving the live
-- function definition and changing only the token `assignment` -> `assignment.*`.
--
-- Root cause being fixed:
--   v_assignment public.value_object_parameter_assignments%rowtype;
--   SELECT assignment INTO v_assignment ...
-- must be:
--   SELECT assignment.* INTO v_assignment ...
--
-- Atomic, fail-closed, idempotent.
-- No application data rows are written by this migration.

begin;

do $preflight$
declare
  v_oid oid := to_regprocedure(
    'public.attach_global_observation_facts_gsr1_v1(uuid,uuid,uuid,text,text,jsonb)'
  );
  v_src text;
  v_buggy_pattern text :=
    '(select[[:space:]]+)assignment([[:space:]]+into[[:space:]]+v_assignment[[:space:]]+from[[:space:]]+public[.]value_object_parameter_assignments[[:space:]]+assignment)';
  v_fixed_pattern text :=
    '(select[[:space:]]+)assignment[.][*]([[:space:]]+into[[:space:]]+v_assignment[[:space:]]+from[[:space:]]+public[.]value_object_parameter_assignments[[:space:]]+assignment)';
  v_buggy_count integer := 0;
  v_fixed_count integer := 0;
begin
  if v_oid is null then
    raise exception using
      errcode = 'P0001',
      message = 'AI_A3_P5A_WRITER_HOTFIX_V3_FUNCTION_MISSING';
  end if;

  select p.prosrc
  into v_src
  from pg_catalog.pg_proc p
  where p.oid = v_oid;

  select count(*)::integer
  into v_buggy_count
  from regexp_matches(v_src, v_buggy_pattern, 'gi');

  select count(*)::integer
  into v_fixed_count
  from regexp_matches(v_src, v_fixed_pattern, 'gi');

  if v_buggy_count = 1 and v_fixed_count = 0 then
    null; -- expected pre-hotfix state
  elsif v_buggy_count = 0 and v_fixed_count = 1 then
    null; -- already fixed; safe idempotent rerun
  else
    raise exception using
      errcode = 'P0001',
      message = format(
        'AI_A3_P5A_WRITER_HOTFIX_V3_UNEXPECTED_SOURCE buggy=%s fixed=%s',
        v_buggy_count,
        v_fixed_count
      );
  end if;

  if position(
       'v_assignment public.value_object_parameter_assignments%rowtype'
       in lower(v_src)
     ) = 0
     or position(
       'join public.value_object_parameter_definitions definition'
       in lower(v_src)
     ) = 0
     or position(
       'gsr1d_global_fact_parameter_not_allowed_for_leaf'
       in lower(v_src)
     ) = 0 then
    raise exception using
      errcode = 'P0001',
      message = 'AI_A3_P5A_WRITER_HOTFIX_V3_SEMANTIC_ANCHORS_MISSING';
  end if;
end
$preflight$;

do $patch$
declare
  v_oid oid := to_regprocedure(
    'public.attach_global_observation_facts_gsr1_v1(uuid,uuid,uuid,text,text,jsonb)'
  );
  v_definition text;
  v_buggy_pattern text :=
    '(select[[:space:]]+)assignment([[:space:]]+into[[:space:]]+v_assignment[[:space:]]+from[[:space:]]+public[.]value_object_parameter_assignments[[:space:]]+assignment)';
  v_fixed_pattern text :=
    '(select[[:space:]]+)assignment[.][*]([[:space:]]+into[[:space:]]+v_assignment[[:space:]]+from[[:space:]]+public[.]value_object_parameter_assignments[[:space:]]+assignment)';
  v_buggy_count integer := 0;
  v_fixed_count integer := 0;
begin
  select pg_catalog.pg_get_functiondef(v_oid)
  into v_definition;

  select count(*)::integer
  into v_buggy_count
  from regexp_matches(v_definition, v_buggy_pattern, 'gi');

  select count(*)::integer
  into v_fixed_count
  from regexp_matches(v_definition, v_fixed_pattern, 'gi');

  if v_buggy_count = 1 and v_fixed_count = 0 then
    v_definition := regexp_replace(
      v_definition,
      v_buggy_pattern,
      E'\\1assignment.*\\2',
      'i'
    );

    if v_definition is null then
      raise exception 'AI_A3_P5A_WRITER_HOTFIX_V3_PATCH_NULL_DEFINITION';
    end if;

    execute v_definition;
  elsif v_buggy_count = 0 and v_fixed_count = 1 then
    null; -- already fixed
  else
    raise exception using
      errcode = 'P0001',
      message = format(
        'AI_A3_P5A_WRITER_HOTFIX_V3_PATCH_STATE_INVALID buggy=%s fixed=%s',
        v_buggy_count,
        v_fixed_count
      );
  end if;
end
$patch$;

do $acceptance$
declare
  v_oid oid := to_regprocedure(
    'public.attach_global_observation_facts_gsr1_v1(uuid,uuid,uuid,text,text,jsonb)'
  );
  v_src text;
  v_security_definer boolean;
  v_config text[];
  v_buggy_pattern text :=
    '(select[[:space:]]+)assignment([[:space:]]+into[[:space:]]+v_assignment[[:space:]]+from[[:space:]]+public[.]value_object_parameter_assignments[[:space:]]+assignment)';
  v_fixed_pattern text :=
    '(select[[:space:]]+)assignment[.][*]([[:space:]]+into[[:space:]]+v_assignment[[:space:]]+from[[:space:]]+public[.]value_object_parameter_assignments[[:space:]]+assignment)';
  v_buggy_count integer := 0;
  v_fixed_count integer := 0;
begin
  if v_oid is null then
    raise exception 'AI_A3_P5A_WRITER_HOTFIX_V3_ACCEPTANCE_FUNCTION_MISSING';
  end if;

  select p.prosrc, p.prosecdef, p.proconfig
  into v_src, v_security_definer, v_config
  from pg_catalog.pg_proc p
  where p.oid = v_oid;

  select count(*)::integer
  into v_buggy_count
  from regexp_matches(v_src, v_buggy_pattern, 'gi');

  select count(*)::integer
  into v_fixed_count
  from regexp_matches(v_src, v_fixed_pattern, 'gi');

  if v_buggy_count <> 0 or v_fixed_count <> 1 then
    raise exception using
      errcode = 'P0001',
      message = format(
        'AI_A3_P5A_WRITER_HOTFIX_V3_ACCEPTANCE_SOURCE_FAILED buggy=%s fixed=%s',
        v_buggy_count,
        v_fixed_count
      );
  end if;

  if v_security_definer is not true then
    raise exception 'AI_A3_P5A_WRITER_HOTFIX_V3_SECURITY_DEFINER_LOST';
  end if;

  if position(
    'search_path=public,pg_temp'
    in replace(coalesce(array_to_string(v_config, ','), ''), ' ', '')
  ) = 0 then
    raise exception 'AI_A3_P5A_WRITER_HOTFIX_V3_SEARCH_PATH_CHANGED';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.attach_global_observation_facts_gsr1_v1(uuid,uuid,uuid,text,text,jsonb)',
    'EXECUTE'
  ) then
    raise exception 'AI_A3_P5A_WRITER_HOTFIX_V3_SERVICE_ROLE_EXECUTE_LOST';
  end if;

  if has_function_privilege(
    'anon',
    'public.attach_global_observation_facts_gsr1_v1(uuid,uuid,uuid,text,text,jsonb)',
    'EXECUTE'
  ) then
    raise exception 'AI_A3_P5A_WRITER_HOTFIX_V3_ANON_EXECUTE_OPEN';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.attach_global_observation_facts_gsr1_v1(uuid,uuid,uuid,text,text,jsonb)',
    'EXECUTE'
  ) then
    raise exception 'AI_A3_P5A_WRITER_HOTFIX_V3_AUTHENTICATED_EXECUTE_OPEN';
  end if;
end
$acceptance$;

commit;

with fn as (
  select
    p.prosrc,
    p.prosecdef,
    p.proconfig
  from pg_catalog.pg_proc p
  where p.oid = to_regprocedure(
    'public.attach_global_observation_facts_gsr1_v1(uuid,uuid,uuid,text,text,jsonb)'
  )
), patterns as (
  select
    '(select[[:space:]]+)assignment([[:space:]]+into[[:space:]]+v_assignment[[:space:]]+from[[:space:]]+public[.]value_object_parameter_assignments[[:space:]]+assignment)'::text as buggy_pattern,
    '(select[[:space:]]+)assignment[.][*]([[:space:]]+into[[:space:]]+v_assignment[[:space:]]+from[[:space:]]+public[.]value_object_parameter_assignments[[:space:]]+assignment)'::text as fixed_pattern
), state as (
  select
    fn.*,
    (select count(*)::integer from regexp_matches(fn.prosrc, patterns.buggy_pattern, 'gi')) as buggy_count,
    (select count(*)::integer from regexp_matches(fn.prosrc, patterns.fixed_pattern, 'gi')) as fixed_count
  from fn
  cross join patterns
)
select *
from (
  select
    '01_function_exists'::text as check_name,
    exists(select 1 from state) as passed,
    'canonical writer exact signature exists'::text as detail

  union all

  select
    '02_fixed_rowtype_select_present',
    coalesce((select fixed_count = 1 from state), false),
    'assignment.* -> v_assignment semantic sequence exists exactly once'

  union all

  select
    '03_buggy_composite_select_absent',
    coalesce((select buggy_count = 0 from state), false),
    'bare assignment composite SELECT is absent'

  union all

  select
    '04_rowtype_declaration_preserved',
    coalesce((select position(
      'v_assignment public.value_object_parameter_assignments%rowtype'
      in lower(prosrc)
    ) > 0 from state), false),
    'v_assignment remains the intended table rowtype'

  union all

  select
    '05_parameter_definition_join_preserved',
    coalesce((select position(
      'join public.value_object_parameter_definitions definition'
      in lower(prosrc)
    ) > 0 from state), false),
    'parameter-definition join remains present'

  union all

  select
    '06_security_definer_preserved',
    coalesce((select prosecdef from state), false),
    'SECURITY DEFINER preserved'

  union all

  select
    '07_search_path_and_service_role_preserved',
    coalesce((select position(
      'search_path=public,pg_temp'
      in replace(coalesce(array_to_string(proconfig, ','), ''), ' ', '')
    ) > 0 from state), false)
    and has_function_privilege(
      'service_role',
      'public.attach_global_observation_facts_gsr1_v1(uuid,uuid,uuid,text,text,jsonb)',
      'EXECUTE'
    ),
    'search_path locked and service_role execute preserved'

  union all

  select
    '08_browser_roles_blocked',
    not has_function_privilege(
      'anon',
      'public.attach_global_observation_facts_gsr1_v1(uuid,uuid,uuid,text,text,jsonb)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'authenticated',
      'public.attach_global_observation_facts_gsr1_v1(uuid,uuid,uuid,text,text,jsonb)',
      'EXECUTE'
    ),
    'anon/authenticated remain blocked'
) checks
order by check_name;
