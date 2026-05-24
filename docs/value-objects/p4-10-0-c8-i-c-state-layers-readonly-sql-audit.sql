-- GPT-APP / AI-NAVIGATOR
-- P4.10.0-C8-I-C — Read-only Supabase SQL Audit for State Layers
--
-- Date: 2026-05-24
-- Status: READ-ONLY SQL AUDIT FILE
-- Previous step: P4.10.0-C8-I-B
-- Previous commit: d7a5db4
--
-- IMPORTANT:
-- This file is for Supabase SQL Editor.
-- It must be read-only.
-- It must not create, alter, drop, update, insert or delete anything.
--
-- Goal:
-- Inspect existing tables, columns, indexes, policies, functions and triggers
-- relevant to future state layers.

select
  'P4.10.0-C8-I-C' as audit_step,
  'Read-only Supabase SQL audit for future state layers' as purpose,
  now() as executed_at;

-- ============================================================
-- 1. Relevant existing tables
-- ============================================================

select
  '01_relevant_existing_tables' as section,
  table_schema,
  table_name,
  table_type
from information_schema.tables
where table_schema not in ('pg_catalog', 'information_schema')
  and (
    table_name ~* 'activity'
    or table_name ~* 'activities'
    or table_name ~* 'value_object'
    or table_name ~* 'category'
    or table_name ~* 'categories'
    or table_name ~* 'derivation'
    or table_name ~* 'organization'
    or table_name ~* 'offer'
    or table_name ~* 'purchase'
    or table_name ~* 'certificate'
    or table_name ~* 'booking'
    or table_name ~* 'point'
    or table_name ~* 'calendar'
    or table_name ~* 'time_block'
    or table_name ~* 'availability'
    or table_name ~* 'participant'
    or table_name ~* 'actor'
    or table_name ~* 'correction'
    or table_name ~* 'feedback'
    or table_name ~* 'state'
    or table_name ~* 'similarity'
    or table_name ~* 'relevance'
  )
order by table_schema, table_name;

-- ============================================================
-- 2. Relevant existing columns
-- ============================================================

select
  '02_relevant_existing_columns' as section,
  table_schema,
  table_name,
  ordinal_position,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema not in ('pg_catalog', 'information_schema')
  and (
    table_name ~* 'activity'
    or table_name ~* 'activities'
    or table_name ~* 'value_object'
    or table_name ~* 'category'
    or table_name ~* 'categories'
    or table_name ~* 'derivation'
    or table_name ~* 'organization'
    or table_name ~* 'offer'
    or table_name ~* 'purchase'
    or table_name ~* 'certificate'
    or table_name ~* 'booking'
    or table_name ~* 'point'
    or table_name ~* 'calendar'
    or table_name ~* 'time_block'
    or table_name ~* 'availability'
    or table_name ~* 'participant'
    or table_name ~* 'actor'
    or table_name ~* 'correction'
    or table_name ~* 'feedback'
    or table_name ~* 'state'
    or table_name ~* 'similarity'
    or table_name ~* 'relevance'
  )
order by table_schema, table_name, ordinal_position;

-- ============================================================
-- 3. Future state tables existence check
-- ============================================================

with expected_tables(table_name, purpose) as (
  values
    ('state_dimensions', 'Dictionary of state dimensions'),
    ('value_object_state_facts', 'Stable or semi-stable state facts'),
    ('activity_state_deltas', 'State changes caused or likely caused by activity'),
    ('value_object_state_snapshots', 'Aggregated state values by window'),
    ('state_relevance_rules', 'Rules defining which states influence which targets'),
    ('value_object_similarity_edges', 'Precomputed semantic similarity between VOs'),
    ('value_object_relevance_edges', 'Precomputed or user-adjusted relevance between VOs'),
    ('recommendation_feedback', 'Feedback for future recommendation quality')
)
select
  '03_future_state_tables_existence_check' as section,
  e.table_name as expected_table,
  e.purpose,
  case when t.table_name is null then 'MISSING' else 'EXISTS' end as status,
  t.table_schema
from expected_tables e
left join information_schema.tables t
  on t.table_schema = 'public'
 and t.table_name = e.table_name
order by e.table_name;

-- ============================================================
-- 4. Future state columns readiness matrix
-- ============================================================

with required_columns(table_name, column_name) as (
  values
    ('state_dimensions', 'id'),
    ('state_dimensions', 'dimension_key'),
    ('state_dimensions', 'title'),
    ('state_dimensions', 'domain'),
    ('state_dimensions', 'description'),
    ('state_dimensions', 'unit_type'),
    ('state_dimensions', 'default_privacy_level'),
    ('state_dimensions', 'claim_policy'),
    ('state_dimensions', 'mvp_status'),
    ('state_dimensions', 'allowed_source_types'),
    ('state_dimensions', 'forbidden_claims'),
    ('state_dimensions', 'safer_proxy_wording'),
    ('state_dimensions', 'is_sensitive'),
    ('state_dimensions', 'is_active'),
    ('state_dimensions', 'created_at'),
    ('state_dimensions', 'updated_at'),

    ('value_object_state_facts', 'id'),
    ('value_object_state_facts', 'value_object_id'),
    ('value_object_state_facts', 'dimension_id'),
    ('value_object_state_facts', 'value_json'),
    ('value_object_state_facts', 'source_type'),
    ('value_object_state_facts', 'source_id'),
    ('value_object_state_facts', 'confidence'),
    ('value_object_state_facts', 'evidence_json'),
    ('value_object_state_facts', 'claim_strength'),
    ('value_object_state_facts', 'privacy_level'),
    ('value_object_state_facts', 'valid_from'),
    ('value_object_state_facts', 'valid_to'),
    ('value_object_state_facts', 'correction_status'),
    ('value_object_state_facts', 'created_at'),
    ('value_object_state_facts', 'updated_at'),

    ('activity_state_deltas', 'id'),
    ('activity_state_deltas', 'activity_event_id'),
    ('activity_state_deltas', 'value_object_id'),
    ('activity_state_deltas', 'direction_key'),
    ('activity_state_deltas', 'dimension_id'),
    ('activity_state_deltas', 'direction'),
    ('activity_state_deltas', 'magnitude'),
    ('activity_state_deltas', 'value_json'),
    ('activity_state_deltas', 'derivation_run_id'),
    ('activity_state_deltas', 'confidence'),
    ('activity_state_deltas', 'evidence_json'),
    ('activity_state_deltas', 'claim_strength'),
    ('activity_state_deltas', 'proxy_only'),
    ('activity_state_deltas', 'created_at'),

    ('value_object_state_snapshots', 'id'),
    ('value_object_state_snapshots', 'value_object_id'),
    ('value_object_state_snapshots', 'direction_key'),
    ('value_object_state_snapshots', 'dimension_id'),
    ('value_object_state_snapshots', 'window_type'),
    ('value_object_state_snapshots', 'window_start'),
    ('value_object_state_snapshots', 'window_end'),
    ('value_object_state_snapshots', 'value_json'),
    ('value_object_state_snapshots', 'aggregation_method'),
    ('value_object_state_snapshots', 'confidence'),
    ('value_object_state_snapshots', 'freshness'),
    ('value_object_state_snapshots', 'recalculation_source'),
    ('value_object_state_snapshots', 'created_at'),

    ('state_relevance_rules', 'id'),
    ('state_relevance_rules', 'target_category_id'),
    ('state_relevance_rules', 'target_value_object_id'),
    ('state_relevance_rules', 'target_direction_key'),
    ('state_relevance_rules', 'source_dimension_id'),
    ('state_relevance_rules', 'relation'),
    ('state_relevance_rules', 'relevance_weight'),
    ('state_relevance_rules', 'explanation'),
    ('state_relevance_rules', 'safety_policy'),
    ('state_relevance_rules', 'is_active'),
    ('state_relevance_rules', 'created_at'),

    ('value_object_similarity_edges', 'id'),
    ('value_object_similarity_edges', 'source_value_object_id'),
    ('value_object_similarity_edges', 'target_value_object_id'),
    ('value_object_similarity_edges', 'similarity_score'),
    ('value_object_similarity_edges', 'shared_category_ids'),
    ('value_object_similarity_edges', 'method'),
    ('value_object_similarity_edges', 'explanation'),
    ('value_object_similarity_edges', 'computed_at'),

    ('value_object_relevance_edges', 'id'),
    ('value_object_relevance_edges', 'source_value_object_id'),
    ('value_object_relevance_edges', 'target_value_object_id'),
    ('value_object_relevance_edges', 'relevance_score'),
    ('value_object_relevance_edges', 'relation_category'),
    ('value_object_relevance_edges', 'confidence'),
    ('value_object_relevance_edges', 'evidence_json'),
    ('value_object_relevance_edges', 'feedback_source'),
    ('value_object_relevance_edges', 'computed_at'),

    ('recommendation_feedback', 'id'),
    ('recommendation_feedback', 'user_id'),
    ('recommendation_feedback', 'recommendation_id'),
    ('recommendation_feedback', 'context_package_id'),
    ('recommendation_feedback', 'selected_direction'),
    ('recommendation_feedback', 'candidate_action'),
    ('recommendation_feedback', 'feedback_type'),
    ('recommendation_feedback', 'reason'),
    ('recommendation_feedback', 'difficulty'),
    ('recommendation_feedback', 'helped'),
    ('recommendation_feedback', 'created_at')
)
select
  '04_future_state_columns_readiness_matrix' as section,
  r.table_name,
  r.column_name,
  case when c.column_name is null then 'MISSING' else 'EXISTS' end as status,
  c.data_type,
  c.udt_name,
  c.is_nullable
from required_columns r
left join information_schema.columns c
  on c.table_schema = 'public'
 and c.table_name = r.table_name
 and c.column_name = r.column_name
order by r.table_name, r.column_name;

-- ============================================================
-- 5. Potential state-like existing structures
-- ============================================================

select
  '05_potential_state_like_existing_columns' as section,
  table_schema,
  table_name,
  column_name,
  data_type,
  udt_name
from information_schema.columns
where table_schema not in ('pg_catalog', 'information_schema')
  and (
    table_name ~* 'state'
    or table_name ~* 'snapshot'
    or table_name ~* 'delta'
    or table_name ~* 'similarity'
    or table_name ~* 'relevance'
    or table_name ~* 'recommendation'
    or table_name ~* 'feedback'
    or column_name ~* 'state'
    or column_name ~* 'snapshot'
    or column_name ~* 'delta'
    or column_name ~* 'confidence'
    or column_name ~* 'evidence'
    or column_name ~* 'similarity'
    or column_name ~* 'relevance'
    or column_name ~* 'recommendation'
  )
order by table_schema, table_name, ordinal_position;

-- ============================================================
-- 6. Value Object subtype risk audit
-- ============================================================

select
  '06_value_object_subtype_risk_audit' as section,
  table_schema,
  table_name,
  column_name,
  data_type,
  udt_name
from information_schema.columns
where table_schema not in ('pg_catalog', 'information_schema')
  and table_name ~* 'value_object'
  and (
    column_name ~* 'kind'
    or column_name ~* 'type'
    or column_name ~* 'subtype'
    or column_name ~* 'visibility'
    or column_name ~* 'privacy'
    or column_name ~* 'owner'
    or column_name ~* 'actor'
    or column_name ~* 'organization'
    or column_name ~* 'user'
    or column_name ~* 'parent'
  )
order by table_schema, table_name, ordinal_position;

-- ============================================================
-- 7. Existing indexes relevant to state layer design
-- ============================================================

select
  '07_relevant_indexes' as section,
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname not in ('pg_catalog', 'information_schema')
  and (
    tablename ~* 'activity'
    or tablename ~* 'activities'
    or tablename ~* 'value_object'
    or tablename ~* 'category'
    or tablename ~* 'categories'
    or tablename ~* 'derivation'
    or tablename ~* 'organization'
    or tablename ~* 'offer'
    or tablename ~* 'purchase'
    or tablename ~* 'certificate'
    or tablename ~* 'booking'
    or tablename ~* 'point'
    or tablename ~* 'calendar'
    or tablename ~* 'time_block'
    or tablename ~* 'availability'
    or tablename ~* 'participant'
    or tablename ~* 'actor'
    or tablename ~* 'correction'
    or tablename ~* 'feedback'
    or tablename ~* 'state'
    or tablename ~* 'similarity'
    or tablename ~* 'relevance'
  )
order by schemaname, tablename, indexname;

-- ============================================================
-- 8. RLS and policy audit
-- ============================================================

select
  '08_rls_enabled_tables' as section,
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname not in ('pg_catalog', 'information_schema')
  and c.relkind in ('r', 'p')
  and (
    c.relname ~* 'activity'
    or c.relname ~* 'activities'
    or c.relname ~* 'value_object'
    or c.relname ~* 'category'
    or c.relname ~* 'categories'
    or c.relname ~* 'derivation'
    or c.relname ~* 'organization'
    or c.relname ~* 'offer'
    or c.relname ~* 'purchase'
    or c.relname ~* 'certificate'
    or c.relname ~* 'booking'
    or c.relname ~* 'point'
    or c.relname ~* 'calendar'
    or c.relname ~* 'time_block'
    or c.relname ~* 'availability'
    or c.relname ~* 'participant'
    or c.relname ~* 'actor'
    or c.relname ~* 'correction'
    or c.relname ~* 'feedback'
    or c.relname ~* 'state'
    or c.relname ~* 'similarity'
    or c.relname ~* 'relevance'
  )
order by n.nspname, c.relname;

select
  '09_relevant_policies' as section,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname not in ('pg_catalog', 'information_schema')
  and (
    tablename ~* 'activity'
    or tablename ~* 'activities'
    or tablename ~* 'value_object'
    or tablename ~* 'category'
    or tablename ~* 'categories'
    or tablename ~* 'derivation'
    or tablename ~* 'organization'
    or tablename ~* 'offer'
    or tablename ~* 'purchase'
    or tablename ~* 'certificate'
    or tablename ~* 'booking'
    or tablename ~* 'point'
    or tablename ~* 'calendar'
    or tablename ~* 'time_block'
    or tablename ~* 'availability'
    or tablename ~* 'participant'
    or tablename ~* 'actor'
    or tablename ~* 'correction'
    or tablename ~* 'feedback'
    or tablename ~* 'state'
    or tablename ~* 'similarity'
    or tablename ~* 'relevance'
  )
order by schemaname, tablename, policyname;

-- ============================================================
-- 9. Relevant functions / RPC metadata
-- ============================================================

select
  '10_relevant_functions_rpc_metadata' as section,
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as result_type,
  l.lanname as language,
  p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_language l on l.oid = p.prolang
where n.nspname not in ('pg_catalog', 'information_schema')
  and (
    p.proname ~* 'activity'
    or p.proname ~* 'value_object'
    or p.proname ~* 'category'
    or p.proname ~* 'derivation'
    or p.proname ~* 'organization'
    or p.proname ~* 'purchase'
    or p.proname ~* 'certificate'
    or p.proname ~* 'booking'
    or p.proname ~* 'point'
    or p.proname ~* 'calendar'
    or p.proname ~* 'availability'
    or p.proname ~* 'correction'
    or p.proname ~* 'feedback'
    or p.proname ~* 'state'
    or p.proname ~* 'similarity'
    or p.proname ~* 'relevance'
    or p.proname ~* 'wallet'
  )
order by n.nspname, p.proname;

-- ============================================================
-- 10. Relevant triggers
-- ============================================================

select
  '11_relevant_triggers' as section,
  event_object_schema as table_schema,
  event_object_table as table_name,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
from information_schema.triggers
where event_object_schema not in ('pg_catalog', 'information_schema')
  and (
    event_object_table ~* 'activity'
    or event_object_table ~* 'activities'
    or event_object_table ~* 'value_object'
    or event_object_table ~* 'category'
    or event_object_table ~* 'categories'
    or event_object_table ~* 'derivation'
    or event_object_table ~* 'organization'
    or event_object_table ~* 'offer'
    or event_object_table ~* 'purchase'
    or event_object_table ~* 'certificate'
    or event_object_table ~* 'booking'
    or event_object_table ~* 'point'
    or event_object_table ~* 'calendar'
    or event_object_table ~* 'time_block'
    or event_object_table ~* 'availability'
    or event_object_table ~* 'participant'
    or event_object_table ~* 'actor'
    or event_object_table ~* 'correction'
    or event_object_table ~* 'feedback'
    or event_object_table ~* 'state'
    or event_object_table ~* 'similarity'
    or event_object_table ~* 'relevance'
  )
order by event_object_schema, event_object_table, trigger_name;

-- ============================================================
-- 11. Enum / type audit
-- ============================================================

select
  '12_enum_type_audit' as section,
  n.nspname as schema_name,
  t.typname as enum_name,
  e.enumlabel as enum_value,
  e.enumsortorder
from pg_type t
join pg_namespace n on n.oid = t.typnamespace
join pg_enum e on e.enumtypid = t.oid
where n.nspname not in ('pg_catalog', 'information_schema')
  and (
    t.typname ~* 'activity'
    or t.typname ~* 'value_object'
    or t.typname ~* 'category'
    or t.typname ~* 'organization'
    or t.typname ~* 'offer'
    or t.typname ~* 'purchase'
    or t.typname ~* 'certificate'
    or t.typname ~* 'booking'
    or t.typname ~* 'point'
    or t.typname ~* 'calendar'
    or t.typname ~* 'state'
    or t.typname ~* 'privacy'
    or t.typname ~* 'visibility'
    or t.typname ~* 'status'
    or t.typname ~* 'source'
  )
order by n.nspname, t.typname, e.enumsortorder;

-- ============================================================
-- 12. Ownership / privacy / correction column audit
-- ============================================================

select
  '13_ownership_privacy_correction_columns' as section,
  table_schema,
  table_name,
  column_name,
  data_type,
  udt_name,
  is_nullable
from information_schema.columns
where table_schema not in ('pg_catalog', 'information_schema')
  and (
    column_name ~* 'user_id'
    or column_name ~* 'owner_id'
    or column_name ~* 'actor_id'
    or column_name ~* 'organization_id'
    or column_name ~* 'created_by'
    or column_name ~* 'updated_by'
    or column_name ~* 'privacy'
    or column_name ~* 'visibility'
    or column_name ~* 'sensitive'
    or column_name ~* 'correction'
    or column_name ~* 'corrected'
    or column_name ~* 'audit'
    or column_name ~* 'source'
    or column_name ~* 'confidence'
    or column_name ~* 'evidence'
  )
order by table_schema, table_name, ordinal_position;

-- ============================================================
-- 13. Audit summary markers
-- ============================================================

select
  '14_audit_summary_markers' as section,
  'After running this audit, paste the outputs into the chat for C8-I-D migration design.' as instruction,
  'Do not create migrations before reviewing missing tables, RLS, policies, functions and do-not-touch risks.' as warning;
