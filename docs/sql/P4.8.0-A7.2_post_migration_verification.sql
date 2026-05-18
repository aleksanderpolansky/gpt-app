/*
P4.8.0-A7.2 — post-migration verification
Run after applying:
supabase/migrations/025_p4_8_0_add_commercial_usage_and_purchase_currency.sql

Expected:
- value_objects.commercial_usage exists
- purchase_confirmations.currency exists
- both CHECK constraints exist
- invalid value counts are 0
- forbidden purchase confirmation cart/order/item columns are absent
*/

with column_check as (
  select
    'column_check'::text as section,
    (table_name || '.' || column_name)::text as item,
    'PRESENT'::text as status,
    jsonb_build_object(
      'data_type', data_type,
      'is_nullable', is_nullable,
      'column_default', column_default
    ) as details
  from information_schema.columns
  where table_schema = 'public'
    and (
      (table_name = 'value_objects' and column_name = 'commercial_usage')
      or
      (table_name = 'purchase_confirmations' and column_name = 'currency')
    )
),
expected_columns(item) as (
  values
    ('value_objects.commercial_usage'),
    ('purchase_confirmations.currency')
),
missing_columns as (
  select
    'column_check'::text as section,
    e.item::text as item,
    'MISSING'::text as status,
    '{}'::jsonb as details
  from expected_columns e
  where not exists (
    select 1
    from column_check c
    where c.item = e.item
  )
),
constraint_check as (
  select
    'constraint_check'::text as section,
    conname::text as item,
    'PRESENT'::text as status,
    jsonb_build_object(
      'definition', pg_get_constraintdef(oid)
    ) as details
  from pg_constraint
  where conname in (
    'value_objects_commercial_usage_check',
    'purchase_confirmations_currency_check'
  )
),
expected_constraints(item) as (
  values
    ('value_objects_commercial_usage_check'),
    ('purchase_confirmations_currency_check')
),
missing_constraints as (
  select
    'constraint_check'::text as section,
    e.item::text as item,
    'MISSING'::text as status,
    '{}'::jsonb as details
  from expected_constraints e
  where not exists (
    select 1
    from constraint_check c
    where c.item = e.item
  )
),
invalid_values as (
  select
    'invalid_values'::text as section,
    'purchase_confirmations.invalid_currency_count'::text as item,
    case when count(*) = 0 then 'OK' else 'PROBLEM' end as status,
    jsonb_build_object('count', count(*)) as details
  from public.purchase_confirmations
  where currency is not null
    and currency !~ '^[A-Z]{3}$'

  union all

  select
    'invalid_values'::text as section,
    'value_objects.invalid_commercial_usage_count'::text as item,
    case when count(*) = 0 then 'OK' else 'PROBLEM' end as status,
    jsonb_build_object('count', count(*)) as details
  from public.value_objects
  where commercial_usage is not null
    and commercial_usage not in (
      'none',
      'catalog_info',
      'certificate_base',
      'both'
    )
),
forbidden_purchase_columns as (
  select
    'forbidden_shape_check'::text as section,
    'purchase_confirmations.forbidden_cart_order_item_columns'::text as item,
    case when count(*) = 0 then 'OK_ABSENT' else 'PROBLEM_PRESENT' end as status,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'column_name', column_name,
          'data_type', data_type
        )
      ) filter (where column_name is not null),
      '[]'::jsonb
    ) as details
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'purchase_confirmations'
    and column_name in (
      'offer_id',
      'value_object_id',
      'purchase_items',
      'purchase_confirmation_items',
      'cart_id',
      'order_id'
    )
),
distribution as (
  select
    'distribution'::text as section,
    'value_objects.commercial_usage'::text as item,
    'INFO'::text as status,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'commercial_usage', commercial_usage,
          'count', row_count
        )
        order by commercial_usage
      ),
      '[]'::jsonb
    ) as details
  from (
    select commercial_usage, count(*) as row_count
    from public.value_objects
    group by commercial_usage
  ) s

  union all

  select
    'distribution'::text as section,
    'purchase_confirmations.currency'::text as item,
    'INFO'::text as status,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'currency', currency,
          'count', row_count
        )
        order by currency
      ),
      '[]'::jsonb
    ) as details
  from (
    select currency, count(*) as row_count
    from public.purchase_confirmations
    group by currency
  ) s
)
select *
from column_check

union all select * from missing_columns
union all select * from constraint_check
union all select * from missing_constraints
union all select * from invalid_values
union all select * from forbidden_purchase_columns
union all select * from distribution

order by section, item;
