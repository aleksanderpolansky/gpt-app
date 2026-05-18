/*
P4.8.0-B1.2 — purchase confirmation currency contract check
Read-only SQL.

Why:
- A7.2 added purchase_confirmations.currency.
- B1.1 route inspection shows API may still select purchase_currency.
- Need to verify live DB column contract before deciding whether runtime patch is needed.
*/

with target_columns(column_name) as (
  values
    ('id'),
    ('organization_id'),
    ('buyer_user_id'),
    ('purchase_amount'),
    ('currency'),
    ('purchase_currency'),
    ('status'),
    ('points_awarded'),
    ('offer_id'),
    ('value_object_id'),
    ('purchase_items'),
    ('purchase_confirmation_items'),
    ('cart_id'),
    ('order_id')
),
column_existence as (
  select
    'column_existence'::text as section,
    ('purchase_confirmations.' || tc.column_name)::text as item,
    case when c.column_name is not null then 'PRESENT' else 'ABSENT' end as status,
    jsonb_build_object(
      'data_type', c.data_type,
      'is_nullable', c.is_nullable,
      'column_default', c.column_default
    ) as details
  from target_columns tc
  left join information_schema.columns c
    on c.table_schema = 'public'
   and c.table_name = 'purchase_confirmations'
   and c.column_name = tc.column_name
),
row_json as (
  select to_jsonb(pc) as row_data
  from public.purchase_confirmations pc
),
json_key_presence as (
  select
    'json_key_presence'::text as section,
    'purchase_confirmations.currency'::text as item,
    case
      when count(*) = 0 then 'NO_ROWS'
      when count(*) filter (where row_data ? 'currency') = count(*) then 'PRESENT_IN_ALL_ROWS'
      when count(*) filter (where row_data ? 'currency') > 0 then 'PRESENT_IN_SOME_ROWS'
      else 'ABSENT_IN_ROWS'
    end as status,
    jsonb_build_object(
      'total_rows', count(*),
      'rows_with_key', count(*) filter (where row_data ? 'currency')
    ) as details
  from row_json

  union all

  select
    'json_key_presence'::text as section,
    'purchase_confirmations.purchase_currency'::text as item,
    case
      when count(*) = 0 then 'NO_ROWS'
      when count(*) filter (where row_data ? 'purchase_currency') = count(*) then 'PRESENT_IN_ALL_ROWS'
      when count(*) filter (where row_data ? 'purchase_currency') > 0 then 'PRESENT_IN_SOME_ROWS'
      else 'ABSENT_IN_ROWS'
    end as status,
    jsonb_build_object(
      'total_rows', count(*),
      'rows_with_key', count(*) filter (where row_data ? 'purchase_currency')
    ) as details
  from row_json
),
currency_distribution as (
  select
    'distribution'::text as section,
    'purchase_confirmations.currency'::text as item,
    'INFO'::text as status,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'value', value,
          'count', row_count
        )
        order by value
      ),
      '[]'::jsonb
    ) as details
  from (
    select row_data ->> 'currency' as value, count(*) as row_count
    from row_json
    where row_data ? 'currency'
    group by row_data ->> 'currency'
  ) s

  union all

  select
    'distribution'::text as section,
    'purchase_confirmations.purchase_currency'::text as item,
    'INFO'::text as status,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'value', value,
          'count', row_count
        )
        order by value
      ),
      '[]'::jsonb
    ) as details
  from (
    select row_data ->> 'purchase_currency' as value, count(*) as row_count
    from row_json
    where row_data ? 'purchase_currency'
    group by row_data ->> 'purchase_currency'
  ) s
),
forbidden_shape_check as (
  select
    'forbidden_shape_check'::text as section,
    'purchase_confirmations.cart_order_item_columns'::text as item,
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
)
select *
from column_existence

union all select * from json_key_presence
union all select * from currency_distribution
union all select * from forbidden_shape_check

order by section, item;
