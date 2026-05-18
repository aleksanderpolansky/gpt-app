/*
P4.8.0-C1 — organization country/currency live check
Read-only SQL.

Purpose:
- inspect current DB source of organization country/city/currency;
- inspect whether country/currency rules already exist;
- inspect organization_locations and geo_areas relationship;
- inspect purchase_confirmations currency columns in relation to organizations.
*/

with target_tables(table_name) as (
  values
    ('organizations'),
    ('organization_locations'),
    ('geo_areas'),
    ('locations'),
    ('countries'),
    ('commercial_currency_rules'),
    ('purchase_confirmations'),
    ('offers'),
    ('certificates')
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
candidate_columns(table_name, column_name) as (
  values
    ('organizations', 'id'),
    ('organizations', 'country'),
    ('organizations', 'country_code'),
    ('organizations', 'city'),
    ('organizations', 'currency'),
    ('organizations', 'default_currency'),

    ('organization_locations', 'id'),
    ('organization_locations', 'organization_id'),
    ('organization_locations', 'country'),
    ('organization_locations', 'country_code'),
    ('organization_locations', 'city'),
    ('organization_locations', 'geo_area_id'),
    ('organization_locations', 'is_primary'),
    ('organization_locations', 'address_visibility'),

    ('geo_areas', 'id'),
    ('geo_areas', 'name'),
    ('geo_areas', 'type'),
    ('geo_areas', 'country_code'),
    ('geo_areas', 'parent_id'),
    ('geo_areas', 'status'),

    ('purchase_confirmations', 'organization_id'),
    ('purchase_confirmations', 'purchase_amount'),
    ('purchase_confirmations', 'purchase_currency'),
    ('purchase_confirmations', 'currency'),

    ('offers', 'organization_id'),
    ('offers', 'currency'),
    ('offers', 'certificate_currency'),
    ('offers', 'reference_currency')
),
column_existence as (
  select
    'column_existence'::text as section,
    (cc.table_name || '.' || cc.column_name)::text as item,
    case when c.column_name is not null then 'PRESENT' else 'ABSENT' end as status,
    jsonb_build_object(
      'data_type', c.data_type,
      'is_nullable', c.is_nullable,
      'column_default', c.column_default
    ) as details
  from candidate_columns cc
  left join information_schema.columns c
    on c.table_schema = 'public'
   and c.table_name = cc.table_name
   and c.column_name = cc.column_name
),
row_counts as (
  select 'row_counts'::text as section, 'organizations'::text as item, 'INFO'::text as status, jsonb_build_object('count', count(*)) as details from public.organizations
  union all
  select 'row_counts', 'organization_locations', case when to_regclass('public.organization_locations') is null then 'TABLE_MISSING' else 'INFO' end,
    case when to_regclass('public.organization_locations') is null then '{}'::jsonb else (select jsonb_build_object('count', count(*)) from public.organization_locations) end
  union all
  select 'row_counts', 'geo_areas', case when to_regclass('public.geo_areas') is null then 'TABLE_MISSING' else 'INFO' end,
    case when to_regclass('public.geo_areas') is null then '{}'::jsonb else (select jsonb_build_object('count', count(*)) from public.geo_areas) end
  union all
  select 'row_counts', 'purchase_confirmations', 'INFO', jsonb_build_object('count', count(*)) from public.purchase_confirmations
),
purchase_currency_distribution as (
  select
    'distribution'::text as section,
    'purchase_confirmations.purchase_currency_vs_currency'::text as item,
    'INFO'::text as status,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'purchase_currency', purchase_currency,
          'currency', currency,
          'count', row_count
        )
        order by purchase_currency, currency
      ),
      '[]'::jsonb
    ) as details
  from (
    select purchase_currency, currency, count(*) as row_count
    from public.purchase_confirmations
    group by purchase_currency, currency
  ) s
),
offer_currency_distribution as (
  select
    'distribution'::text as section,
    'offers.currency_certificate_reference'::text as item,
    'INFO'::text as status,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'currency', currency,
          'certificate_currency', certificate_currency,
          'reference_currency', reference_currency,
          'count', row_count
        )
        order by currency, certificate_currency, reference_currency
      ),
      '[]'::jsonb
    ) as details
  from (
    select currency, certificate_currency, reference_currency, count(*) as row_count
    from public.offers
    group by currency, certificate_currency, reference_currency
  ) s
)
select *
from table_existence

union all select * from column_existence
union all select * from row_counts
union all select * from purchase_currency_distribution
union all select * from offer_currency_distribution

order by section, item;
