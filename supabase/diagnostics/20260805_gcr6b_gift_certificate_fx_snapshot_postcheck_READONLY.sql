-- GC-R6B read-only production postcheck.
-- This file changes no data.

with checks as (
  select
    '01_fx_cache_table_exists'::text as check_name,
    to_regclass(
      'public.exchange_rate_reference_snapshots'
    ) is not null as passed,
    null::text as detail

  union all

  select
    '02_terms_fx_columns_exist',
    (
      select count(*) = 5
      from information_schema.columns
      where table_schema = 'public'
        and table_name =
          'activity_gift_certificate_terms'
        and column_name in (
          'reference_exchange_rate_source',
          'reference_exchange_rate_date',
          'reference_exchange_rate_fetched_at',
          'reference_exchange_rate_source_url',
          'reference_exchange_rate_is_fallback'
        )
    ),
    null

  union all

  select
    '03_terms_fx_columns_not_null',
    (
      select count(*) = 5
      from information_schema.columns
      where table_schema = 'public'
        and table_name =
          'activity_gift_certificate_terms'
        and is_nullable = 'NO'
        and column_name in (
          'reference_exchange_rate_source',
          'reference_exchange_rate_date',
          'reference_exchange_rate_fetched_at',
          'reference_exchange_rate_source_url',
          'reference_exchange_rate_is_fallback'
        )
    ),
    null

  union all

  select
    '04_fx_cache_rls_enabled',
    coalesce((
      select relrowsecurity
      from pg_class
      where oid =
        'public.exchange_rate_reference_snapshots'::regclass
    ), false),
    null

  union all

  select
    '05_draft_rpc_has_fx_parameters',
    exists (
      select 1
      from pg_proc procedure
      join pg_namespace namespace
        on namespace.oid = procedure.pronamespace
      where namespace.nspname = 'public'
        and procedure.proname =
          'create_gift_certificate_activity_draft_v1'
        and pg_get_function_arguments(procedure.oid)
          like '%p_reference_exchange_rate_source text%'
        and pg_get_function_arguments(procedure.oid)
          like '%p_reference_exchange_rate_fetched_at%'
        and pg_get_function_arguments(procedure.oid)
          like '%p_reference_exchange_rate_is_fallback%'
    ),
    null

  union all

  select
    '06_contract_trigger_has_fx_guard',
    exists (
      select 1
      from pg_proc procedure
      join pg_namespace namespace
        on namespace.oid = procedure.pronamespace
      where namespace.nspname = 'public'
        and procedure.proname =
          'enforce_activity_gift_certificate_terms_v1'
        and pg_get_functiondef(procedure.oid)
          like '%GCR6B_PUBLISHED_FINANCIAL_SNAPSHOT_IMMUTABLE%'
        and pg_get_functiondef(procedure.oid)
          like '%referenceExchangeRateFetchedAt%'
        and pg_get_functiondef(procedure.oid)
          like '%LEGACY_PRE_GCR6B%'
    ),
    null

  union all

  select
    '07_no_incomplete_terms_rows',
    not exists (
      select 1
      from public.activity_gift_certificate_terms terms
      where terms.reference_exchange_rate_source is null
         or terms.reference_exchange_rate_date is null
         or terms.reference_exchange_rate_fetched_at is null
         or nullif(
              btrim(
                terms.reference_exchange_rate_source_url
              ),
              ''
            ) is null
         or terms.reference_exchange_rate_is_fallback is null
    ),
    (
      select count(*)::text
      from public.activity_gift_certificate_terms
    )

  union all

  select
    '08_eur_identity_rows_valid',
    not exists (
      select 1
      from public.activity_gift_certificate_terms terms
      where terms.provider_currency = 'EUR'
        and (
          terms.reference_exchange_rate <> 1
          or terms.reference_exchange_rate_source
             <> 'EUR_IDENTITY'
          or terms.reference_exchange_rate_is_fallback
          or terms.reference_exchange_rate_source_url
             <> 'urn:arctor:exchange-rate:eur-identity'
        )
    ),
    null

  union all

  select
    '09_new_non_eur_rows_use_ecb',
    not exists (
      select 1
      from public.activity_gift_certificate_terms terms
      where terms.provider_currency <> 'EUR'
        and terms.created_at >=
          '2026-08-05T00:00:00Z'::timestamptz
        and (
          terms.reference_exchange_rate_source
             <> 'ECB_EURO_REFERENCE_RATE'
          or terms.reference_exchange_rate_source_url
             not like 'https://www.ecb.europa.eu/%'
        )
    ),
    null

  union all

  select
    '10_public_snapshot_contains_fx_metadata',
    not exists (
      select 1
      from public.activity_gift_certificate_terms terms
      where not (
        terms.public_snapshot_json
          ? 'referenceExchangeRateSource'
        and terms.public_snapshot_json
          ? 'referenceExchangeRateDate'
        and terms.public_snapshot_json
          ? 'referenceExchangeRateFetchedAt'
        and terms.public_snapshot_json
          ? 'referenceExchangeRateSourceUrl'
        and terms.public_snapshot_json
          ? 'referenceExchangeRateIsFallback'
      )
    ),
    null
)
select
  check_name,
  passed,
  detail
from checks
order by check_name;

select
  base_currency,
  quote_currency,
  provider_currency_per_euro,
  reference_date,
  source_code,
  source_url,
  fetched_at
from public.exchange_rate_reference_snapshots
order by
  quote_currency,
  reference_date desc,
  fetched_at desc
limit 30;

select
  activity_event_id,
  provider_currency,
  reference_exchange_rate,
  reference_exchange_rate_source,
  reference_exchange_rate_date,
  reference_exchange_rate_fetched_at,
  reference_exchange_rate_source_url,
  reference_exchange_rate_is_fallback,
  lifecycle_status,
  created_at
from public.activity_gift_certificate_terms
order by created_at desc
limit 30;
