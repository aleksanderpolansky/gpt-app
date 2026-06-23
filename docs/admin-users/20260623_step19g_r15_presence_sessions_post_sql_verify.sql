-- GPT-APP / AI-NAVIGATOR
-- Step 19G-R15 post-SQL verification
-- Read-only verification for presence + sessions foundation.
--
-- Run after executing:
--   20260623115000_app_user_presence_sessions.sql

with checks as (
  select
    'app_users.last_seen_at column exists' as check_name,
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'app_users'
        and column_name = 'last_seen_at'
    ) as passed

  union all

  select
    'app_user_sessions table exists' as check_name,
    exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = 'app_user_sessions'
    ) as passed

  union all

  select
    'app_user_sessions has required columns' as check_name,
    (
      select count(*) = 11
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'app_user_sessions'
        and column_name in (
          'id',
          'app_user_id',
          'client_session_id_hash',
          'user_agent_hash',
          'first_seen_at',
          'last_seen_at',
          'request_count',
          'status',
          'metadata',
          'created_at',
          'updated_at'
        )
    ) as passed

  union all

  select
    'app_user_sessions RLS enabled' as check_name,
    exists (
      select 1
      from pg_class cls
      join pg_namespace ns
        on ns.oid = cls.relnamespace
      where ns.nspname = 'public'
        and cls.relname = 'app_user_sessions'
        and cls.relrowsecurity = true
    ) as passed

  union all

  select
    'app_user_sessions no direct authenticated grants' as check_name,
    not exists (
      select 1
      from information_schema.role_table_grants
      where table_schema = 'public'
        and table_name = 'app_user_sessions'
        and grantee in ('anon', 'authenticated')
    ) as passed

  union all

  select
    'app_user_sessions service_role grants exist' as check_name,
    exists (
      select 1
      from information_schema.role_table_grants
      where table_schema = 'public'
        and table_name = 'app_user_sessions'
        and grantee = 'service_role'
        and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
    ) as passed

  union all

  select
    'app_user_sessions deny policy exists' as check_name,
    exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'app_user_sessions'
        and policyname = 'No direct client access to app_user_sessions'
    ) as passed

  union all

  select
    'app_user_sessions updated_at trigger exists' as check_name,
    exists (
      select 1
      from pg_trigger trigger_row
      join pg_class cls
        on cls.oid = trigger_row.tgrelid
      join pg_namespace ns
        on ns.oid = cls.relnamespace
      where ns.nspname = 'public'
        and cls.relname = 'app_user_sessions'
        and trigger_row.tgname = 'app_user_sessions_set_updated_at'
        and not trigger_row.tgisinternal
    ) as passed
)
select
  check_name,
  passed,
  case when passed then 'PASS' else 'FAIL' end as status
from checks
order by check_name;
