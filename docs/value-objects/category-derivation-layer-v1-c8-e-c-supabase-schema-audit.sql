-- GPT-APP / AI-NAVIGATOR
-- P4.10.0-C8-E-C — Category Derivation Layer v1 Supabase schema audit
-- READ-ONLY SQL.
--
-- Run only in Supabase SQL Editor.
-- Do not run in PowerShell.
-- This file must not mutate data or schema.
--
-- Purpose:
-- 1. Check exact table existence.
-- 2. Check exact columns for Category Derivation Layer v1.
-- 3. Check constraints, foreign keys, indexes and RLS policies.
-- 4. Produce evidence for C8-E-D additive migration design.
--
-- Important:
-- This is an audit only. No CREATE / ALTER / DROP / INSERT / UPDATE / DELETE.

with target_tables(table_name, priority) as (
  values
    ('activity_events', 10),
    ('contextual_categories', 20),
    ('contextual_category_events', 30),
    ('category_derivation_runs', 40),
    ('activity_category_derivations', 50),
    ('activity_semantic_interpretations', 60),
    ('category_moderation_items', 70),
    ('activity_category_corrections', 80),
    ('value_objects', 90),
    ('value_object_category_links', 100),
    ('activity_event_value_object_links', 110),
    ('activity_processing_logs', 120),
    ('value_object_instances', 130),
    ('value_object_state_deltas', 140),
    ('value_object_daily_aggregates', 150),
    ('value_object_state_snapshots', 160),
    ('value_object_usage_aggregates', 170)
),
expected_columns(table_name, column_name, importance) as (
  values
    -- contextual_categories target contract
    ('contextual_categories', 'id', 'required'),
    ('contextual_categories', 'slug', 'required'),
    ('contextual_categories', 'name', 'required_or_title'),
    ('contextual_categories', 'title', 'required_or_name'),
    ('contextual_categories', 'description', 'optional'),
    ('contextual_categories', 'semantic_layer', 'required_for_v1'),
    ('contextual_categories', 'category_type', 'required_for_v1'),
    ('contextual_categories', 'status', 'required_for_governance'),
    ('contextual_categories', 'context_id', 'existing_runtime_relevant'),
    ('contextual_categories', 'context_scope', 'optional_target'),
    ('contextual_categories', 'parent_category_id', 'parent_child'),
    ('contextual_categories', 'aliases', 'optional'),
    ('contextual_categories', 'aliases_json', 'optional'),
    ('contextual_categories', 'metadata_json', 'optional_target'),
    ('contextual_categories', 'source_type', 'optional_target'),
    ('contextual_categories', 'confidence_default', 'optional_target'),
    ('contextual_categories', 'created_at', 'recommended'),
    ('contextual_categories', 'updated_at', 'recommended'),

    -- category_derivation_runs target contract
    ('category_derivation_runs', 'id', 'required'),
    ('category_derivation_runs', 'activity_event_id', 'required'),
    ('category_derivation_runs', 'input_hash', 'required_for_reuse'),
    ('category_derivation_runs', 'processor_version', 'required'),
    ('category_derivation_runs', 'rule_version', 'required'),
    ('category_derivation_runs', 'model_name', 'required_for_ai'),
    ('category_derivation_runs', 'model_version', 'check_only_do_not_force'),
    ('category_derivation_runs', 'model_alias', 'optional_for_routing'),
    ('category_derivation_runs', 'prompt_version', 'required_for_ai'),
    ('category_derivation_runs', 'schema_version', 'recommended_for_structured_output'),
    ('category_derivation_runs', 'policy_version', 'required_for_governance'),
    ('category_derivation_runs', 'status', 'required'),
    ('category_derivation_runs', 'started_at', 'required'),
    ('category_derivation_runs', 'finished_at', 'recommended'),
    ('category_derivation_runs', 'input_summary_json', 'recommended'),
    ('category_derivation_runs', 'output_summary_json', 'recommended'),
    ('category_derivation_runs', 'token_usage_json', 'recommended_for_cost_control'),
    ('category_derivation_runs', 'cost_json', 'recommended_for_cost_control'),
    ('category_derivation_runs', 'error_json', 'recommended'),
    ('category_derivation_runs', 'created_at', 'recommended'),
    ('category_derivation_runs', 'updated_at', 'recommended'),

    -- activity_category_derivations target contract
    ('activity_category_derivations', 'id', 'required'),
    ('activity_category_derivations', 'activity_event_id', 'required'),
    ('activity_category_derivations', 'derivation_run_id', 'required'),
    ('activity_category_derivations', 'category_id', 'nullable_until_resolved'),
    ('activity_category_derivations', 'candidate_slug', 'required'),
    ('activity_category_derivations', 'candidate_title', 'recommended'),
    ('activity_category_derivations', 'semantic_layer', 'required'),
    ('activity_category_derivations', 'category_type', 'required'),
    ('activity_category_derivations', 'source', 'required'),
    ('activity_category_derivations', 'confidence', 'required'),
    ('activity_category_derivations', 'status', 'required'),
    ('activity_category_derivations', 'is_required', 'required'),
    ('activity_category_derivations', 'is_core_meaning', 'recommended'),
    ('activity_category_derivations', 'is_confirmed', 'required'),
    ('activity_category_derivations', 'is_revoked', 'required'),
    ('activity_category_derivations', 'evidence_json', 'recommended'),
    ('activity_category_derivations', 'created_at', 'recommended'),
    ('activity_category_derivations', 'updated_at', 'recommended'),

    -- activity_semantic_interpretations target contract
    ('activity_semantic_interpretations', 'id', 'required'),
    ('activity_semantic_interpretations', 'activity_event_id', 'required'),
    ('activity_semantic_interpretations', 'derivation_run_id', 'required'),
    ('activity_semantic_interpretations', 'interpretation_json', 'required'),
    ('activity_semantic_interpretations', 'possible_meanings_json', 'recommended'),
    ('activity_semantic_interpretations', 'normalized_activity', 'recommended'),
    ('activity_semantic_interpretations', 'overall_confidence', 'recommended'),
    ('activity_semantic_interpretations', 'needs_user_confirmation', 'recommended'),
    ('activity_semantic_interpretations', 'final_decision', 'recommended'),
    ('activity_semantic_interpretations', 'created_at', 'recommended'),

    -- category_moderation_items target contract
    ('category_moderation_items', 'id', 'required'),
    ('category_moderation_items', 'category_id', 'required'),
    ('category_moderation_items', 'derivation_id', 'recommended'),
    ('category_moderation_items', 'reason', 'required'),
    ('category_moderation_items', 'status', 'required'),
    ('category_moderation_items', 'decision', 'recommended'),
    ('category_moderation_items', 'decision_by', 'recommended'),
    ('category_moderation_items', 'decision_at', 'recommended'),
    ('category_moderation_items', 'created_at', 'recommended'),

    -- activity_category_corrections target contract
    ('activity_category_corrections', 'id', 'required'),
    ('activity_category_corrections', 'activity_event_id', 'required'),
    ('activity_category_corrections', 'category_id', 'required'),
    ('activity_category_corrections', 'action', 'required'),
    ('activity_category_corrections', 'previous_status', 'recommended'),
    ('activity_category_corrections', 'new_status', 'recommended'),
    ('activity_category_corrections', 'reason', 'optional'),
    ('activity_category_corrections', 'actor_id', 'recommended'),
    ('activity_category_corrections', 'created_at', 'recommended'),

    -- value_object_category_links target contract
    ('value_object_category_links', 'id', 'recommended'),
    ('value_object_category_links', 'value_object_id', 'required'),
    ('value_object_category_links', 'category_id', 'required'),
    ('value_object_category_links', 'category_role', 'recommended'),
    ('value_object_category_links', 'is_primary', 'existing_possible'),
    ('value_object_category_links', 'source', 'required'),
    ('value_object_category_links', 'confidence', 'required'),
    ('value_object_category_links', 'derivation_run_id', 'recommended'),
    ('value_object_category_links', 'activity_derivation_id', 'recommended'),
    ('value_object_category_links', 'status', 'recommended'),
    ('value_object_category_links', 'metadata_json', 'recommended'),
    ('value_object_category_links', 'created_at', 'recommended'),

    -- activity_event_value_object_links target contract
    ('activity_event_value_object_links', 'id', 'recommended'),
    ('activity_event_value_object_links', 'event_id', 'existing_possible'),
    ('activity_event_value_object_links', 'source_event_id', 'existing_possible'),
    ('activity_event_value_object_links', 'activity_event_id', 'target_possible'),
    ('activity_event_value_object_links', 'activity_id', 'existing_possible'),
    ('activity_event_value_object_links', 'activity_record_id', 'existing_possible'),
    ('activity_event_value_object_links', 'value_object_id', 'required'),
    ('activity_event_value_object_links', 'exposure_minutes', 'required'),
    ('activity_event_value_object_links', 'confidence', 'recommended'),
    ('activity_event_value_object_links', 'source', 'required'),
    ('activity_event_value_object_links', 'metadata_json', 'recommended'),
    ('activity_event_value_object_links', 'created_at', 'recommended')
)
select
  '01_table_existence' as section,
  jsonb_build_object(
    'table_name', tt.table_name,
    'priority', tt.priority,
    'exists', c.oid is not null,
    'relkind', c.relkind,
    'rls_enabled', c.relrowsecurity,
    'rls_forced', c.relforcerowsecurity
  ) as record_json
from target_tables tt
left join pg_class c
  on c.oid = to_regclass('public.' || quote_ident(tt.table_name))

union all

select
  '02_actual_columns' as section,
  jsonb_build_object(
    'table_name', c.table_name,
    'column_name', c.column_name,
    'ordinal_position', c.ordinal_position,
    'data_type', c.data_type,
    'udt_name', c.udt_name,
    'is_nullable', c.is_nullable,
    'column_default', c.column_default,
    'character_maximum_length', c.character_maximum_length,
    'numeric_precision', c.numeric_precision,
    'numeric_scale', c.numeric_scale
  ) as record_json
from information_schema.columns c
join target_tables tt
  on tt.table_name = c.table_name
where c.table_schema = 'public'

union all

select
  '03_expected_column_matrix' as section,
  jsonb_build_object(
    'table_name', ec.table_name,
    'column_name', ec.column_name,
    'importance', ec.importance,
    'exists', c.column_name is not null,
    'actual_data_type', c.data_type,
    'actual_udt_name', c.udt_name,
    'actual_is_nullable', c.is_nullable,
    'actual_default', c.column_default
  ) as record_json
from expected_columns ec
left join information_schema.columns c
  on c.table_schema = 'public'
 and c.table_name = ec.table_name
 and c.column_name = ec.column_name

union all

select
  '04_constraints' as section,
  jsonb_build_object(
    'table_name', cls.relname,
    'constraint_name', con.conname,
    'constraint_type', con.contype,
    'definition', pg_get_constraintdef(con.oid)
  ) as record_json
from pg_constraint con
join pg_class cls
  on cls.oid = con.conrelid
join pg_namespace nsp
  on nsp.oid = cls.relnamespace
join target_tables tt
  on tt.table_name = cls.relname
where nsp.nspname = 'public'

union all

select
  '05_indexes' as section,
  jsonb_build_object(
    'table_name', idx.tablename,
    'index_name', idx.indexname,
    'index_definition', idx.indexdef
  ) as record_json
from pg_indexes idx
join target_tables tt
  on tt.table_name = idx.tablename
where idx.schemaname = 'public'

union all

select
  '06_rls_policies' as section,
  jsonb_build_object(
    'table_name', p.tablename,
    'policy_name', p.policyname,
    'permissive', p.permissive,
    'roles', p.roles,
    'cmd', p.cmd,
    'qual', p.qual,
    'with_check', p.with_check
  ) as record_json
from pg_policies p
join target_tables tt
  on tt.table_name = p.tablename
where p.schemaname = 'public'

union all

select
  '07_triggers' as section,
  jsonb_build_object(
    'table_name', event_object_table,
    'trigger_name', trigger_name,
    'event_manipulation', event_manipulation,
    'action_timing', action_timing,
    'action_statement', action_statement
  ) as record_json
from information_schema.triggers tr
join target_tables tt
  on tt.table_name = tr.event_object_table
where tr.trigger_schema = 'public'

union all

select
  '08_candidate_status_columns' as section,
  jsonb_build_object(
    'table_name', c.table_name,
    'column_name', c.column_name,
    'data_type', c.data_type,
    'udt_name', c.udt_name,
    'is_nullable', c.is_nullable,
    'default', c.column_default
  ) as record_json
from information_schema.columns c
where c.table_schema = 'public'
  and (
    c.column_name ilike '%status%'
    or c.column_name ilike '%source%'
    or c.column_name ilike '%confidence%'
    or c.column_name ilike '%version%'
    or c.column_name ilike '%policy%'
    or c.column_name ilike '%prompt%'
    or c.column_name ilike '%model%'
    or c.column_name ilike '%semantic%'
    or c.column_name ilike '%category%'
  )
  and (
    c.table_name in (select table_name from target_tables)
    or c.table_name ilike '%category%'
    or c.table_name ilike '%value_object%'
    or c.table_name ilike '%activity%'
  )

order by section, record_json::text;