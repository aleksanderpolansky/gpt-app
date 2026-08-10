-- P5A Instruction & Methodology Platform v1 — READ ONLY postcheck

with checks as (
  select 1 as ord, '01_protocol_projection_exists'::text as check_name,
         to_regclass('public.analysis_protocol_versions') is not null as passed
  union all
  select 2, '02_schema_projection_exists',
         to_regclass('public.analysis_schema_versions') is not null
  union all
  select 3, '03_runtime_bindings_exists',
         to_regclass('public.analysis_runtime_methodology_bindings') is not null
  union all
  select 4, '04_runtime_current_exists',
         to_regclass('public.analysis_runtime_methodology_current') is not null
  union all
  select 5, '05_one_core_protocol_seed',
         (select count(*) from public.analysis_protocol_versions
          where protocol_code='arctor_ai_runtime_core'
            and version=1
            and content_sha256='CA86813D3493DF764AEC0C95070B282F3964303EA59AB600BDBA0A26F83B5163') = 1
  union all
  select 6, '06_three_schema_versions_seeded',
         (select count(*) from public.analysis_schema_versions) = 3
  union all
  select 7, '07_schema_hashes_match_source',
         (select count(*) from public.analysis_schema_versions
          where (schema_code='navigator_chat_output' and version=1 and content_sha256='AE0DD9E042FF3F2617785F45556BC553EB239FB53B9FE620ADE7C440EAED10EF')
             or (schema_code='activity_semantic_preview_model_output' and version=1 and content_sha256='427F9CE0B52BF526FB876F327B70A4BAC7638EE6F44F753A499CE1C6F454435F')
             or (schema_code='ai_methodology_trace' and version=1 and content_sha256='CE3650CF86B3879E2B68CD139C4C736D277AFEC82FB42A1F5B7C7DB5BAF35328')
         ) = 3
  union all
  select 8, '08_two_runtime_bindings_seeded',
         (select count(*) from public.analysis_runtime_methodology_bindings) = 2
  union all
  select 9, '09_two_current_bindings_seeded',
         (select count(*) from public.analysis_runtime_methodology_current) = 2
  union all
  select 10, '10_navigator_binding_correct',
         exists (
           select 1
           from public.analysis_runtime_methodology_bindings b
           join public.analysis_runtime_methodology_current c
             on c.runtime_code=b.runtime_code
            and c.binding_version=b.binding_version
           where b.runtime_code='navigator_chat'
             and b.protocol_code='arctor_ai_runtime_core'
             and b.protocol_version=1
             and b.output_schema_code='navigator_chat_output'
             and b.output_schema_version=1
             and b.trace_schema_code='ai_methodology_trace'
             and b.trace_schema_version=1
             and cardinality(b.deterministic_rule_registry_codes)=0
             and cardinality(b.knowledge_package_codes)=0
         )
  union all
  select 11, '11_activity_preview_binding_correct',
         exists (
           select 1
           from public.analysis_runtime_methodology_bindings b
           join public.analysis_runtime_methodology_current c
             on c.runtime_code=b.runtime_code
            and c.binding_version=b.binding_version
           where b.runtime_code='activity_semantic_preview'
             and b.protocol_code='arctor_ai_runtime_core'
             and b.protocol_version=1
             and b.output_schema_code='activity_semantic_preview_model_output'
             and b.output_schema_version=1
             and b.trace_schema_code='ai_methodology_trace'
             and b.trace_schema_version=1
             and b.deterministic_rule_registry_codes=array['calendar_ai_rule_preferences']::text[]
             and cardinality(b.knowledge_package_codes)=0
         )
  union all
  select 12, '12_service_role_protocol_select_only',
         has_table_privilege('service_role','public.analysis_protocol_versions','SELECT')
         and not has_table_privilege('service_role','public.analysis_protocol_versions','INSERT')
         and not has_table_privilege('service_role','public.analysis_protocol_versions','UPDATE')
         and not has_table_privilege('service_role','public.analysis_protocol_versions','DELETE')
  union all
  select 13, '13_service_role_schema_select_only',
         has_table_privilege('service_role','public.analysis_schema_versions','SELECT')
         and not has_table_privilege('service_role','public.analysis_schema_versions','INSERT')
         and not has_table_privilege('service_role','public.analysis_schema_versions','UPDATE')
         and not has_table_privilege('service_role','public.analysis_schema_versions','DELETE')
  union all
  select 14, '14_service_role_binding_select_only',
         has_table_privilege('service_role','public.analysis_runtime_methodology_bindings','SELECT')
         and not has_table_privilege('service_role','public.analysis_runtime_methodology_bindings','INSERT')
         and not has_table_privilege('service_role','public.analysis_runtime_methodology_bindings','UPDATE')
         and not has_table_privilege('service_role','public.analysis_runtime_methodology_bindings','DELETE')
  union all
  select 15, '15_browser_roles_no_methodology_table_access',
         not has_table_privilege('anon','public.analysis_protocol_versions','SELECT')
         and not has_table_privilege('authenticated','public.analysis_protocol_versions','SELECT')
         and not has_table_privilege('anon','public.analysis_schema_versions','SELECT')
         and not has_table_privilege('authenticated','public.analysis_schema_versions','SELECT')
         and not has_table_privilege('anon','public.analysis_runtime_methodology_bindings','SELECT')
         and not has_table_privilege('authenticated','public.analysis_runtime_methodology_bindings','SELECT')
  union all
  select 16, '16_rls_enabled_on_all_p5a_tables',
         (select count(*) from pg_class c
          join pg_namespace n on n.oid=c.relnamespace
          where n.nspname='public'
            and c.relname in (
              'analysis_protocol_versions',
              'analysis_schema_versions',
              'analysis_runtime_methodology_bindings',
              'analysis_runtime_methodology_current'
            )
            and c.relrowsecurity) = 4
  union all
  select 17, '17_p4b_instruction_state_preserved',
         (select count(*) from public.ai_processing_instruction_sets)=1
         and (select count(*) from public.ai_processing_instruction_revisions)=1
  union all
  select 18, '18_actor_rule_state_preserved',
         (select count(*) from public.actor_ai_processing_preferences)=1
         and (select count(*) from public.actor_ai_processing_preference_revisions)=2
  union all
  select 19, '19_processing_provenance_preserved',
         (select count(*) from public.activity_ai_processing_provenance)=0
  union all
  select 20, '20_p5a_projection_has_no_runtime_write_surface',
         not exists (
           select 1
           from information_schema.role_table_grants
           where table_schema='public'
             and table_name in (
               'analysis_protocol_versions',
               'analysis_schema_versions',
               'analysis_runtime_methodology_bindings',
               'analysis_runtime_methodology_current'
             )
             and grantee in ('anon','authenticated','service_role')
             and privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER')
         )
)
select check_name, passed
from checks
order by ord;
