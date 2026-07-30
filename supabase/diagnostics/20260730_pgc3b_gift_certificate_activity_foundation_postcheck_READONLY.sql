-- PGC3B read-only postcheck.
with template_check as (
  select
    count(*) = 1 as passed
  from public.activity_templates
  where template_scope = 'system'
    and owner_user_id is null
    and organization_id is null
    and slug = 'gift-certificate-v1'
    and status = 'active'
    and is_active = true
),
table_check as (
  select to_regclass('public.activity_gift_certificate_terms') is not null as passed
),
constraint_check as (
  select count(*) >= 16 as passed
  from pg_catalog.pg_constraint constraint_row
  join pg_catalog.pg_class table_row
    on table_row.oid = constraint_row.conrelid
  join pg_catalog.pg_namespace namespace_row
    on namespace_row.oid = table_row.relnamespace
  where namespace_row.nspname = 'public'
    and table_row.relname = 'activity_gift_certificate_terms'
),
index_check as (
  select count(*) >= 5 as passed
  from pg_catalog.pg_indexes
  where schemaname = 'public'
    and tablename = 'activity_gift_certificate_terms'
),
trigger_check as (
  select count(*) = 2 as passed
  from pg_catalog.pg_trigger trigger_row
  join pg_catalog.pg_class table_row
    on table_row.oid = trigger_row.tgrelid
  join pg_catalog.pg_namespace namespace_row
    on namespace_row.oid = table_row.relnamespace
  where not trigger_row.tgisinternal
    and namespace_row.nspname = 'public'
    and table_row.relname = 'activity_gift_certificate_terms'
    and trigger_row.tgname in (
      'activity_gift_certificate_terms_updated_at_trg',
      'activity_gift_certificate_terms_contract_trg'
    )
),
function_check as (
  select
    count(*) = 1
    and bool_and(function_row.prosecdef)
    and bool_and(
      pg_get_functiondef(function_row.oid)
        like '%create_activity_event_pp1_v1%'
    )
    and bool_and(
      pg_get_functiondef(function_row.oid)
        like '%gift-certificate-v1%'
    ) as passed
  from pg_catalog.pg_proc function_row
  join pg_catalog.pg_namespace namespace_row
    on namespace_row.oid = function_row.pronamespace
  where namespace_row.nspname = 'public'
    and function_row.proname =
      'create_gift_certificate_activity_draft_v1'
),
points_precision_check as (
  select
    numeric_precision = 18
    and numeric_scale = 2
    as passed
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'activity_gift_certificate_terms'
    and column_name = 'points_price'
),
snapshot_contract_check as (
  select
    count(*) = 1
    and bool_and(
      pg_get_functiondef(function_row.oid)
        like '%old.regular_price_snapshot%'
    )
    and bool_and(
      pg_get_functiondef(function_row.oid)
        like '%PGC3B_CERTIFICATE_IDENTITY_IMMUTABLE%'
    )
    and bool_and(
      pg_get_functiondef(function_row.oid)
        like '%round(v_covered / v_exchange_rate, 2)%'
    )
    and bool_and(
      pg_get_functiondef(function_row.oid)
        not like '%coalesce(p_reference_exchange_rate, 1)%'
    ) as passed
  from pg_catalog.pg_proc function_row
  join pg_catalog.pg_namespace namespace_row
    on namespace_row.oid = function_row.pronamespace
  where namespace_row.nspname = 'public'
    and function_row.proname =
      'enforce_activity_gift_certificate_terms_v1'
),
service_role_check as (
  select
    has_function_privilege(
      'service_role',
      'public.create_gift_certificate_activity_draft_v1(uuid,uuid,uuid,text,text,date,date,text,numeric,numeric,numeric,text,timestamp with time zone,timestamp with time zone)',
      'EXECUTE'
    ) as passed
),
authenticated_check as (
  select
    not has_function_privilege(
      'authenticated',
      'public.create_gift_certificate_activity_draft_v1(uuid,uuid,uuid,text,text,date,date,text,numeric,numeric,numeric,text,timestamp with time zone,timestamp with time zone)',
      'EXECUTE'
    ) as passed
),
legacy_empty_check as (
  select
    (select count(*) from public.offers) = 0
    and
    (select count(*) from public.certificates) = 0
    as passed
),
no_new_rows_check as (
  select count(*) = 0 as passed
  from public.activity_gift_certificate_terms
)
select *
from (
  select '01_template_seed'::text as check_code, passed from template_check
  union all
  select '02_extension_table', passed from table_check
  union all
  select '03_constraints', passed from constraint_check
  union all
  select '04_indexes', passed from index_check
  union all
  select '05_triggers', passed from trigger_check
  union all
  select '06_create_draft_rpc', passed from function_check
  union all
  select '07_points_precision', passed from points_precision_check
  union all
  select '08_snapshot_contract', passed from snapshot_contract_check
  union all
  select '09_service_role_execute', passed from service_role_check
  union all
  select '10_authenticated_no_execute', passed from authenticated_check
  union all
  select '11_legacy_tables_still_empty', passed from legacy_empty_check
  union all
  select '12_migration_created_no_certificate_rows', passed from no_new_rows_check
) checks
order by check_code;
