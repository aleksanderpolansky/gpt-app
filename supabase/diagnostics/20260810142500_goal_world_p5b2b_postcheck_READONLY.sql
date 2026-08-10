-- P5B2B Methodology Provenance — READ ONLY postcheck

with checks as (
  select 1 as ord, '01_methodology_trace_column_exists'::text as check_name,
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
  select 2, '02_methodology_trace_shape_constraint_exists',
         exists (
           select 1
           from pg_constraint c
           join pg_class t on t.oid=c.conrelid
           join pg_namespace n on n.oid=t.relnamespace
           where n.nspname='public'
             and t.relname='activity_ai_processing_provenance'
             and c.conname='activity_ai_processing_methodology_trace_p5b2_check'
         )

  union all
  select 3, '03_provenance_guard_security_definer',
         exists (
           select 1
           from pg_proc p
           join pg_namespace n on n.oid=p.pronamespace
           where n.nspname='public'
             and p.proname='enforce_activity_ai_processing_provenance_p4a'
             and p.prosecdef
         )

  union all
  select 4, '04_provenance_guard_search_path_locked',
         exists (
           select 1
           from pg_proc p
           join pg_namespace n on n.oid=p.pronamespace
           where n.nspname='public'
             and p.proname='enforce_activity_ai_processing_provenance_p4a'
             and array_to_string(p.proconfig,';')
               like '%search_path=public, pg_temp%'
         )

  union all
  select 5, '05_provenance_insert_trigger_present',
         exists (
           select 1
           from information_schema.triggers
           where event_object_schema='public'
             and event_object_table='activity_ai_processing_provenance'
             and trigger_name='trg_activity_ai_processing_provenance_p4a'
             and event_manipulation='INSERT'
         )

  union all
  select 6, '06_provenance_history_still_immutable',
         (
           select count(*)
           from information_schema.triggers
           where event_object_schema='public'
             and event_object_table='activity_ai_processing_provenance'
             and trigger_name='trg_activity_ai_processing_provenance_immutable_p4a'
             and event_manipulation in ('UPDATE','DELETE')
         )=2

  union all
  select 7, '07_service_role_can_select_provenance',
         has_table_privilege(
           'service_role',
           'public.activity_ai_processing_provenance',
           'SELECT'
         )

  union all
  select 8, '08_service_role_can_insert_provenance',
         has_table_privilege(
           'service_role',
           'public.activity_ai_processing_provenance',
           'INSERT'
         )

  union all
  select 9, '09_browser_roles_cannot_read_provenance',
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

  union all
  select 10, '10_browser_roles_cannot_insert_provenance',
         not has_table_privilege(
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
  select 11, '11_p4a_system_snapshot_column_preserved',
         exists (
           select 1
           from information_schema.columns
           where table_schema='public'
             and table_name='activity_ai_processing_provenance'
             and column_name='system_instruction_snapshot_json'
         )

  union all
  select 12, '12_p4a_actor_snapshot_column_preserved',
         exists (
           select 1
           from information_schema.columns
           where table_schema='public'
             and table_name='activity_ai_processing_provenance'
             and column_name='actor_instruction_snapshot_json'
         )

  union all
  select 13, '13_p4a_external_source_column_preserved',
         exists (
           select 1
           from information_schema.columns
           where table_schema='public'
             and table_name='activity_ai_processing_provenance'
             and column_name='external_source_snapshot_json'
         )

  union all
  select 14, '14_p4a_assumption_column_preserved',
         exists (
           select 1
           from information_schema.columns
           where table_schema='public'
             and table_name='activity_ai_processing_provenance'
             and column_name='inference_assumptions_json'
         )

  union all
  select 15, '15_activity_runtime_binding_still_registered',
         exists (
           select 1
           from public.analysis_runtime_methodology_bindings
           where runtime_code='activity_semantic_preview'
             and binding_version=1
         )

  union all
  select 16, '16_protocol_v1_hash_registry_preserved',
         exists (
           select 1
           from public.analysis_protocol_versions
           where protocol_code='arctor_ai_runtime_core'
             and version=1
             and content_sha256=
               'CA86813D3493DF764AEC0C95070B282F3964303EA59AB600BDBA0A26F83B5163'
         )

  union all
  select 17, '17_activity_schema_v1_hash_registry_preserved',
         exists (
           select 1
           from public.analysis_schema_versions
           where schema_code='activity_semantic_preview_model_output'
             and version=1
             and content_sha256=
               '427F9CE0B52BF526FB876F327B70A4BAC7638EE6F44F753A499CE1C6F454435F'
         )

  union all
  select 18, '18_trace_schema_v1_hash_registry_preserved',
         exists (
           select 1
           from public.analysis_schema_versions
           where schema_code='ai_methodology_trace'
             and version=1
             and content_sha256=
               'CE3650CF86B3879E2B68CD139C4C736D277AFEC82FB42A1F5B7C7DB5BAF35328'
         )

  union all
  select 19, '19_provenance_rows_still_zero_after_schema_apply',
         (select count(*) from public.activity_ai_processing_provenance)=0

  union all
  select 20, '20_rls_still_enabled',
         exists (
           select 1
           from pg_class c
           join pg_namespace n on n.oid=c.relnamespace
           where n.nspname='public'
             and c.relname='activity_ai_processing_provenance'
             and c.relrowsecurity
         )
)
select check_name,passed
from checks
order by ord;
