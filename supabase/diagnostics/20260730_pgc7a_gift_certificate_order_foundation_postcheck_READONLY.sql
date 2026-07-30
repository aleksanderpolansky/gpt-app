-- ARCTor.app PGC7A
-- Read-only postcheck for the atomic gift-certificate order foundation.

with function_contract as (
  select
    p.oid,
    p.prosecdef,
    pg_get_functiondef(p.oid) as definition,
    coalesce(array_to_string(p.proacl, ','), '') as acl
  from pg_proc p
  join pg_namespace n
    on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'request_gift_certificate_activity_v1'
    and pg_get_function_identity_arguments(p.oid)
      = 'p_buyer_user_id uuid, p_recipient_actor_id uuid, p_activity_event_id uuid, p_idempotency_key text, p_public_code text, p_qr_token_hash text, p_qr_token_version text'
),
checks as (
  select
    '01_order_idempotency_column' as check_code,
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'activity_gift_certificate_terms'
        and column_name = 'order_idempotency_key'
        and data_type = 'text'
    ) as passed

  union all

  select
    '02_points_transaction_column',
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'activity_gift_certificate_terms'
        and column_name = 'points_transaction_id'
        and data_type = 'uuid'
    )

  union all

  select
    '03_qr_token_version_column',
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'activity_gift_certificate_terms'
        and column_name = 'qr_token_version'
        and data_type = 'text'
    )

  union all

  select
    '04_available_shape_constraint',
    exists (
      select 1
      from pg_constraint
      where conrelid = 'public.activity_gift_certificate_terms'::regclass
        and conname = 'activity_gift_certificate_available_shape_check'
    )

  union all

  select
    '05_ordered_shape_constraint',
    exists (
      select 1
      from pg_constraint
      where conrelid = 'public.activity_gift_certificate_terms'::regclass
        and conname = 'activity_gift_certificate_ordered_shape_check'
    )

  union all

  select
    '06_points_transaction_unique_index',
    to_regclass(
      'public.activity_gift_certificate_points_transaction_uidx'
    ) is not null

  union all

  select
    '07_qr_hash_unique_index',
    to_regclass(
      'public.activity_gift_certificate_qr_token_hash_uidx'
    ) is not null

  union all

  select
    '08_points_burn_unique_index',
    to_regclass(
      'public.points_transactions_gift_certificate_activity_burn_uidx'
    ) is not null

  union all

  select
    '09_order_function',
    exists (select 1 from function_contract)

  union all

  select
    '10_security_definer',
    coalesce(
      (select prosecdef from function_contract limit 1),
      false
    )

  union all

  select
    '11_locked_search_path',
    coalesce(
      (
        select definition like
          '%SET search_path TO ''public'', ''pg_temp''%'
        from function_contract
        limit 1
      ),
      false
    )

  union all

  select
    '12_available_only_guard',
    coalesce(
      (
        select definition like
          '%PGC7A_ONLY_AVAILABLE_CERTIFICATE_CAN_BE_ORDERED%'
        from function_contract
        limit 1
      ),
      false
    )

  union all

  select
    '13_self_order_guard',
    coalesce(
      (
        select definition like
          '%PGC7A_PROVIDER_CANNOT_ORDER_OWN_CERTIFICATE%'
        from function_contract
        limit 1
      ),
      false
    )

  union all

  select
    '14_one_active_per_provider_guard',
    coalesce(
      (
        select definition like
          '%PGC7A_BUYER_ALREADY_HAS_ACTIVE_CERTIFICATE_FOR_PROVIDER%'
        from function_contract
        limit 1
      ),
      false
    )

  union all

  select
    '15_immediate_points_burn',
    coalesce(
      (
        select definition like
          '%gift_certificate_points_burned%'
          and definition like '%v_balance_after := v_balance_before - v_points_amount%'
          and definition like '%v_spent_after := v_spent_before + v_points_amount%'
        from function_contract
        limit 1
      ),
      false
    )

  union all

  select
    '16_provider_receives_no_points',
    coalesce(
      (
        select definition like
          '%''providerPointsAwarded'', 0%'
        from function_contract
        limit 1
      ),
      false
    )

  union all

  select
    '17_reputation_award_call',
    coalesce(
      (
        select definition like
          '%award_gift_certificate_order_reputation_v1%'
        from function_contract
        limit 1
      ),
      false
    )

  union all

  select
    '18_qr_hash_only_contract',
    coalesce(
      (
        select definition like
          '%p_qr_token_hash%'
          and definition not like '%p_qr_token text%'
          and definition like '%hmac-sha256-v1%'
        from function_contract
        limit 1
      ),
      false
    )

  union all

  select
    '19_idempotent_replay',
    coalesce(
      (
        select definition like
          '%idempotent_replay%'
        from function_contract
        limit 1
      ),
      false
    )

  union all

  select
    '20_service_role_only_execute',
    coalesce(
      (
        select
          acl like '%service_role=X%'
          and acl not like '%anon=X%'
          and acl not like '%authenticated=X%'
          and acl !~ '(^|,)=X/'
        from function_contract
        limit 1
      ),
      false
    )
)
select
  check_code,
  passed
from checks
order by check_code;

select
  lifecycle_status,
  count(*) as certificate_count
from public.activity_gift_certificate_terms
group by lifecycle_status
order by lifecycle_status;

select
  activity_event_id,
  lifecycle_status,
  provider_actor_id,
  recipient_user_id,
  recipient_actor_id,
  points_price,
  points_transaction_id,
  public_code,
  qr_token_hash,
  qr_token_version,
  published_at,
  ordered_at
from public.activity_gift_certificate_terms
order by created_at, activity_event_id;
