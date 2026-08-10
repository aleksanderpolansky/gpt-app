/*
ARCTor.app — Goal World Constructor
P5B2B Methodology / Processing Provenance Persistence

Purpose:
- extend the existing immutable P4A activity_ai_processing_provenance row;
- persist the exact P5 methodologyTrace beside exact instruction snapshots;
- validate methodology identity against the P5A Git-projection registries;
- keep one immutable provenance row per semantic enrichment run.

This migration does NOT create a second provenance table.
*/

begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

do $preflight$
begin
  if to_regclass('public.activity_ai_processing_provenance') is null
     or to_regclass('public.activity_semantic_enrichment_runs_cux4') is null
     or to_regclass('public.analysis_protocol_versions') is null
     or to_regclass('public.analysis_schema_versions') is null
     or to_regclass('public.analysis_runtime_methodology_bindings') is null then
    raise exception using
      errcode='42P01',
      message='P5B2B_REQUIRED_FOUNDATION_MISSING';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='activity_ai_processing_provenance'
      and column_name='methodology_trace_json'
  ) then
    raise exception using
      errcode='23514',
      message='P5B2B_ALREADY_APPLIED_OR_PARTIALLY_APPLIED';
  end if;

  if exists (
    select 1
    from public.activity_ai_processing_provenance
  ) then
    raise exception using
      errcode='23514',
      message='P5B2B_EXISTING_PROVENANCE_ROWS_REQUIRE_REVIEW';
  end if;
end;
$preflight$;

alter table public.activity_ai_processing_provenance
  add column methodology_trace_json jsonb;

alter table public.activity_ai_processing_provenance
  alter column methodology_trace_json set not null;

alter table public.activity_ai_processing_provenance
  add constraint activity_ai_processing_methodology_trace_p5b2_check
  check (
    jsonb_typeof(methodology_trace_json)='object'
    and methodology_trace_json ? 'runtimeCode'
    and methodology_trace_json ? 'bindingVersion'
    and methodology_trace_json ? 'protocol'
    and methodology_trace_json ? 'outputSchema'
    and methodology_trace_json ? 'traceSchema'
    and methodology_trace_json ? 'systemInstructions'
    and methodology_trace_json ? 'actorInstruction'
    and methodology_trace_json ? 'deterministicRules'
    and methodology_trace_json ? 'knowledgePackages'
    and jsonb_typeof(methodology_trace_json->'protocol')='object'
    and jsonb_typeof(methodology_trace_json->'outputSchema')='object'
    and jsonb_typeof(methodology_trace_json->'traceSchema')='object'
    and jsonb_typeof(methodology_trace_json->'systemInstructions')='array'
    and jsonb_typeof(methodology_trace_json->'deterministicRules')='array'
    and jsonb_typeof(methodology_trace_json->'knowledgePackages')='array'
    and jsonb_typeof(methodology_trace_json->'actorInstruction')
      in ('object','null')
  );

create or replace function public.enforce_activity_ai_processing_provenance_p4a()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_run public.activity_semantic_enrichment_runs_cux4%rowtype;
  v_binding public.analysis_runtime_methodology_bindings%rowtype;
  v_protocol public.analysis_protocol_versions%rowtype;
  v_output_schema public.analysis_schema_versions%rowtype;
  v_trace_schema public.analysis_schema_versions%rowtype;
  v_runtime_code text;
  v_binding_version integer;
  v_protocol_code text;
  v_protocol_version integer;
  v_output_schema_code text;
  v_output_schema_version integer;
  v_trace_schema_code text;
  v_trace_schema_version integer;
begin
  select *
  into v_run
  from public.activity_semantic_enrichment_runs_cux4
  where id=new.semantic_enrichment_run_id;

  if not found then
    raise exception using
      errcode='23503',
      message='P4A_AI_PROCESSING_RUN_NOT_FOUND';
  end if;

  if new.owner_user_id is distinct from v_run.owner_user_id
     or new.owner_actor_id is distinct from v_run.owner_actor_id then
    raise exception using
      errcode='42501',
      message='P4A_AI_PROCESSING_PROVENANCE_OWNER_MISMATCH';
  end if;

  if new.ai_usage_event_id is not null
     and not exists (
       select 1
       from public.ai_usage_events usage
       where usage.id=new.ai_usage_event_id
         and usage.app_user_id=new.owner_user_id
     ) then
    raise exception using
      errcode='42501',
      message='P4A_AI_USAGE_EVENT_OWNER_MISMATCH';
  end if;

  if jsonb_typeof(new.methodology_trace_json) <> 'object' then
    raise exception using
      errcode='23514',
      message='P5B2B_METHODOLOGY_TRACE_OBJECT_REQUIRED';
  end if;

  v_runtime_code := new.methodology_trace_json->>'runtimeCode';

  if v_runtime_code is distinct from 'activity_semantic_preview' then
    raise exception using
      errcode='23514',
      message='P5B2B_ACTIVITY_RUNTIME_CODE_REQUIRED';
  end if;

  if coalesce(new.methodology_trace_json->>'bindingVersion','')
     !~ '^[1-9][0-9]*$' then
    raise exception using
      errcode='23514',
      message='P5B2B_BINDING_VERSION_INVALID';
  end if;

  v_binding_version :=
    (new.methodology_trace_json->>'bindingVersion')::integer;

  select *
  into v_binding
  from public.analysis_runtime_methodology_bindings binding
  where binding.runtime_code=v_runtime_code
    and binding.binding_version=v_binding_version;

  if not found then
    raise exception using
      errcode='23503',
      message='P5B2B_RUNTIME_BINDING_NOT_REGISTERED';
  end if;

  v_protocol_code :=
    new.methodology_trace_json->'protocol'->>'code';

  if coalesce(
       new.methodology_trace_json->'protocol'->>'version',
       ''
     ) !~ '^[1-9][0-9]*$' then
    raise exception using
      errcode='23514',
      message='P5B2B_PROTOCOL_VERSION_INVALID';
  end if;

  v_protocol_version :=
    (new.methodology_trace_json->'protocol'->>'version')::integer;

  v_output_schema_code :=
    new.methodology_trace_json->'outputSchema'->>'code';

  if coalesce(
       new.methodology_trace_json->'outputSchema'->>'version',
       ''
     ) !~ '^[1-9][0-9]*$' then
    raise exception using
      errcode='23514',
      message='P5B2B_OUTPUT_SCHEMA_VERSION_INVALID';
  end if;

  v_output_schema_version :=
    (new.methodology_trace_json->'outputSchema'->>'version')::integer;

  v_trace_schema_code :=
    new.methodology_trace_json->'traceSchema'->>'code';

  if coalesce(
       new.methodology_trace_json->'traceSchema'->>'version',
       ''
     ) !~ '^[1-9][0-9]*$' then
    raise exception using
      errcode='23514',
      message='P5B2B_TRACE_SCHEMA_VERSION_INVALID';
  end if;

  v_trace_schema_version :=
    (new.methodology_trace_json->'traceSchema'->>'version')::integer;

  if v_protocol_code is distinct from v_binding.protocol_code
     or v_protocol_version is distinct from v_binding.protocol_version
     or v_output_schema_code is distinct from v_binding.output_schema_code
     or v_output_schema_version is distinct from v_binding.output_schema_version
     or v_trace_schema_code is distinct from v_binding.trace_schema_code
     or v_trace_schema_version is distinct from v_binding.trace_schema_version then
    raise exception using
      errcode='23514',
      message='P5B2B_TRACE_BINDING_IDENTITY_MISMATCH';
  end if;

  select *
  into v_protocol
  from public.analysis_protocol_versions protocol
  where protocol.protocol_code=v_protocol_code
    and protocol.version=v_protocol_version;

  if not found
     or new.methodology_trace_json->'protocol'->>'sha256'
        is distinct from v_protocol.content_sha256 then
    raise exception using
      errcode='23514',
      message='P5B2B_PROTOCOL_HASH_MISMATCH';
  end if;

  select *
  into v_output_schema
  from public.analysis_schema_versions schema_version
  where schema_version.schema_code=v_output_schema_code
    and schema_version.version=v_output_schema_version;

  if not found
     or new.methodology_trace_json->'outputSchema'->>'sha256'
        is distinct from v_output_schema.content_sha256 then
    raise exception using
      errcode='23514',
      message='P5B2B_OUTPUT_SCHEMA_HASH_MISMATCH';
  end if;

  select *
  into v_trace_schema
  from public.analysis_schema_versions schema_version
  where schema_version.schema_code=v_trace_schema_code
    and schema_version.version=v_trace_schema_version;

  if not found
     or new.methodology_trace_json->'traceSchema'->>'sha256'
        is distinct from v_trace_schema.content_sha256 then
    raise exception using
      errcode='23514',
      message='P5B2B_TRACE_SCHEMA_HASH_MISMATCH';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(
      new.methodology_trace_json->'deterministicRules'
    ) item
    where not (
      item->>'registryCode'
      = any(v_binding.deterministic_rule_registry_codes)
    )
  ) then
    raise exception using
      errcode='23514',
      message='P5B2B_UNBOUND_RULE_REGISTRY_IN_TRACE';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(
      new.methodology_trace_json->'knowledgePackages'
    ) item
    where not (
      item->>'packageCode'
      = any(v_binding.knowledge_package_codes)
    )
  ) then
    raise exception using
      errcode='23514',
      message='P5B2B_UNBOUND_KNOWLEDGE_PACKAGE_IN_TRACE';
  end if;

  return new;
end;
$function$;

do $p5b2b_postgate$
declare
  all_passed boolean;
begin
  with checks as (
    select
      exists (
        select 1
        from information_schema.columns
        where table_schema='public'
          and table_name='activity_ai_processing_provenance'
          and column_name='methodology_trace_json'
          and is_nullable='NO'
          and data_type='jsonb'
      ) as passed

    union all
    select exists (
      select 1
      from pg_constraint c
      join pg_class t on t.oid=c.conrelid
      join pg_namespace n on n.oid=t.relnamespace
      where n.nspname='public'
        and t.relname='activity_ai_processing_provenance'
        and c.conname='activity_ai_processing_methodology_trace_p5b2_check'
    )

    union all
    select exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public'
        and p.proname='enforce_activity_ai_processing_provenance_p4a'
        and p.prosecdef
        and coalesce(array_to_string(p.proconfig,';'),'')
          like '%search_path=public, pg_temp%'
    )

    union all
    select exists (
      select 1
      from pg_trigger trigger_row
      where not trigger_row.tgisinternal
        and trigger_row.tgrelid=
          'public.activity_ai_processing_provenance'::regclass
        and trigger_row.tgname=
          'trg_activity_ai_processing_provenance_p4a'
    )

    union all
    select exists (
      select 1
      from pg_trigger trigger_row
      where not trigger_row.tgisinternal
        and trigger_row.tgrelid=
          'public.activity_ai_processing_provenance'::regclass
        and trigger_row.tgname=
          'trg_activity_ai_processing_provenance_immutable_p4a'
    )

    union all
    select
      has_table_privilege(
        'service_role',
        'public.activity_ai_processing_provenance',
        'SELECT'
      )
      and has_table_privilege(
        'service_role',
        'public.activity_ai_processing_provenance',
        'INSERT'
      )
      and not has_table_privilege(
        'service_role',
        'public.activity_ai_processing_provenance',
        'UPDATE'
      )
      and not has_table_privilege(
        'service_role',
        'public.activity_ai_processing_provenance',
        'DELETE'
      )

    union all
    select
      not has_table_privilege(
        'anon',
        'public.activity_ai_processing_provenance',
        'SELECT'
      )
      and not has_table_privilege(
        'authenticated',
        'public.activity_ai_processing_provenance',
        'SELECT'
      )
      and not has_table_privilege(
        'anon',
        'public.activity_ai_processing_provenance',
        'INSERT'
      )
      and not has_table_privilege(
        'authenticated',
        'public.activity_ai_processing_provenance',
        'INSERT'
      )

    union all
    select exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public'
        and c.relname='activity_ai_processing_provenance'
        and c.relrowsecurity
    )

    union all
    select exists (
      select 1
      from public.analysis_runtime_methodology_bindings
      where runtime_code='activity_semantic_preview'
        and binding_version=1
        and protocol_code='arctor_ai_runtime_core'
        and protocol_version=1
        and output_schema_code='activity_semantic_preview_model_output'
        and output_schema_version=1
        and trace_schema_code='ai_methodology_trace'
        and trace_schema_version=1
        and deterministic_rule_registry_codes=
          array['calendar_ai_rule_preferences']::text[]
        and cardinality(knowledge_package_codes)=0
    )

    union all
    select exists (
      select 1
      from public.analysis_protocol_versions
      where protocol_code='arctor_ai_runtime_core'
        and version=1
        and content_sha256=
          'CA86813D3493DF764AEC0C95070B282F3964303EA59AB600BDBA0A26F83B5163'
    )

    union all
    select exists (
      select 1
      from public.analysis_schema_versions
      where schema_code='activity_semantic_preview_model_output'
        and version=1
        and content_sha256=
          '427F9CE0B52BF526FB876F327B70A4BAC7638EE6F44F753A499CE1C6F454435F'
    )

    union all
    select exists (
      select 1
      from public.analysis_schema_versions
      where schema_code='ai_methodology_trace'
        and version=1
        and content_sha256=
          'CE3650CF86B3879E2B68CD139C4C736D277AFEC82FB42A1F5B7C7DB5BAF35328'
    )

    union all
    select
      exists (
        select 1
        from information_schema.columns
        where table_schema='public'
          and table_name='activity_ai_processing_provenance'
          and column_name='system_instruction_snapshot_json'
      )
      and exists (
        select 1
        from information_schema.columns
        where table_schema='public'
          and table_name='activity_ai_processing_provenance'
          and column_name='actor_instruction_snapshot_json'
      )
      and exists (
        select 1
        from information_schema.columns
        where table_schema='public'
          and table_name='activity_ai_processing_provenance'
          and column_name='external_source_snapshot_json'
      )
      and exists (
        select 1
        from information_schema.columns
        where table_schema='public'
          and table_name='activity_ai_processing_provenance'
          and column_name='inference_assumptions_json'
      )

    union all
    select (
      select count(*)
      from public.activity_ai_processing_provenance
    )=0
  )
  select bool_and(passed)
  into all_passed
  from checks;

  if all_passed is distinct from true then
    raise exception using
      errcode='23514',
      message='P5B2B_ATOMIC_POSTCONDITION_FAILED';
  end if;
end;
$p5b2b_postgate$;

commit;
