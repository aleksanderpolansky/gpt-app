-- GPT-APP / AI-NAVIGATOR
-- C8-I / C32-SCHEMA-B2
-- SELECT-only preflight before value_objects scope + activity_value_object_links migration
-- Generated: 2026-05-30
--
-- IMPORTANT:
-- This file contains SELECT statements only.
-- It does NOT change schema.
-- It does NOT insert/update/delete data.
--
-- Main question:
-- Is public.value_objects.organization_id nullable?
--
-- If organization_id is NOT NULL, the C32 migration package must be revised before execution,
-- because personal Value Objects cannot be inserted without organization_id.

-- ============================================================
-- 1. Critical column nullability and defaults
-- ============================================================

SELECT
  'critical_columns' AS section,
  table_schema,
  table_name,
  column_name,
  ordinal_position,
  data_type,
  udt_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (
      table_name = 'value_objects'
      AND column_name IN (
        'id',
        'organization_id',
        'actor_id',
        'space_id',
        'app_user_id',
        'owner_user_id',
        'title',
        'name',
        'description',
        'status',
        'visibility',
        'source',
        'semantic_signature',
        'metadata',
        'created_at',
        'updated_at'
      )
    )
    OR (
      table_name = 'activity_events'
      AND column_name IN (
        'id',
        'user_id',
        'title',
        'source',
        'status',
        'duration_minutes',
        'created_at',
        'updated_at'
      )
    )
    OR (
      table_name IN (
        'actors',
        'spaces',
        'app_users',
        'organizations'
      )
      AND column_name = 'id'
    )
  )
ORDER BY table_name, ordinal_position;

-- ============================================================
-- 2. Existing tables required by planned migration
-- ============================================================

SELECT
  'required_tables' AS section,
  required_table,
  to_regclass('public.' || required_table) AS relation_name
FROM (
  VALUES
    ('value_objects'),
    ('activity_events'),
    ('actors'),
    ('spaces'),
    ('app_users'),
    ('organizations'),
    ('activity_value_object_links')
) AS required(required_table)
ORDER BY required_table;

-- ============================================================
-- 3. Existing constraints on value_objects
-- ============================================================

SELECT
  'value_objects_constraints' AS section,
  c.conname AS constraint_name,
  c.contype AS constraint_type,
  pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname = 'value_objects'
ORDER BY c.contype, c.conname;

-- ============================================================
-- 4. Existing constraints on activity_events
-- ============================================================

SELECT
  'activity_events_constraints' AS section,
  c.conname AS constraint_name,
  c.contype AS constraint_type,
  pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname = 'activity_events'
ORDER BY c.contype, c.conname;

-- ============================================================
-- 5. Existing indexes on value_objects
-- ============================================================

SELECT
  'value_objects_indexes' AS section,
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'value_objects'
ORDER BY indexname;

-- ============================================================
-- 6. Existing RLS posture
-- ============================================================

SELECT
  'rls_status' AS section,
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'value_objects',
    'activity_events',
    'activity_value_object_links'
  )
ORDER BY tablename;

-- ============================================================
-- 7. Existing policies
-- ============================================================

SELECT
  'policies' AS section,
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'value_objects',
    'activity_events',
    'activity_value_object_links'
  )
ORDER BY tablename, policyname;

-- ============================================================
-- 8. Existing direct grants
-- ============================================================

SELECT
  'direct_grants' AS section,
  grantee,
  table_schema,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN (
    'value_objects',
    'activity_events',
    'activity_value_object_links'
  )
ORDER BY table_name, grantee, privilege_type;

-- ============================================================
-- 9. Summary verdict helper
-- ============================================================

SELECT
  'preflight_verdict_helper' AS section,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'value_objects'
        AND column_name = 'organization_id'
        AND is_nullable = 'NO'
    )
    THEN 'BLOCKER: value_objects.organization_id is NOT NULL. Revise migration before execution.'
    WHEN EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'value_objects'
        AND column_name = 'organization_id'
        AND is_nullable = 'YES'
    )
    THEN 'OK: value_objects.organization_id is nullable. Personal scope columns can be added without forcing organization_id.'
    ELSE 'BLOCKER: value_objects.organization_id column not found. Re-check schema before execution.'
  END AS verdict;
