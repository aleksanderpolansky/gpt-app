-- GPT-APP / AI-NAVIGATOR
-- AVO STEP 20.13.6R — Author-first Value Object postcheck
-- MODE: SELECT ONLY / READ ONLY
-- DB writes: NO
-- DDL: NO
-- DML: NO

with target_columns as (
  select *
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'value_objects'
),
target_constraints as (
  select
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    pg_get_constraintdef(pc.oid) as constraint_definition
  from information_schema.table_constraints tc
  left join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
   and tc.table_schema = kcu.table_schema
   and tc.table_name = kcu.table_name
  left join pg_constraint pc
    on pc.conname = tc.constraint_name
   and pc.conrelid = 'public.value_objects'::regclass
  where tc.table_schema = 'public'
    and tc.table_name = 'value_objects'
),
target_indexes as (
  select
    schemaname,
    tablename,
    indexname,
    indexdef
  from pg_indexes
  where schemaname = 'public'
    and tablename = 'value_objects'
),
usage_scope_counts as (
  select
    usage_scope,
    count(*) as row_count
  from public.value_objects
  group by usage_scope
  order by usage_scope nulls first
),
scope_integrity as (
  select
    count(*) filter (where usage_scope is null) as usage_scope_null_count,
    count(*) filter (where usage_scope not in ('private', 'commercial') and usage_scope is not null) as invalid_usage_scope_count,
    count(*) filter (where usage_scope = 'private' and organization_id is not null) as private_with_organization_count,
    count(*) filter (where usage_scope = 'commercial' and organization_id is null) as commercial_without_organization_count,
    count(*) filter (where created_by_actor_id is null) as created_by_actor_id_null_count,
    count(*) as total_value_objects
  from public.value_objects
)
select jsonb_pretty(
  jsonb_build_object(
    'step', 'AVO_STEP20_13_6R_AUTHOR_FIRST_VALUE_OBJECT_POSTCHECK_SELECT_ONLY',
    'mode', 'SELECT_ONLY_READ_ONLY',
    'db_writes', false,
    'ddl', false,
    'dml', false,
    'required_columns', (
      select jsonb_agg(
        jsonb_build_object(
          'column_name', required_field,
          'field_status', case
            when exists (
              select 1
              from target_columns
              where column_name = required_field
            )
            then 'exists'
            else 'missing'
          end,
          'data_type', (
            select data_type
            from target_columns
            where column_name = required_field
            limit 1
          ),
          'is_nullable', (
            select is_nullable
            from target_columns
            where column_name = required_field
            limit 1
          ),
          'column_default', (
            select column_default
            from target_columns
            where column_name = required_field
            limit 1
          )
        )
        order by required_field
      )
      from (
        values
          ('usage_scope'),
          ('created_by_actor_id'),
          ('owner_actor_id'),
          ('organization_id'),
          ('commercial_usage'),
          ('source'),
          ('status'),
          ('visibility')
      ) as required(required_field)
    ),
    'usage_scope_counts', (
      select coalesce(jsonb_agg(to_jsonb(usage_scope_counts)), '[]'::jsonb)
      from usage_scope_counts
    ),
    'scope_integrity', (
      select to_jsonb(scope_integrity)
      from scope_integrity
    ),
    'constraints', (
      select coalesce(jsonb_agg(to_jsonb(target_constraints) order by constraint_name, column_name), '[]'::jsonb)
      from target_constraints
      where constraint_name in (
        'value_objects_usage_scope_check',
        'value_objects_created_by_actor_id_fkey',
        'value_objects_organization_id_fkey',
        'value_objects_owner_actor_id_fkey'
      )
    ),
    'indexes', (
      select coalesce(jsonb_agg(to_jsonb(target_indexes) order by indexname), '[]'::jsonb)
      from target_indexes
      where indexname in (
        'idx_value_objects_usage_scope',
        'idx_value_objects_created_by_actor_id',
        'idx_value_objects_organization_id',
        'idx_value_objects_status',
        'value_objects_owner_actor_id_idx'
      )
    ),
    'sample_rows_last_5', (
      select jsonb_agg(to_jsonb(sample_rows))
      from (
        select
          id,
          title,
          usage_scope,
          commercial_usage,
          organization_id,
          created_by_actor_id,
          owner_actor_id,
          actor_id,
          app_user_id,
          owner_user_id,
          source,
          status,
          visibility,
          value_type,
          created_at
        from public.value_objects
        order by created_at desc nulls last
        limit 5
      ) sample_rows
    )
  )
) as avo_step20_13_6r_author_first_value_object_postcheck_select_only;