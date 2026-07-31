-- PGC9B — read-only postcheck.
-- Run after applying
-- 20260731083000_pgc9b_gift_certificate_redemption_foundation.sql.

with function_snapshot as (
  select
    p.oid,
    p.prosecdef,
    pg_get_functiondef(p.oid) as definition
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n
    on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'redeem_gift_certificate_activity_v1'
    and pg_get_function_identity_arguments(p.oid) =
      'p_provider_owner_user_id uuid, '
      'p_provider_manager_actor_id uuid, '
      'p_activity_event_id uuid, '
      'p_public_code text, '
      'p_qr_token_hash text, '
      'p_qr_token_version text'
),
checks as (
  select
    '01_redeemed_by_user_column_exists'::text as check_code,
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'activity_gift_certificate_terms'
        and column_name = 'redeemed_by_user_id'
        and data_type = 'uuid'
    ) as passed

  union all

  select
    '02_redeemed_by_actor_column_exists',
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'activity_gift_certificate_terms'
        and column_name = 'redeemed_by_actor_id'
        and data_type = 'uuid'
    )

  union all

  select
    '03_redeemed_by_pair_constraint_exists',
    exists (
      select 1
      from pg_constraint
      where conrelid =
        'public.activity_gift_certificate_terms'::regclass
        and conname =
          'activity_gift_certificate_redeemed_by_pair_check'
    )

  union all

  select
    '04_redeemed_by_index_exists',
    to_regclass(
      'public.activity_gift_certificate_redeemed_by_idx'
    ) is not null

  union all

  select
    '05_redemption_function_exists',
    exists (select 1 from function_snapshot)

  union all

  select
    '06_redemption_function_security_definer',
    coalesce(
      (select prosecdef from function_snapshot),
      false
    )

  union all

  select
    '07_service_role_can_execute',
    has_function_privilege(
      'service_role',
      'public.redeem_gift_certificate_activity_v1'
      '(uuid,uuid,uuid,text,text,text)',
      'EXECUTE'
    )

  union all

  select
    '08_anon_cannot_execute',
    not has_function_privilege(
      'anon',
      'public.redeem_gift_certificate_activity_v1'
      '(uuid,uuid,uuid,text,text,text)',
      'EXECUTE'
    )

  union all

  select
    '09_authenticated_cannot_execute',
    not has_function_privilege(
      'authenticated',
      'public.redeem_gift_certificate_activity_v1'
      '(uuid,uuid,uuid,text,text,text)',
      'EXECUTE'
    )

  union all

  select
    '10_provider_owner_authorization_present',
    position(
      'PGC9B_PROVIDER_OWNER_NOT_AUTHORIZED'
      in coalesce(
        (select definition from function_snapshot),
        ''
      )
    ) > 0

  union all

  select
    '11_provider_manager_authorization_present',
    position(
      'PGC9B_PROVIDER_MANAGER_NOT_AUTHORIZED'
      in coalesce(
        (select definition from function_snapshot),
        ''
      )
    ) > 0

  union all

  select
    '12_qr_hash_comparison_present',
    position(
      'v_terms_before.qr_token_hash is distinct from '
      'v_qr_token_hash'
      in coalesce(
        (select definition from function_snapshot),
        ''
      )
    ) > 0

  union all

  select
    '13_raw_qr_token_not_accepted',
    position(
      'p_raw_qr_token'
      in coalesce(
        (select definition from function_snapshot),
        ''
      )
    ) = 0

  union all

  select
    '14_public_code_comparison_present',
    position(
      'v_terms_before.public_code is distinct from '
      'v_public_code'
      in coalesce(
        (select definition from function_snapshot),
        ''
      )
    ) > 0

  union all

  select
    '15_only_active_transition_present',
    position(
      'PGC9B_ONLY_ACTIVE_CERTIFICATE_CAN_BE_REDEEMED'
      in coalesce(
        (select definition from function_snapshot),
        ''
      )
    ) > 0

  union all

  select
    '16_atomic_redeemed_update_present',
    position(
      'lifecycle_status = ''redeemed'''
      in coalesce(
        (select definition from function_snapshot),
        ''
      )
    ) > 0
    and position(
      'redeemed_at = v_now'
      in coalesce(
        (select definition from function_snapshot),
        ''
      )
    ) > 0

  union all

  select
    '17_idempotent_repeat_scan_present',
    position(
      '''disposition'', ''idempotent_replay'''
      in coalesce(
        (select definition from function_snapshot),
        ''
      )
    ) > 0

  union all

  select
    '18_validity_window_checks_present',
    position(
      'PGC9B_CERTIFICATE_NOT_YET_VALID'
      in coalesce(
        (select definition from function_snapshot),
        ''
      )
    ) > 0
    and position(
      'PGC9B_CERTIFICATE_VALIDITY_ENDED'
      in coalesce(
        (select definition from function_snapshot),
        ''
      )
    ) > 0

  union all

  select
    '19_no_points_or_reputation_write',
    position(
      'update public.user_points_wallets'
      in lower(
        coalesce(
          (select definition from function_snapshot),
          ''
        )
      )
    ) = 0
    and position(
      'insert into public.points_transactions'
      in lower(
        coalesce(
          (select definition from function_snapshot),
          ''
        )
      )
    ) = 0
    and position(
      'actor_reputation_ledger'
      in lower(
        coalesce(
          (select definition from function_snapshot),
          ''
        )
      )
    ) = 0

  union all

  select
    '20_planned_activity_not_converted_to_actual',
    position(
      'activity_role_code'
      in lower(
        coalesce(
          (select definition from function_snapshot),
          ''
        )
      )
    ) = 0
)
select check_code, passed
from checks
order by check_code;
