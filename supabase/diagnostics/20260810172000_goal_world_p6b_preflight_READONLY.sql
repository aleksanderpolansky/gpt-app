-- ARCTor P6B Goal Intake methodology registry preflight — READ ONLY
select '01_p5_protocol_registry_exists' as check_name,
       to_regclass('public.analysis_protocol_versions') is not null as passed,
       null::text as detail
union all
select '02_p5_schema_registry_exists',
       to_regclass('public.analysis_schema_versions') is not null,
       null
union all
select '03_p5_binding_registry_exists',
       to_regclass('public.analysis_runtime_methodology_bindings') is not null,
       null
union all
select '04_goal_intake_binding_absent',
       not exists (
         select 1 from public.analysis_runtime_methodology_bindings
         where runtime_code='goal_intake'
       ),
       null
union all
select '05_goal_intake_protocol_absent',
       not exists (
         select 1 from public.analysis_protocol_versions
         where protocol_code='goal_intake_protocol' and version=1
       ),
       null
union all
select '06_goal_intake_schema_absent',
       not exists (
         select 1 from public.analysis_schema_versions
         where schema_code='goal_intake_definition' and version=1
       ),
       null;
