-- ARCTor.app — PGC10F V2 read-only postcheck.
--
-- Confirms buyer response, 24-hour lazy auto-confirmation, certificate
-- finalization, and the deliberate deferral of actual activities for both
-- provider and recipient.

with definitions as (
  select
    pg_get_functiondef(
      to_regprocedure(
        'public.register_gift_certificate_fulfillment_checkin_v1(uuid,uuid,uuid,text,text)'
      )
    ) as checkin_body,
    pg_get_functiondef(
      to_regprocedure(
        'public.finalize_gift_certificate_fulfillment_success_v1(uuid,text,uuid,uuid)'
      )
    ) as finalize_body,
    pg_get_functiondef(
      to_regprocedure(
        'public.get_gift_certificate_fulfillment_confirmation_v1(uuid,uuid,uuid)'
      )
    ) as get_body,
    pg_get_functiondef(
      to_regprocedure(
        'public.respond_gift_certificate_fulfillment_v1(uuid,uuid,uuid,text,text)'
      )
    ) as respond_body
),
checks as (
  select
    '01_checkin_function_exists'::text as check_code,
    to_regprocedure(
      'public.register_gift_certificate_fulfillment_checkin_v1(uuid,uuid,uuid,text,text)'
    ) is not null as passed

  union all

  select
    '02_finalize_function_exists',
    to_regprocedure(
      'public.finalize_gift_certificate_fulfillment_success_v1(uuid,text,uuid,uuid)'
    ) is not null

  union all

  select
    '03_get_function_exists',
    to_regprocedure(
      'public.get_gift_certificate_fulfillment_confirmation_v1(uuid,uuid,uuid)'
    ) is not null

  union all

  select
    '04_respond_function_exists',
    to_regprocedure(
      'public.respond_gift_certificate_fulfillment_v1(uuid,uuid,uuid,text,text)'
    ) is not null

  union all

  select
    '05_all_four_security_definer',
    (
      select bool_and(procedure.prosecdef)
      from pg_proc procedure
      where procedure.oid in (
        to_regprocedure(
          'public.register_gift_certificate_fulfillment_checkin_v1(uuid,uuid,uuid,text,text)'
        ),
        to_regprocedure(
          'public.finalize_gift_certificate_fulfillment_success_v1(uuid,text,uuid,uuid)'
        ),
        to_regprocedure(
          'public.get_gift_certificate_fulfillment_confirmation_v1(uuid,uuid,uuid)'
        ),
        to_regprocedure(
          'public.respond_gift_certificate_fulfillment_v1(uuid,uuid,uuid,text,text)'
        )
      )
    )

  union all

  select
    '06_service_role_can_get_and_respond',
    has_function_privilege(
      'service_role',
      'public.get_gift_certificate_fulfillment_confirmation_v1(uuid,uuid,uuid)',
      'EXECUTE'
    )
    and has_function_privilege(
      'service_role',
      'public.respond_gift_certificate_fulfillment_v1(uuid,uuid,uuid,text,text)',
      'EXECUTE'
    )

  union all

  select
    '07_service_role_cannot_call_internal_finalizer',
    not has_function_privilege(
      'service_role',
      'public.finalize_gift_certificate_fulfillment_success_v1(uuid,text,uuid,uuid)',
      'EXECUTE'
    )

  union all

  select
    '08_anon_and_authenticated_cannot_call_new_rpcs',
    not has_function_privilege(
      'anon',
      'public.get_gift_certificate_fulfillment_confirmation_v1(uuid,uuid,uuid)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'authenticated',
      'public.get_gift_certificate_fulfillment_confirmation_v1(uuid,uuid,uuid)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'anon',
      'public.respond_gift_certificate_fulfillment_v1(uuid,uuid,uuid,text,text)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'authenticated',
      'public.respond_gift_certificate_fulfillment_v1(uuid,uuid,uuid,text,text)',
      'EXECUTE'
    )

  union all

  select
    '09_checkin_starts_confirmation_immediately',
    position(
      'v_request_due_at := v_now'
      in (select checkin_body from definitions)
    ) > 0
    and position(
      'v_now + make_interval'
      in (select checkin_body from definitions)
    ) > 0

  union all

  select
    '10_checkin_logs_completion_request',
    position(
      '''completion_requested'''
      in (select checkin_body from definitions)
    ) > 0

  union all

  select
    '11_exact_planned_time_does_not_block_confirmation',
    position(
      'greatest(v_now, v_activity.ended_at)'
      in (select checkin_body from definitions)
    ) = 0

  union all

  select
    '12_recipient_authorization_is_exact',
    position(
      'PGC10F_RECIPIENT_NOT_AUTHORIZED'
      in (select get_body from definitions)
    ) > 0
    and position(
      'PGC10F_RECIPIENT_NOT_AUTHORIZED'
      in (select respond_body from definitions)
    ) > 0

  union all

  select
    '13_no_checkin_returns_not_started',
    position(
      '''not_started'''
      in (select get_body from definitions)
    ) > 0

  union all

  select
    '14_get_performs_lazy_auto_confirmation',
    position(
      'response_deadline_at <= v_now'
      in (select get_body from definitions)
    ) > 0
    and position(
      '''auto'''
      in (select get_body from definitions)
    ) > 0

  union all

  select
    '15_buyer_supports_three_results',
    position(
      '''confirmed_by_buyer'''
      in (select respond_body from definitions)
    ) > 0
    and position(
      '''disputed'''
      in (select respond_body from definitions)
    ) > 0
    and position(
      '''partial_problem'''
      in (select respond_body from definitions)
    ) > 0

  union all

  select
    '16_late_buyer_response_becomes_auto_confirmed',
    position(
      'response_deadline_at <= v_now'
      in (select respond_body from definitions)
    ) > 0
    and position(
      '''auto'''
      in (select respond_body from definitions)
    ) > 0

  union all

  select
    '17_success_does_not_create_activity_event',
    position(
      'create_activity_event_pp1_v1'
      in lower((select finalize_body from definitions))
    ) = 0
    and position(
      'insert into public.activity_events'
      in lower((select finalize_body from definitions))
    ) = 0

  union all

  select
    '18_success_does_not_link_actual_activity',
    position(
      'actual_activity_event_id ='
      in lower((select finalize_body from definitions))
    ) = 0
    and position(
      '''actualActivityEventId'', null'
      in (select finalize_body from definitions)
    ) > 0

  union all

  select
    '19_success_marks_actual_activities_deferred',
    position(
      '''actualActivitiesCreated'', false'
      in (select finalize_body from definitions)
    ) > 0
    and position(
      '''actualActivitiesDeferred'', true'
      in (select finalize_body from definitions)
    ) > 0

  union all

  select
    '20_future_provider_and_recipient_sides_recorded',
    position(
      'jsonb_build_array(''provider'', ''recipient'')'
      in (select finalize_body from definitions)
    ) > 0

  union all

  select
    '21_success_redeems_certificate',
    position(
      'lifecycle_status = ''redeemed'''
      in (select finalize_body from definitions)
    ) > 0
    and position(
      'redeemed_at = v_now'
      in (select finalize_body from definitions)
    ) > 0

  union all

  select
    '22_dispute_does_not_redeem_certificate',
    position(
      'lifecycle_status = ''redeemed'''
      in (select respond_body from definitions)
    ) = 0

  union all

  select
    '23_success_is_idempotent',
    position(
      '''idempotent_replay'''
      in (select finalize_body from definitions)
    ) > 0

  union all

  select
    '24_points_and_reputation_unchanged',
    position(
      'points_transactions'
      in lower((select finalize_body from definitions))
    ) = 0
    and position(
      'actor_reputation_ledger'
      in lower((select finalize_body from definitions))
    ) = 0

  union all

  select
    '25_existing_checkin_owner_authorization_preserved',
    position(
      'PGC10D_PROVIDER_OWNER_NOT_AUTHORIZED'
      in (select checkin_body from definitions)
    ) > 0
    and position(
      'PGC10D_PROVIDER_MANAGER_NOT_AUTHORIZED'
      in (select checkin_body from definitions)
    ) > 0

  union all

  select
    '26_legacy_static_redemption_remains_disabled',
    not has_function_privilege(
      'service_role',
      'public.redeem_gift_certificate_activity_v1(uuid,uuid,uuid,text,text,text)',
      'EXECUTE'
    )

  union all

  select
    '27_success_events_are_logged',
    position(
      '''buyer_confirmed'''
      in (select finalize_body from definitions)
    ) > 0
    and position(
      '''auto_confirmed'''
      in (select finalize_body from definitions)
    ) > 0

  union all

  select
    '28_problem_events_are_logged',
    position(
      '''buyer_disputed'''
      in (select respond_body from definitions)
    ) > 0
    and position(
      '''buyer_partial_problem'''
      in (select respond_body from definitions)
    ) > 0

  union all

  select
    '29_auto_confirmation_requires_existing_checkin',
    position(
      'PGC10F_REGISTERED_CHECKIN_REQUIRED'
      in (select finalize_body from definitions)
    ) > 0

  union all

  select
    '30_finalization_metadata_preserves_future_work',
    position(
      '''giftCertificateActualActivitiesDeferred'', true'
      in (select finalize_body from definitions)
    ) > 0
    and position(
      '''giftCertificateFutureActivitySides'''
      in (select finalize_body from definitions)
    ) > 0
)
select check_code, passed
from checks
order by check_code;
