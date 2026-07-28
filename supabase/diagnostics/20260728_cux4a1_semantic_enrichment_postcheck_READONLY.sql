-- ARCTor.app
-- CUX4A1 postcheck — READ ONLY

with required_columns(column_name) as (
  values
    ('id'),
    ('owner_user_id'),
    ('owner_actor_id'),
    ('activity_event_id'),
    ('request_key'),
    ('request_hash'),
    ('status'),
    ('attempt_no'),
    ('source_locale'),
    ('source_text'),
    ('requested_fields_json'),
    ('protected_field_codes'),
    ('input_snapshot_json'),
    ('result_json'),
    ('applied_fields_json'),
    ('previous_activity_json'),
    ('previous_calendar_projection_json'),
    ('error_json'),
    ('started_at'),
    ('finished_at'),
    ('created_at'),
    ('updated_at')
),
checks as (
  select 10 as ord,'table_exists' as check_code,
    to_regclass('public.activity_semantic_enrichment_runs_cux4') is not null as passed,
    jsonb_build_object(
      'regclass',
      to_regclass('public.activity_semantic_enrichment_runs_cux4')::text
    ) as details

  union all

  select 20,'column:' || column_name,
    exists (
      select 1
      from information_schema.columns c
      where c.table_schema='public'
        and c.table_name='activity_semantic_enrichment_runs_cux4'
        and c.column_name=required_columns.column_name
    ),
    jsonb_build_object('column',column_name)
  from required_columns

  union all

  select 30,'unique_identity_constraint',
    exists (
      select 1
      from pg_constraint con
      join pg_class c on c.oid=con.conrelid
      join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public'
        and c.relname='activity_semantic_enrichment_runs_cux4'
        and con.conname=
          'activity_semantic_enrichment_runs_cux4_identity_unique'
    ),
    '{}'::jsonb

  union all

  select 40,'status_constraint',
    exists (
      select 1
      from pg_constraint con
      join pg_class c on c.oid=con.conrelid
      join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public'
        and c.relname='activity_semantic_enrichment_runs_cux4'
        and con.conname=
          'activity_semantic_enrichment_runs_cux4_status_check'
    ),
    '{}'::jsonb

  union all

  select 50,'protected_fields_constraint',
    exists (
      select 1
      from pg_constraint con
      join pg_class c on c.oid=con.conrelid
      join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public'
        and c.relname='activity_semantic_enrichment_runs_cux4'
        and con.conname=
          'activity_semantic_enrichment_runs_cux4_protected_fields_check'
    ),
    '{}'::jsonb

  union all

  select 60,'contract_trigger',
    exists (
      select 1
      from pg_trigger t
      join pg_class c on c.oid=t.tgrelid
      join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public'
        and c.relname='activity_semantic_enrichment_runs_cux4'
        and t.tgname=
          'activity_semantic_enrichment_runs_cux4_contract_trg'
        and not t.tgisinternal
    ),
    '{}'::jsonb

  union all

  select 70,'updated_at_trigger',
    exists (
      select 1
      from pg_trigger t
      join pg_class c on c.oid=t.tgrelid
      join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public'
        and c.relname='activity_semantic_enrichment_runs_cux4'
        and t.tgname=
          'activity_semantic_enrichment_runs_cux4_updated_at_trg'
        and not t.tgisinternal
    ),
    '{}'::jsonb

  union all

  select 80,'rls_enabled',
    coalesce((
      select c.relrowsecurity
      from pg_class c
      join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public'
        and c.relname='activity_semantic_enrichment_runs_cux4'
    ),false),
    '{}'::jsonb

  union all

  select 90,'activity_index',
    exists (
      select 1
      from pg_indexes
      where schemaname='public'
        and tablename='activity_semantic_enrichment_runs_cux4'
        and indexname=
          'activity_semantic_enrichment_runs_cux4_activity_idx'
    ),
    '{}'::jsonb

  union all

  select 100,'owner_status_index',
    exists (
      select 1
      from pg_indexes
      where schemaname='public'
        and tablename='activity_semantic_enrichment_runs_cux4'
        and indexname=
          'activity_semantic_enrichment_runs_cux4_owner_status_idx'
    ),
    '{}'::jsonb

  union all

  select 110,'pending_index',
    exists (
      select 1
      from pg_indexes
      where schemaname='public'
        and tablename='activity_semantic_enrichment_runs_cux4'
        and indexname=
          'activity_semantic_enrichment_runs_cux4_pending_idx'
    ),
    '{}'::jsonb

  union all

  select 120,'create_run_rpc',
    to_regprocedure(
      'public.create_activity_semantic_enrichment_run_cux4_v1(uuid,uuid,uuid,text,text,text,jsonb,text[],jsonb)'
    ) is not null,
    jsonb_build_object(
      'procedure',
      to_regprocedure(
        'public.create_activity_semantic_enrichment_run_cux4_v1(uuid,uuid,uuid,text,text,text,jsonb,text[],jsonb)'
      )::text
    )

  union all

  select 130,'claim_run_rpc',
    to_regprocedure(
      'public.claim_activity_semantic_enrichment_run_cux4_v1(uuid,uuid,uuid)'
    ) is not null,
    jsonb_build_object(
      'procedure',
      to_regprocedure(
        'public.claim_activity_semantic_enrichment_run_cux4_v1(uuid,uuid,uuid)'
      )::text
    )

  union all

  select 140,'finish_run_rpc',
    to_regprocedure(
      'public.finish_activity_semantic_enrichment_run_cux4_v1(uuid,uuid,uuid,text,jsonb,jsonb)'
    ) is not null,
    jsonb_build_object(
      'procedure',
      to_regprocedure(
        'public.finish_activity_semantic_enrichment_run_cux4_v1(uuid,uuid,uuid,text,jsonb,jsonb)'
      )::text
    )

  union all

  select 150,'no_rows_created_by_migration',
    (select count(*)=0
     from public.activity_semantic_enrichment_runs_cux4),
    jsonb_build_object(
      'rows',
      (select count(*)
       from public.activity_semantic_enrichment_runs_cux4)
    )
)
select
  row_number() over(order by ord,check_code) as check_no,
  check_code,
  passed,
  details
from checks
order by ord,check_code;
