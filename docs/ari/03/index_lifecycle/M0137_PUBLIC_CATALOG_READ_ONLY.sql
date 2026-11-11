-- ARCTor M-0137 / ARI-03.07.06. INFORMATION ONLY. No CREATE/ALTER/GRANT/REVOKE/UPDATE.
-- Run manually in Supabase SQL Editor IF a live database ACL audit is requested.
-- Current grants do not prove what was explicitly GRANTed in a historical migration.
-- PostgreSQL pg_class has no reliable table creation date: correlate with migrations.
-- service_role bypasses RLS policies but still requires appropriate table privileges.
WITH policy_counts AS (
  SELECT schemaname, tablename, count(*)::integer AS policy_count
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'public'
  GROUP BY schemaname, tablename
)
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  COALESCE(pc.policy_count, 0) AS policy_count,
  has_table_privilege('anon', c.oid, 'SELECT') AS anon_select,
  has_table_privilege('authenticated', c.oid, 'SELECT') AS authenticated_select,
  has_table_privilege('service_role', c.oid, 'SELECT') AS service_role_select
FROM pg_catalog.pg_class AS c
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
LEFT JOIN policy_counts AS pc
  ON pc.schemaname = n.nspname AND pc.tablename = c.relname
WHERE n.nspname = 'public'
  AND c.relkind IN ('r', 'p')
ORDER BY c.relname;
