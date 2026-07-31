-- PGC8B read-only postcheck.

with checks as (
  select '01_policy_table_exists'::text as check_code,
    to_regclass('public.owner_commercial_limit_policies') is not null as passed
  union all
  select '02_entitlement_table_exists',
    to_regclass('public.owner_commercial_limit_entitlements') is not null
  union all
  select '03_three_active_policy_rows',
    (
      select count(*) = 3
      from public.owner_commercial_limit_policies
      where is_active = true
        and limit_code in (
          'gift_certificates_available',
          'points_awarded_monthly',
          'purchase_confirmations_monthly'
        )
    )
  union all
  select '04_free_certificate_limit_is_3',
    (
      select free_limit_value = 3
      from public.owner_commercial_limit_policies
      where limit_code = 'gift_certificates_available'
    )
  union all
  select '05_free_monthly_points_limit_is_2000',
    (
      select free_limit_value = 2000
      from public.owner_commercial_limit_policies
      where limit_code = 'points_awarded_monthly'
    )
  union all
  select '06_free_monthly_confirmation_limit_is_5',
    (
      select free_limit_value = 5
      from public.owner_commercial_limit_policies
      where limit_code = 'purchase_confirmations_monthly'
    )
  union all
  select '07_policy_rls_enabled',
    (
      select relrowsecurity
      from pg_class
      where oid = 'public.owner_commercial_limit_policies'::regclass
    )
  union all
  select '08_entitlement_rls_enabled',
    (
      select relrowsecurity
      from pg_class
      where oid = 'public.owner_commercial_limit_entitlements'::regclass
    )
  union all
  select '09_resolver_exists',
    to_regprocedure(
      'public.resolve_owner_commercial_limit_v1(uuid,text,timestamptz)'
    ) is not null
  union all
  select '10_resolver_is_security_definer',
    (
      select prosecdef
      from pg_proc
      where oid = to_regprocedure(
        'public.resolve_owner_commercial_limit_v1(uuid,text,timestamptz)'
      )
    )
  union all
  select '11_service_role_can_execute_resolver',
    has_function_privilege(
      'service_role',
      'public.resolve_owner_commercial_limit_v1(uuid,text,timestamptz)',
      'EXECUTE'
    )
  union all
  select '12_anon_cannot_execute_resolver',
    not has_function_privilege(
      'anon',
      'public.resolve_owner_commercial_limit_v1(uuid,text,timestamptz)',
      'EXECUTE'
    )
  union all
  select '13_authenticated_cannot_execute_resolver',
    not has_function_privilege(
      'authenticated',
      'public.resolve_owner_commercial_limit_v1(uuid,text,timestamptz)',
      'EXECUTE'
    )
  union all
  select '14_publish_uses_owner_limit_resolver',
    position(
      'resolve_owner_commercial_limit_v1'
      in pg_get_functiondef(
        to_regprocedure(
          'public.publish_gift_certificate_activity_v1(uuid,uuid,uuid)'
        )
      )
    ) > 0
  union all
  select '15_publish_counts_provider_owner',
    position(
      'existing.provider_owner_user_id = p_owner_user_id'
      in pg_get_functiondef(
        to_regprocedure(
          'public.publish_gift_certificate_activity_v1(uuid,uuid,uuid)'
        )
      )
    ) > 0
  union all
  select '16_publish_no_longer_counts_provider_actor',
    position(
      'where existing.provider_actor_id = v_terms.provider_actor_id'
      in pg_get_functiondef(
        to_regprocedure(
          'public.publish_gift_certificate_activity_v1(uuid,uuid,uuid)'
        )
      )
    ) = 0
  union all
  select '17_submit_blocks_self_purchase_in_database',
    position(
      'PGC8B_BUYER_CANNOT_SUBMIT_PURCHASE_AT_OWN_ORGANIZATION'
      in pg_get_functiondef(
        to_regprocedure(
          'public.submit_purchase_confirmation(uuid,uuid,numeric,text,text,text)'
        )
      )
    ) > 0
  union all
  select '18_confirm_verifies_organization_owner',
    position(
      'PGC8B_ONLY_ORGANIZATION_OWNER_CAN_CONFIRM_PURCHASE'
      in pg_get_functiondef(
        to_regprocedure(
          'public.confirm_purchase_and_award_points(uuid,uuid,text)'
        )
      )
    ) > 0
  union all
  select '19_confirm_blocks_owner_self_purchase',
    position(
      'PGC8B_OWNER_CANNOT_CONFIRM_OWN_PURCHASE'
      in pg_get_functiondef(
        to_regprocedure(
          'public.confirm_purchase_and_award_points(uuid,uuid,text)'
        )
      )
    ) > 0
  union all
  select '20_confirm_uses_monthly_points_policy',
    position(
      'points_awarded_monthly'
      in pg_get_functiondef(
        to_regprocedure(
          'public.confirm_purchase_and_award_points(uuid,uuid,text)'
        )
      )
    ) > 0
  union all
  select '21_confirm_uses_shared_enterprise_policy',
    position(
      'purchase_confirmations_monthly'
      in pg_get_functiondef(
        to_regprocedure(
          'public.confirm_purchase_and_award_points(uuid,uuid,text)'
        )
      )
    ) > 0
    and position(
      'organization.created_by_user_id'
      in pg_get_functiondef(
        to_regprocedure(
          'public.confirm_purchase_and_award_points(uuid,uuid,text)'
        )
      )
    ) > 0
  union all
  select '22_order_self_protection_remains_owner_level',
    position(
      'v_terms_before.provider_owner_user_id'
      in pg_get_functiondef(
        to_regprocedure(
          'public.request_gift_certificate_activity_v1(uuid,uuid,uuid,text,text,text,text)'
        )
      )
    ) > 0
  union all
  select '23_one_active_certificate_uses_recipient_user',
    position(
      'existing.recipient_user_id = p_buyer_user_id'
      in pg_get_functiondef(
        to_regprocedure(
          'public.request_gift_certificate_activity_v1(uuid,uuid,uuid,text,text,text,text)'
        )
      )
    ) > 0
  union all
  select '24_entitlement_lookup_index_exists',
    to_regclass(
      'public.owner_commercial_limit_entitlements_lookup_idx'
    ) is not null
  union all
  select '25_entitlement_source_unique_index_exists',
    to_regclass(
      'public.owner_commercial_limit_entitlements_source_uidx'
    ) is not null
)
select check_code, passed
from checks
order by check_code;
