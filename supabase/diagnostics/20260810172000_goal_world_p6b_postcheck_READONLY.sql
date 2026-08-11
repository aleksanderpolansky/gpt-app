-- ARCTor P6B Goal Intake methodology registry postcheck — READ ONLY
select '01_supporting_protocol_refs_column' as check_name,
       exists (
         select 1 from information_schema.columns
         where table_schema='public'
           and table_name='analysis_runtime_methodology_bindings'
           and column_name='supporting_protocol_refs'
           and data_type='jsonb'
           and is_nullable='NO'
       ) as passed,
       null::text as detail
union all
select '02_goal_intake_protocol_registered',
       exists (
         select 1 from public.analysis_protocol_versions
         where protocol_code='goal_intake_protocol'
           and version=1
           and content_sha256='47D4FB11C815B95371F6BC2A000F8A89819B9126831F652718B1E6E8EBFBE85C'
       ), null
union all
select '03_reality_snapshot_protocol_registered',
       exists (
         select 1 from public.analysis_protocol_versions
         where protocol_code='reality_context_snapshot'
           and version=1
           and content_sha256='11E25999A91A3EA36C442F0E0819F3F550C19DAF323396FB5233B5B0C50FD38D'
       ), null
union all
select '04_goal_intake_output_schema_registered',
       exists (
         select 1 from public.analysis_schema_versions
         where schema_code='goal_intake_definition'
           and version=1
           and strict_output_required
           and content_sha256='D814F94B539E13055C1462564A90676E09598BEB09E9E418B31F293ACA73C845'
       ), null
union all
select '05_trace_v2_registered',
       exists (
         select 1 from public.analysis_schema_versions
         where schema_code='ai_methodology_trace'
           and version=2
           and content_sha256='A7C7F264A0D5CD7E609A5188343B06B07807C00E35D13CCBA103B537C65EEC33'
       ), null
union all
select '06_goal_intake_binding_registered',
       exists (
         select 1 from public.analysis_runtime_methodology_bindings
         where runtime_code='goal_intake'
           and binding_version=1
           and protocol_code='arctor_ai_runtime_core'
           and output_schema_code='goal_intake_definition'
           and trace_schema_code='ai_methodology_trace'
           and trace_schema_version=2
       ), null
union all
select '07_supporting_protocol_count_two',
       exists (
         select 1 from public.analysis_runtime_methodology_bindings
         where runtime_code='goal_intake'
           and binding_version=1
           and jsonb_array_length(supporting_protocol_refs)=2
       ), null
union all
select '08_deterministic_registries_exact',
       exists (
         select 1 from public.analysis_runtime_methodology_bindings
         where runtime_code='goal_intake'
           and binding_version=1
           and deterministic_rule_registry_codes=
             array['goal_intake_registry','reality_context_policy']::text[]
       ), null
union all
select '09_current_binding_goal_intake',
       exists (
         select 1 from public.analysis_runtime_methodology_current
         where runtime_code='goal_intake'
           and binding_version=1
       ), null
union all
select '10_core_protocol_targets_goal_intake',
       exists (
         select 1 from public.analysis_protocol_versions
         where protocol_code='arctor_ai_runtime_core'
           and version=1
           and 'goal_intake'=any(runtime_targets)
       ), null
union all
select '11_service_role_can_read_bindings',
       has_table_privilege(
         'service_role',
         'public.analysis_runtime_methodology_bindings',
         'SELECT'
       ), null
union all
select '12_anon_cannot_read_bindings',
       not has_table_privilege(
         'anon',
         'public.analysis_runtime_methodology_bindings',
         'SELECT'
       ), null
union all
select '13_authenticated_cannot_read_bindings',
       not has_table_privilege(
         'authenticated',
         'public.analysis_runtime_methodology_bindings',
         'SELECT'
       ), null
union all
select '14_binding_rls_enabled',
       coalesce((
         select relrowsecurity
         from pg_class
         where oid='public.analysis_runtime_methodology_bindings'::regclass
       ),false), null;
