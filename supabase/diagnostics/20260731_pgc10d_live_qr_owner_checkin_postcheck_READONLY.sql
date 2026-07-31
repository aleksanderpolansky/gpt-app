-- ARCTor.app — PGC10D read-only postcheck.

with definitions as (
  select
    pg_get_functiondef(
      to_regprocedure(
        'public.issue_gift_certificate_fulfillment_qr_v1(uuid,uuid,uuid,text,text)'
      )
    ) as issue_body,
    pg_get_functiondef(
      to_regprocedure(
        'public.register_gift_certificate_fulfillment_checkin_v1(uuid,uuid,uuid,text,text)'
      )
    ) as checkin_body
),
checks as (
  select
    '01_issue_function_exists'::text as check_code,
    to_regprocedure(
      'public.issue_gift_certificate_fulfillment_qr_v1(uuid,uuid,uuid,text,text)'
    ) is not null as passed

  union all

  select
    '02_checkin_function_exists',
    to_regprocedure(
      'public.register_gift_certificate_fulfillment_checkin_v1(uuid,uuid,uuid,text,text)'
    ) is not null

  union all

  select
    '03_issue_function_security_definer',
    (
      select procedure.prosecdef
      from pg_proc procedure
      where procedure.oid = to_regprocedure(
        'public.issue_gift_certificate_fulfillment_qr_v1(uuid,uuid,uuid,text,text)'
      )
    )

  union all

  select
    '04_checkin_function_security_definer',
    (
      select procedure.prosecdef
      from pg_proc procedure
      where procedure.oid = to_regprocedure(
        'public.register_gift_certificate_fulfillment_checkin_v1(uuid,uuid,uuid,text,text)'
      )
    )

  union all

  select
    '05_service_role_can_issue',
    has_function_privilege(
      'service_role',
      'public.issue_gift_certificate_fulfillment_qr_v1(uuid,uuid,uuid,text,text)',
      'EXECUTE'
    )

  union all

  select
    '06_service_role_can_checkin',
    has_function_privilege(
      'service_role',
      'public.register_gift_certificate_fulfillment_checkin_v1(uuid,uuid,uuid,text,text)',
      'EXECUTE'
    )

  union all

  select
    '07_anon_cannot_issue_or_checkin',
    not has_function_privilege(
      'anon',
      'public.issue_gift_certificate_fulfillment_qr_v1(uuid,uuid,uuid,text,text)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'anon',
      'public.register_gift_certificate_fulfillment_checkin_v1(uuid,uuid,uuid,text,text)',
      'EXECUTE'
    )

  union all

  select
    '08_authenticated_cannot_issue_or_checkin',
    not has_function_privilege(
      'authenticated',
      'public.issue_gift_certificate_fulfillment_qr_v1(uuid,uuid,uuid,text,text)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'authenticated',
      'public.register_gift_certificate_fulfillment_checkin_v1(uuid,uuid,uuid,text,text)',
      'EXECUTE'
    )

  union all

  select
    '09_legacy_static_redemption_disabled',
    not has_function_privilege(
      'service_role',
      'public.redeem_gift_certificate_activity_v1(uuid,uuid,uuid,text,text,text)',
      'EXECUTE'
    )

  union all

  select
    '10_issue_accepts_hash_not_raw_token',
    position(
      'p_token_hash text'
      in (select issue_body from definitions)
    ) > 0
    and position(
      'p_raw_token'
      in (select issue_body from definitions)
    ) = 0

  union all

  select
    '11_issue_uses_policy_qr_ttl',
    position(
      'v_policy.qr_ttl_seconds'
      in (select issue_body from definitions)
    ) > 0

  union all

  select
    '12_issue_revokes_previous_live_qr',
    position(
      '''replaced_by_new_live_qr'''
      in (select issue_body from definitions)
    ) > 0
    and position(
      'status = ''revoked'''
      in (select issue_body from definitions)
    ) > 0

  union all

  select
    '13_issue_requires_exact_recipient',
    position(
      'PGC10D_RECIPIENT_NOT_AUTHORIZED'
      in (select issue_body from definitions)
    ) > 0

  union all

  select
    '14_issue_requires_active_certificate',
    position(
      'PGC10D_ONLY_ACTIVE_CERTIFICATE_CAN_ISSUE_QR'
      in (select issue_body from definitions)
    ) > 0

  union all

  select
    '15_issue_checks_validity_window',
    position(
      'PGC10D_CERTIFICATE_NOT_YET_VALID'
      in (select issue_body from definitions)
    ) > 0
    and position(
      'PGC10D_CERTIFICATE_VALIDITY_ENDED'
      in (select issue_body from definitions)
    ) > 0

  union all

  select
    '16_checkin_requires_provider_owner',
    position(
      'PGC10D_PROVIDER_OWNER_NOT_AUTHORIZED'
      in (select checkin_body from definitions)
    ) > 0

  union all

  select
    '17_checkin_requires_stored_manager_profile',
    position(
      'PGC10D_PROVIDER_MANAGER_NOT_AUTHORIZED'
      in (select checkin_body from definitions)
    ) > 0
    and position(
      'PGC10D_PROVIDER_CONTEXT_NOT_AVAILABLE'
      in (select checkin_body from definitions)
    ) > 0

  union all

  select
    '18_no_employee_role_delegation',
    position(
      'actor_space_roles'
      in lower((select checkin_body from definitions))
    ) = 0
    and position(
      'organization_space_role'
      in lower((select checkin_body from definitions))
    ) = 0

  union all

  select
    '19_staff_identity_is_owner_session',
    position(
      '''shared_provider_owner_session'''
      in (select checkin_body from definitions)
    ) > 0
    and position(
      '''provider_owner'''
      in (select checkin_body from definitions)
    ) > 0

  union all

  select
    '20_qr_is_consumed_atomically',
    position(
      'status = ''consumed'''
      in (select checkin_body from definitions)
    ) > 0
    and position(
      'and status = ''issued'''
      in (select checkin_body from definitions)
    ) > 0

  union all

  select
    '21_checkin_does_not_finalize_certificate',
    position(
      'lifecycle_status = ''redeemed'''
      in lower((select checkin_body from definitions))
    ) = 0
    and position(
      'redeemed_at'
      in lower((select checkin_body from definitions))
    ) = 0

  union all

  select
    '22_checkin_creates_pending_confirmation',
    position(
      'insert into public.activity_fulfillment_confirmations'
      in (select checkin_body from definitions)
    ) > 0
    and position(
      '''pending'''
      in (select checkin_body from definitions)
    ) > 0

  union all

  select
    '23_service_confirmation_due_at_planned_end',
    position(
      'v_activity.ended_at'
      in (select checkin_body from definitions)
    ) > 0
    and position(
      'v_request_due_at'
      in (select checkin_body from definitions)
    ) > 0

  union all

  select
    '24_no_points_or_reputation_write',
    position(
      'points_transactions'
      in lower((select checkin_body from definitions))
    ) = 0
    and position(
      'actor_reputation_ledger'
      in lower((select checkin_body from definitions))
    ) = 0

  union all

  select
    '25_audit_events_written',
    position(
      '''qr_issued'''
      in (select issue_body from definitions)
    ) > 0
    and position(
      '''qr_consumed'''
      in (select checkin_body from definitions)
    ) > 0
    and position(
      '''checkin_registered'''
      in (select checkin_body from definitions)
    ) > 0
)
select check_code, passed
from checks
order by check_code;
