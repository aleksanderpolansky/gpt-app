/*
P4.8.0-A6 — live structural verification
Read-only SQL.

Purpose:
- verify offers.value_object_id column/FK/index/nullability/consistency
- verify offer_items table/FK/index relationship
- verify purchase_confirmations remains organization-level amount-based flow
- verify value_objects.commercial_usage existence/absence
- prepare evidence for additive migration plan only if needed

Do not modify data.
Do not create migrations from assumptions.
*/

with target_tables(table_name) as (
  values
    ('offers'),
    ('offer_items'),
    ('purchase_confirmations'),
    ('value_objects'),
    ('certificates'),
    ('points_transactions'),
    ('user_points_wallets'),
    ('bookings')
),
table_existence as (
  select
    'table_existence'::text as section,
    tt.table_name::text as item,
    case when t.table_name is not null then 'YES' else 'NO' end as status,
    jsonb_build_object(
      'schema', coalesce(t.table_schema, 'public'),
      'table_type', t.table_type
    ) as details
  from target_tables tt
  left join information_schema.tables t
    on t.table_schema = 'public'
   and t.table_name = tt.table_name
),
target_columns(table_name, column_name) as (
  values
    ('offers', 'id'),
    ('offers', 'organization_id'),
    ('offers', 'provider_actor_id'),
    ('offers', 'value_object_id'),
    ('offers', 'price'),
    ('offers', 'certificate_points_price'),
    ('offers', 'certificate_money_price'),

    ('offer_items', 'id'),
    ('offer_items', 'offer_id'),
    ('offer_items', 'organization_id'),
    ('offer_items', 'value_object_id'),
    ('offer_items', 'quantity'),
    ('offer_items', 'unit_price'),
    ('offer_items', 'total_price'),
    ('offer_items', 'sort_order'),

    ('purchase_confirmations', 'id'),
    ('purchase_confirmations', 'organization_id'),
    ('purchase_confirmations', 'buyer_user_id'),
    ('purchase_confirmations', 'purchase_amount'),
    ('purchase_confirmations', 'currency'),
    ('purchase_confirmations', 'status'),
    ('purchase_confirmations', 'points_awarded'),
    ('purchase_confirmations', 'offer_id'),
    ('purchase_confirmations', 'value_object_id'),
    ('purchase_confirmations', 'purchase_items'),
    ('purchase_confirmations', 'purchase_confirmation_items'),
    ('purchase_confirmations', 'cart_id'),
    ('purchase_confirmations', 'order_id'),

    ('value_objects', 'id'),
    ('value_objects', 'organization_id'),
    ('value_objects', 'owner_actor_id'),
    ('value_objects', 'value_type'),
    ('value_objects', 'commercial_usage'),
    ('value_objects', 'parent_value_object_id')
),
column_existence as (
  select
    'column_existence'::text as section,
    (tc.table_name || '.' || tc.column_name)::text as item,
    case when c.column_name is not null then 'YES' else 'NO' end as status,
    jsonb_build_object(
      'data_type', c.data_type,
      'is_nullable', c.is_nullable,
      'column_default', c.column_default
    ) as details
  from target_columns tc
  left join information_schema.columns c
    on c.table_schema = 'public'
   and c.table_name = tc.table_name
   and c.column_name = tc.column_name
),
foreign_keys as (
  select
    'foreign_keys'::text as section,
    (tc.table_name || '.' || tc.column_name)::text as item,
    case when count(con.oid) > 0 then 'YES' else 'NO' end as status,
    coalesce(
      jsonb_agg(
        distinct jsonb_build_object(
          'constraint_name', con.conname,
          'definition', pg_get_constraintdef(con.oid)
        )
      ) filter (where con.oid is not null),
      '[]'::jsonb
    ) as details
  from target_columns tc
  left join pg_class rel
    on rel.relname = tc.table_name
  left join pg_namespace nsp
    on nsp.oid = rel.relnamespace
   and nsp.nspname = 'public'
  left join pg_attribute att
    on att.attrelid = rel.oid
   and att.attname = tc.column_name
  left join pg_constraint con
    on con.conrelid = rel.oid
   and con.contype = 'f'
   and att.attnum = any(con.conkey)
  where tc.column_name in (
    'organization_id',
    'provider_actor_id',
    'owner_actor_id',
    'value_object_id',
    'offer_id',
    'buyer_user_id',
    'certificate_id',
    'wallet_id'
  )
  group by tc.table_name, tc.column_name
),
indexes as (
  select
    'indexes'::text as section,
    (tc.table_name || '.' || tc.column_name)::text as item,
    case when count(i.indexname) > 0 then 'YES' else 'NO' end as status,
    coalesce(
      jsonb_agg(
        distinct jsonb_build_object(
          'index_name', i.indexname,
          'index_def', i.indexdef
        )
      ) filter (where i.indexname is not null),
      '[]'::jsonb
    ) as details
  from target_columns tc
  left join pg_indexes i
    on i.schemaname = 'public'
   and i.tablename = tc.table_name
   and i.indexdef ilike '%' || tc.column_name || '%'
  where tc.column_name in (
    'value_object_id',
    'offer_id',
    'organization_id',
    'buyer_user_id',
    'status',
    'owner_actor_id',
    'provider_actor_id'
  )
  group by tc.table_name, tc.column_name
),
row_counts as (
  select
    'row_counts'::text as section,
    'offers'::text as item,
    'INFO'::text as status,
    jsonb_build_object('count', count(*)) as details
  from public.offers
  union all
  select
    'row_counts',
    'value_objects',
    'INFO',
    jsonb_build_object('count', count(*))
  from public.value_objects
  union all
  select
    'row_counts',
    'purchase_confirmations',
    'INFO',
    jsonb_build_object('count', count(*))
  from public.purchase_confirmations
  union all
  select
    'row_counts',
    'certificates',
    'INFO',
    jsonb_build_object('count', count(*))
  from public.certificates
),
offer_items_row_count as (
  select
    'row_counts'::text as section,
    'offer_items'::text as item,
    case
      when to_regclass('public.offer_items') is null then 'TABLE_MISSING'
      else 'INFO'
    end as status,
    case
      when to_regclass('public.offer_items') is null then jsonb_build_object('count', null)
      else (
        select jsonb_build_object('count', count(*))
        from public.offer_items
      )
    end as details
),
orphan_checks as (
  select
    'orphan_checks'::text as section,
    'offers.value_object_id_without_value_objects_match'::text as item,
    case when count(*) = 0 then 'OK' else 'PROBLEM' end as status,
    jsonb_build_object('orphan_count', count(*)) as details
  from public.offers o
  left join public.value_objects vo
    on vo.id = o.value_object_id
  where o.value_object_id is not null
    and vo.id is null

  union all

  select
    'orphan_checks'::text as section,
    'offer_items.offer_id_without_offers_match'::text as item,
    case
      when to_regclass('public.offer_items') is null then 'SKIPPED_TABLE_MISSING'
      when (
        select count(*)
        from public.offer_items oi
        left join public.offers o on o.id = oi.offer_id
        where oi.offer_id is not null and o.id is null
      ) = 0 then 'OK'
      else 'PROBLEM'
    end as status,
    case
      when to_regclass('public.offer_items') is null then jsonb_build_object('orphan_count', null)
      else (
        select jsonb_build_object('orphan_count', count(*))
        from public.offer_items oi
        left join public.offers o on o.id = oi.offer_id
        where oi.offer_id is not null and o.id is null
      )
    end as details

  union all

  select
    'orphan_checks'::text as section,
    'offer_items.value_object_id_without_value_objects_match'::text as item,
    case
      when to_regclass('public.offer_items') is null then 'SKIPPED_TABLE_MISSING'
      when (
        select count(*)
        from public.offer_items oi
        left join public.value_objects vo on vo.id = oi.value_object_id
        where oi.value_object_id is not null and vo.id is null
      ) = 0 then 'OK'
      else 'PROBLEM'
    end as status,
    case
      when to_regclass('public.offer_items') is null then jsonb_build_object('orphan_count', null)
      else (
        select jsonb_build_object('orphan_count', count(*))
        from public.offer_items oi
        left join public.value_objects vo on vo.id = oi.value_object_id
        where oi.value_object_id is not null and vo.id is null
      )
    end as details
),
purchase_confirmation_shape as (
  select
    'purchase_confirmation_shape'::text as section,
    'purchase_confirmations_item_cart_order_columns'::text as item,
    case when count(*) = 0 then 'OK_ABSENT' else 'CHECK_PRESENT' end as status,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'column_name', column_name,
          'data_type', data_type,
          'is_nullable', is_nullable
        )
      ) filter (where column_name is not null),
      '[]'::jsonb
    ) as details
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'purchase_confirmations'
    and (
      column_name ilike '%item%'
      or column_name ilike '%cart%'
      or column_name ilike '%order%'
      or column_name in ('offer_id', 'value_object_id')
    )
),
value_objects_commercial_usage_shape as (
  select
    'value_objects_shape'::text as section,
    'value_objects.commercial_usage'::text as item,
    case when count(*) > 0 then 'PRESENT' else 'ABSENT' end as status,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'column_name', column_name,
          'data_type', data_type,
          'is_nullable', is_nullable,
          'column_default', column_default
        )
      ) filter (where column_name is not null),
      '[]'::jsonb
    ) as details
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'value_objects'
    and column_name = 'commercial_usage'
),
rpc_shape as (
  select
    'rpc_shape'::text as section,
    p.proname::text as item,
    'PRESENT'::text as status,
    jsonb_build_object(
      'identity_arguments', pg_get_function_identity_arguments(p.oid),
      'result_type', pg_get_function_result(p.oid)
    ) as details
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      'request_certificate_from_offer',
      'seller_redeem_certificate',
      'add_points_to_wallet',
      'spend_points_from_wallet'
    )
),
rpc_expected(name) as (
  values
    ('request_certificate_from_offer'),
    ('seller_redeem_certificate'),
    ('add_points_to_wallet'),
    ('spend_points_from_wallet')
),
rpc_missing as (
  select
    'rpc_shape'::text as section,
    e.name::text as item,
    'MISSING'::text as status,
    '{}'::jsonb as details
  from rpc_expected e
  where not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = e.name
  )
)
select *
from table_existence

union all select * from column_existence
union all select * from foreign_keys
union all select * from indexes
union all select * from row_counts
union all select * from offer_items_row_count
union all select * from orphan_checks
union all select * from purchase_confirmation_shape
union all select * from value_objects_commercial_usage_shape
union all select * from rpc_shape
union all select * from rpc_missing

order by section, item;
