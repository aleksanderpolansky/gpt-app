-- ARCTor.app
-- GCR6E read-only postcheck.
-- Expected: every row passed = true.

with checks as (
  select
    '01_guard_function_exists'::text as check_name,
    to_regprocedure(
      'public.enforce_activity_gift_certificate_terms_v1()'
    ) is not null as passed,
    to_regprocedure(
      'public.enforce_activity_gift_certificate_terms_v1()'
    )::text as detail

  union all

  select
    '02_guard_security_definer',
    coalesce(proc.prosecdef, false),
    proc.prosecdef::text
  from pg_proc proc
  join pg_namespace namespace
    on namespace.oid = proc.pronamespace
  where namespace.nspname = 'public'
    and proc.proname = 'enforce_activity_gift_certificate_terms_v1'
    and pg_get_function_identity_arguments(proc.oid) = ''

  union all

  select
    '03_guard_search_path_locked',
    coalesce(
      'search_path=public, pg_temp' = any(proc.proconfig),
      false
    ),
    array_to_string(proc.proconfig, ', ')
  from pg_proc proc
  join pg_namespace namespace
    on namespace.oid = proc.pronamespace
  where namespace.nspname = 'public'
    and proc.proname = 'enforce_activity_gift_certificate_terms_v1'
    and pg_get_function_identity_arguments(proc.oid) = ''

  union all

  select
    '04_ceiling_formula_present',
    position(
      'ceil(v_covered / v_exchange_rate)'
      in pg_get_functiondef(proc.oid)
    ) > 0
    and position(
      'round(v_covered / v_exchange_rate, 2)'
      in pg_get_functiondef(proc.oid)
    ) = 0,
    null::text
  from pg_proc proc
  join pg_namespace namespace
    on namespace.oid = proc.pronamespace
  where namespace.nspname = 'public'
    and proc.proname = 'enforce_activity_gift_certificate_terms_v1'
    and pg_get_function_identity_arguments(proc.oid) = ''

  union all

  select
    '05_rounding_policy_snapshot_present',
    position(
      'ceiling_whole_point_v1'
      in pg_get_functiondef(proc.oid)
    ) > 0,
    null::text
  from pg_proc proc
  join pg_namespace namespace
    on namespace.oid = proc.pronamespace
  where namespace.nspname = 'public'
    and proc.proname = 'enforce_activity_gift_certificate_terms_v1'
    and pg_get_function_identity_arguments(proc.oid) = ''

  union all

  select
    '06_published_legacy_snapshot_preserved',
    position(
      'old.published_at is not null'
      in pg_get_functiondef(proc.oid)
    ) > 0
    and position(
      'v_points := old.points_price'
      in pg_get_functiondef(proc.oid)
    ) > 0
    and position(
      'new.public_snapshot_json := old.public_snapshot_json'
      in pg_get_functiondef(proc.oid)
    ) > 0,
    null::text
  from pg_proc proc
  join pg_namespace namespace
    on namespace.oid = proc.pronamespace
  where namespace.nspname = 'public'
    and proc.proname = 'enforce_activity_gift_certificate_terms_v1'
    and pg_get_function_identity_arguments(proc.oid) = ''

  union all

  select
    '07_whole_points_constraint_validated',
    coalesce(constraint_row.convalidated, false),
    pg_get_constraintdef(constraint_row.oid)
  from pg_constraint constraint_row
  join pg_class relation
    on relation.oid = constraint_row.conrelid
  join pg_namespace namespace
    on namespace.oid = relation.relnamespace
  where namespace.nspname = 'public'
    and relation.relname = 'activity_gift_certificate_terms'
    and constraint_row.conname =
      'activity_gift_certificate_whole_points_policy_check'

  union all

  select
    '08_tagged_rows_match_ceiling',
    not exists (
      select 1
      from public.activity_gift_certificate_terms terms
      where coalesce(
        terms.public_snapshot_json ->> 'pointsRoundingPolicy',
        ''
      ) = 'ceiling_whole_point_v1'
        and (
          terms.points_price is distinct from ceil(
            terms.provider_currency_covered_amount
            / terms.reference_exchange_rate
          )
          or terms.points_price is distinct from ceil(terms.points_price)
          or case
            when jsonb_typeof(
              terms.public_snapshot_json -> 'pointsPrice'
            ) = 'number'
            then
              (
                terms.public_snapshot_json ->> 'pointsPrice'
              )::numeric is distinct from terms.points_price
            else true
          end
        )
    ),
    (
      select count(*)::text
      from public.activity_gift_certificate_terms terms
      where coalesce(
        terms.public_snapshot_json ->> 'pointsRoundingPolicy',
        ''
      ) = 'ceiling_whole_point_v1'
    )

  union all

  select
    '09_sample_40_pln_at_4_306_is_10',
    ceil(40::numeric / 4.306::numeric) = 10::numeric,
    ceil(40::numeric / 4.306::numeric)::text

  union all

  select
    '10_order_uses_stored_points_price',
    position(
      'v_points_amount := round(v_terms_before.points_price, 2)'
      in pg_get_functiondef(proc.oid)
    ) > 0,
    null::text
  from pg_proc proc
  join pg_namespace namespace
    on namespace.oid = proc.pronamespace
  where namespace.nspname = 'public'
    and proc.proname = 'request_gift_certificate_activity_v1'
    and pg_get_function_identity_arguments(proc.oid) =
      'uuid, uuid, uuid, text, text, text, text'

  union all

  select
    '11_reputation_uses_order_points_amount',
    position(
      'round(transaction_row.amount, 2)'
      in pg_get_functiondef(proc.oid)
    ) > 0
    and position(
      'round(v_terms.points_price, 2)'
      in pg_get_functiondef(proc.oid)
    ) > 0,
    null::text
  from pg_proc proc
  join pg_namespace namespace
    on namespace.oid = proc.pronamespace
  where namespace.nspname = 'public'
    and proc.proname = 'award_gift_certificate_order_reputation_v1'
    and pg_get_function_identity_arguments(proc.oid) =
      'uuid, uuid, uuid'
)
select check_name, passed, detail
from checks
order by check_name;
