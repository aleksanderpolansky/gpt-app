-- P4.8.0-A2 live schema inventory
-- Run this in Supabase SQL Editor or through psql against the current project database.
-- This file is read-only: it only SELECTs metadata from catalog tables.
-- Goal: tables, columns, constraints, indexes and RLS policies for commercial/value/activity/rubricator integration.

-- 1) Target table existence + RLS flags
WITH target_tables(table_name) AS (
VALUES
  ('action_types'),
  ('activity_event_corrections'),
  ('activity_event_value_object_instance_links'),
  ('activity_events'),
  ('activity_processing_logs'),
  ('activity_template_known_registry_rules'),
  ('activity_templates'),
  ('actor_space_roles'),
  ('actors'),
  ('aliases'),
  ('app_users'),
  ('bookings'),
  ('business_categories'),
  ('certificates'),
  ('contexts'),
  ('contextual_categories'),
  ('contribution_edges'),
  ('current_snapshots'),
  ('daily_aggregates'),
  ('entity_classifications'),
  ('entity_tags'),
  ('event_links'),
  ('geo_areas'),
  ('impact_events'),
  ('object_action_affordances'),
  ('object_classes'),
  ('object_types'),
  ('offers'),
  ('organization_categories'),
  ('organization_locations'),
  ('organizations'),
  ('payments'),
  ('persons'),
  ('points_transactions'),
  ('purchase_confirmations'),
  ('purchase_items'),
  ('raw_activity_signals'),
  ('spaces'),
  ('tags'),
  ('translations'),
  ('user_points_wallets'),
  ('value_object_closure'),
  ('value_object_daily_aggregates'),
  ('value_object_functions'),
  ('value_object_goal_profiles'),
  ('value_object_instances'),
  ('value_object_relations'),
  ('value_object_state_deltas'),
  ('value_object_state_snapshots'),
  ('value_objects')
)
SELECT
  t.table_name,
  CASE WHEN c.oid IS NULL THEN false ELSE true END AS table_exists,
  n.nspname AS schema_name,
  c.relkind,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  obj_description(c.oid) AS table_comment
FROM target_tables t
LEFT JOIN pg_class c
  ON c.relname = t.table_name
 AND c.relkind IN ('r', 'p')
 AND c.relnamespace = 'public'::regnamespace
LEFT JOIN pg_namespace n
  ON n.oid = c.relnamespace
ORDER BY t.table_name;

-- 2) Columns
WITH target_tables(table_name) AS (
VALUES
  ('action_types'),
  ('activity_event_corrections'),
  ('activity_event_value_object_instance_links'),
  ('activity_events'),
  ('activity_processing_logs'),
  ('activity_template_known_registry_rules'),
  ('activity_templates'),
  ('actor_space_roles'),
  ('actors'),
  ('aliases'),
  ('app_users'),
  ('bookings'),
  ('business_categories'),
  ('certificates'),
  ('contexts'),
  ('contextual_categories'),
  ('contribution_edges'),
  ('current_snapshots'),
  ('daily_aggregates'),
  ('entity_classifications'),
  ('entity_tags'),
  ('event_links'),
  ('geo_areas'),
  ('impact_events'),
  ('object_action_affordances'),
  ('object_classes'),
  ('object_types'),
  ('offers'),
  ('organization_categories'),
  ('organization_locations'),
  ('organizations'),
  ('payments'),
  ('persons'),
  ('points_transactions'),
  ('purchase_confirmations'),
  ('purchase_items'),
  ('raw_activity_signals'),
  ('spaces'),
  ('tags'),
  ('translations'),
  ('user_points_wallets'),
  ('value_object_closure'),
  ('value_object_daily_aggregates'),
  ('value_object_functions'),
  ('value_object_goal_profiles'),
  ('value_object_instances'),
  ('value_object_relations'),
  ('value_object_state_deltas'),
  ('value_object_state_snapshots'),
  ('value_objects')
)
SELECT
  cols.table_name,
  cols.ordinal_position,
  cols.column_name,
  cols.data_type,
  cols.udt_name,
  cols.is_nullable,
  cols.column_default
FROM information_schema.columns cols
JOIN target_tables t
  ON t.table_name = cols.table_name
WHERE cols.table_schema = 'public'
ORDER BY cols.table_name, cols.ordinal_position;

-- 3) Constraints: PK, FK, UNIQUE, CHECK
WITH target_tables(table_name) AS (
VALUES
  ('action_types'),
  ('activity_event_corrections'),
  ('activity_event_value_object_instance_links'),
  ('activity_events'),
  ('activity_processing_logs'),
  ('activity_template_known_registry_rules'),
  ('activity_templates'),
  ('actor_space_roles'),
  ('actors'),
  ('aliases'),
  ('app_users'),
  ('bookings'),
  ('business_categories'),
  ('certificates'),
  ('contexts'),
  ('contextual_categories'),
  ('contribution_edges'),
  ('current_snapshots'),
  ('daily_aggregates'),
  ('entity_classifications'),
  ('entity_tags'),
  ('event_links'),
  ('geo_areas'),
  ('impact_events'),
  ('object_action_affordances'),
  ('object_classes'),
  ('object_types'),
  ('offers'),
  ('organization_categories'),
  ('organization_locations'),
  ('organizations'),
  ('payments'),
  ('persons'),
  ('points_transactions'),
  ('purchase_confirmations'),
  ('purchase_items'),
  ('raw_activity_signals'),
  ('spaces'),
  ('tags'),
  ('translations'),
  ('user_points_wallets'),
  ('value_object_closure'),
  ('value_object_daily_aggregates'),
  ('value_object_functions'),
  ('value_object_goal_profiles'),
  ('value_object_instances'),
  ('value_object_relations'),
  ('value_object_state_deltas'),
  ('value_object_state_snapshots'),
  ('value_objects')
)
SELECT
  rel.relname AS table_name,
  con.conname AS constraint_name,
  con.contype AS constraint_type,
  pg_get_constraintdef(con.oid) AS constraint_def
FROM pg_constraint con
JOIN pg_class rel
  ON rel.oid = con.conrelid
JOIN pg_namespace n
  ON n.oid = rel.relnamespace
JOIN target_tables t
  ON t.table_name = rel.relname
WHERE n.nspname = 'public'
ORDER BY rel.relname, con.contype, con.conname;

-- 4) Indexes
WITH target_tables(table_name) AS (
VALUES
  ('action_types'),
  ('activity_event_corrections'),
  ('activity_event_value_object_instance_links'),
  ('activity_events'),
  ('activity_processing_logs'),
  ('activity_template_known_registry_rules'),
  ('activity_templates'),
  ('actor_space_roles'),
  ('actors'),
  ('aliases'),
  ('app_users'),
  ('bookings'),
  ('business_categories'),
  ('certificates'),
  ('contexts'),
  ('contextual_categories'),
  ('contribution_edges'),
  ('current_snapshots'),
  ('daily_aggregates'),
  ('entity_classifications'),
  ('entity_tags'),
  ('event_links'),
  ('geo_areas'),
  ('impact_events'),
  ('object_action_affordances'),
  ('object_classes'),
  ('object_types'),
  ('offers'),
  ('organization_categories'),
  ('organization_locations'),
  ('organizations'),
  ('payments'),
  ('persons'),
  ('points_transactions'),
  ('purchase_confirmations'),
  ('purchase_items'),
  ('raw_activity_signals'),
  ('spaces'),
  ('tags'),
  ('translations'),
  ('user_points_wallets'),
  ('value_object_closure'),
  ('value_object_daily_aggregates'),
  ('value_object_functions'),
  ('value_object_goal_profiles'),
  ('value_object_instances'),
  ('value_object_relations'),
  ('value_object_state_deltas'),
  ('value_object_state_snapshots'),
  ('value_objects')
)
SELECT
  idx.tablename AS table_name,
  idx.indexname,
  idx.indexdef
FROM pg_indexes idx
JOIN target_tables t
  ON t.table_name = idx.tablename
WHERE idx.schemaname = 'public'
ORDER BY idx.tablename, idx.indexname;

-- 5) RLS policies
WITH target_tables(table_name) AS (
VALUES
  ('action_types'),
  ('activity_event_corrections'),
  ('activity_event_value_object_instance_links'),
  ('activity_events'),
  ('activity_processing_logs'),
  ('activity_template_known_registry_rules'),
  ('activity_templates'),
  ('actor_space_roles'),
  ('actors'),
  ('aliases'),
  ('app_users'),
  ('bookings'),
  ('business_categories'),
  ('certificates'),
  ('contexts'),
  ('contextual_categories'),
  ('contribution_edges'),
  ('current_snapshots'),
  ('daily_aggregates'),
  ('entity_classifications'),
  ('entity_tags'),
  ('event_links'),
  ('geo_areas'),
  ('impact_events'),
  ('object_action_affordances'),
  ('object_classes'),
  ('object_types'),
  ('offers'),
  ('organization_categories'),
  ('organization_locations'),
  ('organizations'),
  ('payments'),
  ('persons'),
  ('points_transactions'),
  ('purchase_confirmations'),
  ('purchase_items'),
  ('raw_activity_signals'),
  ('spaces'),
  ('tags'),
  ('translations'),
  ('user_points_wallets'),
  ('value_object_closure'),
  ('value_object_daily_aggregates'),
  ('value_object_functions'),
  ('value_object_goal_profiles'),
  ('value_object_instances'),
  ('value_object_relations'),
  ('value_object_state_deltas'),
  ('value_object_state_snapshots'),
  ('value_objects')
)
SELECT
  p.tablename AS table_name,
  p.policyname,
  p.permissive,
  p.roles,
  p.cmd,
  p.qual,
  p.with_check
FROM pg_policies p
JOIN target_tables t
  ON t.table_name = p.tablename
WHERE p.schemaname = 'public'
ORDER BY p.tablename, p.policyname;

-- 6) Commercial/value relationship hints by column names
WITH target_tables(table_name) AS (
VALUES
  ('action_types'),
  ('activity_event_corrections'),
  ('activity_event_value_object_instance_links'),
  ('activity_events'),
  ('activity_processing_logs'),
  ('activity_template_known_registry_rules'),
  ('activity_templates'),
  ('actor_space_roles'),
  ('actors'),
  ('aliases'),
  ('app_users'),
  ('bookings'),
  ('business_categories'),
  ('certificates'),
  ('contexts'),
  ('contextual_categories'),
  ('contribution_edges'),
  ('current_snapshots'),
  ('daily_aggregates'),
  ('entity_classifications'),
  ('entity_tags'),
  ('event_links'),
  ('geo_areas'),
  ('impact_events'),
  ('object_action_affordances'),
  ('object_classes'),
  ('object_types'),
  ('offers'),
  ('organization_categories'),
  ('organization_locations'),
  ('organizations'),
  ('payments'),
  ('persons'),
  ('points_transactions'),
  ('purchase_confirmations'),
  ('purchase_items'),
  ('raw_activity_signals'),
  ('spaces'),
  ('tags'),
  ('translations'),
  ('user_points_wallets'),
  ('value_object_closure'),
  ('value_object_daily_aggregates'),
  ('value_object_functions'),
  ('value_object_goal_profiles'),
  ('value_object_instances'),
  ('value_object_relations'),
  ('value_object_state_deltas'),
  ('value_object_state_snapshots'),
  ('value_objects')
)
SELECT
  cols.table_name,
  cols.column_name,
  cols.data_type,
  cols.is_nullable,
  cols.column_default
FROM information_schema.columns cols
JOIN target_tables t
  ON t.table_name = cols.table_name
WHERE cols.table_schema = 'public'
  AND (
    cols.column_name ILIKE '%value_object%'
    OR cols.column_name ILIKE '%offer%'
    OR cols.column_name ILIKE '%certificate%'
    OR cols.column_name ILIKE '%purchase%'
    OR cols.column_name ILIKE '%organization%'
    OR cols.column_name ILIKE '%actor%'
    OR cols.column_name ILIKE '%points%'
    OR cols.column_name ILIKE '%wallet%'
    OR cols.column_name ILIKE '%booking%'
    OR cols.column_name ILIKE '%event%'
  )
ORDER BY cols.table_name, cols.ordinal_position;
