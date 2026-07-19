-- Actor public profiles: production preflight (READ ONLY).
-- Safe to run in Supabase SQL Editor before applying the migration.
-- The query returns one JSON report and does not expose user names, e-mail
-- addresses, Auth0 identifiers or profile pictures.

with target_columns as (
  select
    c.table_name,
    c.ordinal_position,
    c.column_name,
    c.data_type,
    c.udt_name,
    c.is_nullable,
    c.column_default
  from information_schema.columns as c
  where c.table_schema = 'public'
    and c.table_name in ('app_users', 'persons', 'actors', 'actor_public_profiles')
),
target_constraints as (
  select
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    string_agg(kcu.column_name, ', ' order by kcu.ordinal_position) as columns
  from information_schema.table_constraints as tc
  left join information_schema.key_column_usage as kcu
    on kcu.constraint_schema = tc.constraint_schema
   and kcu.constraint_name = tc.constraint_name
   and kcu.table_name = tc.table_name
  where tc.table_schema = 'public'
    and tc.table_name in ('app_users', 'persons', 'actors', 'actor_public_profiles')
  group by tc.table_name, tc.constraint_name, tc.constraint_type
),
target_rls as (
  select
    schemaname,
    tablename,
    rowsecurity
  from pg_tables
  where schemaname = 'public'
    and tablename in ('app_users', 'persons', 'actors', 'actor_public_profiles')
),
target_policies as (
  select
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
  from pg_policies
  where schemaname = 'public'
    and tablename in ('app_users', 'persons', 'actors', 'actor_public_profiles')
),
mapping_counts as (
  select
    (select count(*) from public.app_users) as app_users_count,
    (select count(*) from public.persons) as persons_count,
    (select count(*) from public.actors where actor_type = 'person') as person_actors_count,
    (
      select count(*)
      from public.app_users as au
      join public.persons as p on p.user_id = au.id
      join public.actors as a
        on a.person_id = p.id
       and a.actor_type = 'person'
    ) as complete_primary_actor_mappings_count
)
select jsonb_pretty(
  jsonb_build_object(
    'mode', 'read_only_actor_public_profiles_preflight',
    'generated_at', now(),
    'columns', coalesce(
      (select jsonb_agg(to_jsonb(c) order by c.table_name, c.ordinal_position) from target_columns as c),
      '[]'::jsonb
    ),
    'constraints', coalesce(
      (select jsonb_agg(to_jsonb(c) order by c.table_name, c.constraint_type, c.constraint_name) from target_constraints as c),
      '[]'::jsonb
    ),
    'rls', coalesce(
      (select jsonb_agg(to_jsonb(r) order by r.tablename) from target_rls as r),
      '[]'::jsonb
    ),
    'policies', coalesce(
      (select jsonb_agg(to_jsonb(p) order by p.tablename, p.policyname) from target_policies as p),
      '[]'::jsonb
    ),
    'mapping_counts', (select to_jsonb(m) from mapping_counts as m)
  )
) as actor_public_profiles_preflight_report;
