-- P5B2B Methodology Provenance — READ ONLY preflight

select '01_provenance_table_exists' as check_name,
       to_regclass('public.activity_ai_processing_provenance') is not null as passed
union all
select '02_semantic_run_table_exists',
       to_regclass('public.activity_semantic_enrichment_runs_cux4') is not null
union all
select '03_protocol_registry_exists',
       to_regclass('public.analysis_protocol_versions') is not null
union all
select '04_schema_registry_exists',
       to_regclass('public.analysis_schema_versions') is not null
union all
select '05_binding_registry_exists',
       to_regclass('public.analysis_runtime_methodology_bindings') is not null
union all
select '06_methodology_trace_column_absent',
       not exists (
         select 1
         from information_schema.columns
         where table_schema='public'
           and table_name='activity_ai_processing_provenance'
           and column_name='methodology_trace_json'
       )
union all
select '07_existing_provenance_rows_zero',
       (select count(*) from public.activity_ai_processing_provenance)=0
union all
select '08_activity_binding_registered',
       exists (
         select 1
         from public.analysis_runtime_methodology_bindings
         where runtime_code='activity_semantic_preview'
           and binding_version=1
       );
