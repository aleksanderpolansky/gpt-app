/*
ARCTor.app — Goal World Constructor
P5A Instruction & Methodology Platform v1
Git protocol/schema registry -> read-only Supabase projection.

SOURCE OF TRUTH:
- core protocol bytes: Git
- JSON Schema bytes: Git
- editable system instructions: existing P4A/P4B DB lifecycle
- personal instructions: existing P4A/P4B actor lifecycle

THIS MIGRATION DOES NOT ALTER AI RUNTIME BEHAVIOR.
*/

begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

do $preflight$
begin
  if to_regclass('public.ai_processing_instruction_sets') is null
     or to_regclass('public.ai_processing_instruction_revisions') is null
     or to_regclass('public.actor_ai_processing_preferences') is null
     or to_regclass('public.actor_ai_processing_preference_revisions') is null
     or to_regclass('public.activity_ai_processing_provenance') is null then
    raise exception using
      errcode='42P01',
      message='P5A_P4AB_INSTRUCTION_FOUNDATION_MISSING';
  end if;

  if to_regclass('public.analysis_protocol_versions') is not null
     or to_regclass('public.analysis_schema_versions') is not null
     or to_regclass('public.analysis_runtime_methodology_bindings') is not null
     or to_regclass('public.analysis_runtime_methodology_current') is not null then
    raise exception using
      errcode='23514',
      message='P5A_ALREADY_INSTALLED_OR_PARTIALLY_APPLIED';
  end if;
end;
$preflight$;

create table public.analysis_protocol_versions (
  protocol_code text not null,
  version integer not null,
  display_name text not null,
  purpose_text text not null,
  source_path text not null,
  content_sha256 text not null,
  criticality_code text not null default 'critical',
  runtime_targets text[] not null default '{}'::text[],
  contract_version text not null default 'p5a_v1',
  created_at timestamptz not null default clock_timestamp(),

  constraint analysis_protocol_versions_p5a_pk
    primary key (protocol_code,version),

  constraint analysis_protocol_versions_version_p5a_check
    check (version > 0),

  constraint analysis_protocol_versions_sha_p5a_check
    check (content_sha256 ~ '^[A-F0-9]{64}$'),

  constraint analysis_protocol_versions_criticality_p5a_check
    check (criticality_code in ('critical','advisory')),

  constraint analysis_protocol_versions_runtime_targets_p5a_check
    check (cardinality(runtime_targets) > 0)
);

create table public.analysis_schema_versions (
  schema_code text not null,
  version integer not null,
  display_name text not null,
  source_path text not null,
  content_sha256 text not null,
  strict_output_required boolean not null,
  runtime_targets text[] not null default '{}'::text[],
  contract_version text not null default 'p5a_v1',
  created_at timestamptz not null default clock_timestamp(),

  constraint analysis_schema_versions_p5a_pk
    primary key (schema_code,version),

  constraint analysis_schema_versions_version_p5a_check
    check (version > 0),

  constraint analysis_schema_versions_sha_p5a_check
    check (content_sha256 ~ '^[A-F0-9]{64}$')
);

create table public.analysis_runtime_methodology_bindings (
  runtime_code text not null,
  binding_version integer not null,

  protocol_code text not null,
  protocol_version integer not null,

  output_schema_code text not null,
  output_schema_version integer not null,

  trace_schema_code text not null,
  trace_schema_version integer not null,

  editable_instruction_store_code text not null,
  personal_context_store_code text not null,

  deterministic_rule_registry_codes text[] not null default '{}'::text[],
  knowledge_package_codes text[] not null default '{}'::text[],

  contract_version text not null default 'p5a_v1',
  created_at timestamptz not null default clock_timestamp(),

  constraint analysis_runtime_methodology_bindings_p5a_pk
    primary key (runtime_code,binding_version),

  constraint analysis_runtime_methodology_bindings_version_p5a_check
    check (binding_version > 0),

  constraint analysis_runtime_methodology_bindings_runtime_p5a_check
    check (runtime_code in ('navigator_chat','activity_semantic_preview')),

  constraint analysis_runtime_methodology_bindings_protocol_p5a_fk
    foreign key (protocol_code,protocol_version)
    references public.analysis_protocol_versions(protocol_code,version)
    on delete restrict,

  constraint analysis_runtime_methodology_bindings_output_schema_p5a_fk
    foreign key (output_schema_code,output_schema_version)
    references public.analysis_schema_versions(schema_code,version)
    on delete restrict,

  constraint analysis_runtime_methodology_bindings_trace_schema_p5a_fk
    foreign key (trace_schema_code,trace_schema_version)
    references public.analysis_schema_versions(schema_code,version)
    on delete restrict
);

create table public.analysis_runtime_methodology_current (
  runtime_code text primary key,
  binding_version integer not null,
  activated_at timestamptz not null default clock_timestamp(),

  constraint analysis_runtime_methodology_current_p5a_fk
    foreign key (runtime_code,binding_version)
    references public.analysis_runtime_methodology_bindings(runtime_code,binding_version)
    on delete restrict
);

alter table public.analysis_protocol_versions enable row level security;
alter table public.analysis_schema_versions enable row level security;
alter table public.analysis_runtime_methodology_bindings enable row level security;
alter table public.analysis_runtime_methodology_current enable row level security;

revoke all on table
  public.analysis_protocol_versions,
  public.analysis_schema_versions,
  public.analysis_runtime_methodology_bindings,
  public.analysis_runtime_methodology_current
from public,anon,authenticated,service_role;

grant select on table
  public.analysis_protocol_versions,
  public.analysis_schema_versions,
  public.analysis_runtime_methodology_bindings,
  public.analysis_runtime_methodology_current
to service_role;

insert into public.analysis_protocol_versions (
  protocol_code,
  version,
  display_name,
  purpose_text,
  source_path,
  content_sha256,
  criticality_code,
  runtime_targets
)
values (
  'arctor_ai_runtime_core',
  1,
  'ARCTor AI Runtime Core Protocol',
  'Non-negotiable methodology for current model-backed ARCTor runtimes.',
  'docs/goal-world/protocols/ARCTOR_AI_RUNTIME_CORE_PROTOCOL_V1.md',
  'CA86813D3493DF764AEC0C95070B282F3964303EA59AB600BDBA0A26F83B5163',
  'critical',
  array['navigator_chat','activity_semantic_preview']::text[]
);

insert into public.analysis_schema_versions (
  schema_code,
  version,
  display_name,
  source_path,
  content_sha256,
  strict_output_required,
  runtime_targets
)
values
(
  'navigator_chat_output',
  1,
  'ARCTor Navigator Chat Output',
  'src/lib/ai/methodology/schemas/navigator-chat-output.v1.schema.json',
  'AE0DD9E042FF3F2617785F45556BC553EB239FB53B9FE620ADE7C440EAED10EF',
  true,
  array['navigator_chat']::text[]
),
(
  'activity_semantic_preview_model_output',
  1,
  'ARCTor Activity Semantic Preview Model Output',
  'src/lib/ai/methodology/schemas/activity-semantic-preview-model-output.v1.schema.json',
  '427F9CE0B52BF526FB876F327B70A4BAC7638EE6F44F753A499CE1C6F454435F',
  true,
  array['activity_semantic_preview']::text[]
),
(
  'ai_methodology_trace',
  1,
  'ARCTor AI Methodology Trace',
  'src/lib/ai/methodology/schemas/ai-methodology-trace.v1.schema.json',
  'CE3650CF86B3879E2B68CD139C4C736D277AFEC82FB42A1F5B7C7DB5BAF35328',
  false,
  array['navigator_chat','activity_semantic_preview']::text[]
);

insert into public.analysis_runtime_methodology_bindings (
  runtime_code,
  binding_version,
  protocol_code,
  protocol_version,
  output_schema_code,
  output_schema_version,
  trace_schema_code,
  trace_schema_version,
  editable_instruction_store_code,
  personal_context_store_code,
  deterministic_rule_registry_codes,
  knowledge_package_codes
)
values
(
  'navigator_chat',
  1,
  'arctor_ai_runtime_core',
  1,
  'navigator_chat_output',
  1,
  'ai_methodology_trace',
  1,
  'ai_processing_instruction_sets',
  'actor_ai_processing_preferences',
  '{}'::text[],
  '{}'::text[]
),
(
  'activity_semantic_preview',
  1,
  'arctor_ai_runtime_core',
  1,
  'activity_semantic_preview_model_output',
  1,
  'ai_methodology_trace',
  1,
  'ai_processing_instruction_sets',
  'actor_ai_processing_preferences',
  array['calendar_ai_rule_preferences']::text[],
  '{}'::text[]
);

insert into public.analysis_runtime_methodology_current (
  runtime_code,
  binding_version
)
values
  ('navigator_chat',1),
  ('activity_semantic_preview',1);

commit;
