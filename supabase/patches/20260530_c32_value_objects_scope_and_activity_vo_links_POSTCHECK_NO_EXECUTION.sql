-- GPT-APP / AI-NAVIGATOR
-- C8-I / C32-SCHEMA-A
-- Post-check package for value_objects scope + activity_value_object_links
-- Generated: 2026-05-30
--
-- IMPORTANT:
-- Do NOT execute until the migration package has been explicitly executed.
-- This file is for post-execution verification only.

SELECT
  'value_objects_columns' AS section,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'value_objects'
  AND column_name IN (
    'id',
    'organization_id',
    'actor_id',
    'space_id',
    'app_user_id',
    'owner_user_id',
    'title',
    'description',
    'status',
    'visibility',
    'source',
    'semantic_signature',
    'metadata',
    'created_at',
    'updated_at'
  )
ORDER BY column_name;

SELECT
  'activity_value_object_links_columns' AS section,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'activity_value_object_links'
ORDER BY ordinal_position;

SELECT
  'rls_status' AS section,
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('value_objects', 'activity_value_object_links')
ORDER BY tablename;

SELECT
  'policies' AS section,
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('value_objects', 'activity_value_object_links')
ORDER BY tablename, policyname;

SELECT
  'direct_grants' AS section,
  grantee,
  table_schema,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('value_objects', 'activity_value_object_links')
ORDER BY table_name, grantee, privilege_type;

SELECT
  'link_table_exists' AS section,
  to_regclass('public.activity_value_object_links') AS relation_name;
