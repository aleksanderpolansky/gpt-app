/*
ARCTor.app — Goal World Constructor
P6B Goal Intake runtime registration in P5 methodology platform.
No OpenAI call. No Goal World or Value Object write.
*/

begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

do $preflight$
begin
  if to_regclass('public.analysis_protocol_versions') is null
     or to_regclass('public.analysis_schema_versions') is null
     or to_regclass('public.analysis_runtime_methodology_bindings') is null
     or to_regclass('public.analysis_runtime_methodology_current') is null then
    raise exception using errcode='42P01',
      message='P6B_P5_METHODOLOGY_FOUNDATION_MISSING';
  end if;

  if exists (
    select 1
    from public.analysis_runtime_methodology_bindings
    where runtime_code='goal_intake'
  ) then
    raise exception using errcode='23514',
      message='P6B_GOAL_INTAKE_ALREADY_REGISTERED';
  end if;
end;
$preflight$;

alter table public.analysis_runtime_methodology_bindings
  add column if not exists supporting_protocol_refs jsonb
    not null default '[]'::jsonb;

alter table public.analysis_runtime_methodology_bindings
  drop constraint if exists analysis_runtime_methodology_bindings_runtime_p5a_check;

alter table public.analysis_runtime_methodology_bindings
  add constraint analysis_runtime_methodology_bindings_runtime_p6b_check
  check (
    runtime_code in (
      'navigator_chat',
      'activity_semantic_preview',
      'goal_intake'
    )
  );

alter table public.analysis_runtime_methodology_bindings
  add constraint analysis_runtime_methodology_bindings_supporting_protocols_p6b_check
  check (jsonb_typeof(supporting_protocol_refs)='array');

update public.analysis_protocol_versions
set runtime_targets = (
  select array_agg(distinct target order by target)
  from unnest(runtime_targets || array['goal_intake']::text[]) as target
)
where protocol_code='arctor_ai_runtime_core'
  and version=1;

insert into public.analysis_protocol_versions (
  protocol_code,version,display_name,purpose_text,source_path,
  content_sha256,criticality_code,runtime_targets,contract_version
)
values
(
  'goal_intake_protocol',1,'ARCTor Goal Intake Protocol',
  'Normalize a human goal into explicit known/partial/unknown/clarification-required fields.',
  'docs/goal-world/P6A_GOAL_INTAKE_PROTOCOL_V1.md',
  '47D4FB11C815B95371F6BC2A000F8A89819B9126831F652718B1E6E8EBFBE85C',
  'critical',array['goal_intake']::text[],'p6b_v1'
),
(
  'reality_context_snapshot',1,'ARCTor Reality Context Snapshot Protocol',
  'Compile minimal task-scoped, time-aware, provenance-preserving personal context.',
  'docs/goal-world/P6A1_REALITY_CONTEXT_SNAPSHOT_PROTOCOL_V1.md',
  '11E25999A91A3EA36C442F0E0819F3F550C19DAF323396FB5233B5B0C50FD38D',
  'critical',array['goal_intake']::text[],'p6b_v1'
);

insert into public.analysis_schema_versions (
  schema_code,version,display_name,source_path,content_sha256,
  strict_output_required,runtime_targets,contract_version
)
values
(
  'goal_intake_definition',1,'ARCTor Goal Intake Definition',
  'src/lib/goal-world/intake/schemas/goal-intake-definition.v1.schema.json',
  'D814F94B539E13055C1462564A90676E09598BEB09E9E418B31F293ACA73C845',
  true,array['goal_intake']::text[],'p6b_v1'
),
(
  'ai_methodology_trace',2,'ARCTor AI Methodology Trace v2',
  'src/lib/ai/methodology/schemas/ai-methodology-trace.v2.schema.json',
  'A7C7F264A0D5CD7E609A5188343B06B07807C00E35D13CCBA103B537C65EEC33',
  false,array['goal_intake']::text[],'p6b_v1'
);

insert into public.analysis_runtime_methodology_bindings (
  runtime_code,binding_version,protocol_code,protocol_version,
  supporting_protocol_refs,output_schema_code,output_schema_version,
  trace_schema_code,trace_schema_version,editable_instruction_store_code,
  personal_context_store_code,deterministic_rule_registry_codes,
  knowledge_package_codes,contract_version
)
values (
  'goal_intake',1,'arctor_ai_runtime_core',1,
  jsonb_build_array(
    jsonb_build_object(
      'code','goal_intake_protocol','version',1,
      'sha256','47D4FB11C815B95371F6BC2A000F8A89819B9126831F652718B1E6E8EBFBE85C'
    ),
    jsonb_build_object(
      'code','reality_context_snapshot','version',1,
      'sha256','11E25999A91A3EA36C442F0E0819F3F550C19DAF323396FB5233B5B0C50FD38D'
    )
  ),
  'goal_intake_definition',1,'ai_methodology_trace',2,
  'ai_processing_instruction_sets','actor_ai_processing_preferences',
  array['goal_intake_registry','reality_context_policy']::text[],
  '{}'::text[],'p6b_v1'
);

insert into public.analysis_runtime_methodology_current (
  runtime_code,binding_version
)
values ('goal_intake',1);

do $postgate$
declare ok boolean;
begin
  select
    exists (
      select 1 from information_schema.columns
      where table_schema='public'
        and table_name='analysis_runtime_methodology_bindings'
        and column_name='supporting_protocol_refs'
        and data_type='jsonb'
        and is_nullable='NO'
    )
    and exists (
      select 1 from public.analysis_protocol_versions
      where protocol_code='goal_intake_protocol'
        and version=1
        and content_sha256='47D4FB11C815B95371F6BC2A000F8A89819B9126831F652718B1E6E8EBFBE85C'
    )
    and exists (
      select 1 from public.analysis_protocol_versions
      where protocol_code='reality_context_snapshot'
        and version=1
        and content_sha256='11E25999A91A3EA36C442F0E0819F3F550C19DAF323396FB5233B5B0C50FD38D'
    )
    and exists (
      select 1 from public.analysis_schema_versions
      where schema_code='goal_intake_definition'
        and version=1
        and strict_output_required
        and content_sha256='D814F94B539E13055C1462564A90676E09598BEB09E9E418B31F293ACA73C845'
    )
    and exists (
      select 1 from public.analysis_schema_versions
      where schema_code='ai_methodology_trace'
        and version=2
        and content_sha256='A7C7F264A0D5CD7E609A5188343B06B07807C00E35D13CCBA103B537C65EEC33'
    )
    and exists (
      select 1 from public.analysis_runtime_methodology_bindings
      where runtime_code='goal_intake'
        and binding_version=1
        and protocol_code='arctor_ai_runtime_core'
        and output_schema_code='goal_intake_definition'
        and trace_schema_code='ai_methodology_trace'
        and trace_schema_version=2
        and jsonb_array_length(supporting_protocol_refs)=2
        and deterministic_rule_registry_codes=
          array['goal_intake_registry','reality_context_policy']::text[]
    )
    and exists (
      select 1 from public.analysis_runtime_methodology_current
      where runtime_code='goal_intake'
        and binding_version=1
    )
  into ok;

  if not coalesce(ok,false) then
    raise exception using errcode='23514',
      message='P6B_ATOMIC_POSTCONDITION_FAILED';
  end if;
end;
$postgate$;

commit;
