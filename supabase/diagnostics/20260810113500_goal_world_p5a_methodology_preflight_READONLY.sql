-- P5A Instruction & Methodology Platform v1 — READ ONLY preflight

select '01_p4b_instruction_sets_exists' as check_name,
       to_regclass('public.ai_processing_instruction_sets') is not null as passed
union all
select '02_p4b_instruction_revisions_exists',
       to_regclass('public.ai_processing_instruction_revisions') is not null
union all
select '03_actor_preferences_exists',
       to_regclass('public.actor_ai_processing_preferences') is not null
union all
select '04_actor_preference_revisions_exists',
       to_regclass('public.actor_ai_processing_preference_revisions') is not null
union all
select '05_processing_provenance_exists',
       to_regclass('public.activity_ai_processing_provenance') is not null
union all
select '06_protocol_projection_absent',
       to_regclass('public.analysis_protocol_versions') is null
union all
select '07_schema_projection_absent',
       to_regclass('public.analysis_schema_versions') is null
union all
select '08_runtime_binding_projection_absent',
       to_regclass('public.analysis_runtime_methodology_bindings') is null
union all
select '09_runtime_current_projection_absent',
       to_regclass('public.analysis_runtime_methodology_current') is null
union all
select '10_p4b_instruction_state_preserved',
       (select count(*) from public.ai_processing_instruction_sets) = 1
union all
select '11_p4b_instruction_history_preserved',
       (select count(*) from public.ai_processing_instruction_revisions) = 1
union all
select '12_actor_rule_state_preserved',
       (select count(*) from public.actor_ai_processing_preferences) = 1
union all
select '13_actor_rule_history_preserved',
       (select count(*) from public.actor_ai_processing_preference_revisions) = 2
union all
select '14_processing_provenance_clean',
       (select count(*) from public.activity_ai_processing_provenance) = 0;
