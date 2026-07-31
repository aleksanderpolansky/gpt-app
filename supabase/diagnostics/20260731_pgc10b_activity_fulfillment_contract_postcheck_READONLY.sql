-- ARCTor.app — PGC10B read-only postcheck.

with checks as (
  select
    '01_policy_table_exists'::text as check_code,
    to_regclass('public.activity_fulfillment_policies')
      is not null as passed

  union all
  select
    '02_qr_sessions_table_exists',
    to_regclass('public.activity_fulfillment_qr_sessions')
      is not null

  union all
  select
    '03_checkins_table_exists',
    to_regclass('public.activity_fulfillment_checkins')
      is not null

  union all
  select
    '04_confirmations_table_exists',
    to_regclass('public.activity_fulfillment_confirmations')
      is not null

  union all
  select
    '05_event_log_table_exists',
    to_regclass('public.activity_fulfillment_event_log')
      is not null

  union all
  select
    '06_gift_certificate_policy_seeded',
    exists (
      select 1
      from public.activity_fulfillment_policies policy
      join public.activity_templates template
        on template.id = policy.activity_template_id
      where template.slug = 'gift-certificate-v1'
        and policy.policy_code = 'gift-certificate-v1'
        and policy.status = 'active'
    )

  union all
  select
    '07_qr_ttl_is_60_seconds',
    exists (
      select 1
      from public.activity_fulfillment_policies policy
      where policy.policy_code = 'gift-certificate-v1'
        and policy.qr_ttl_seconds = 60
    )

  union all
  select
    '08_auto_confirm_delay_is_24_hours',
    exists (
      select 1
      from public.activity_fulfillment_policies policy
      where policy.policy_code = 'gift-certificate-v1'
        and policy.auto_confirm_delay_minutes = 1440
    )

  union all
  select
    '09_checkin_and_buyer_confirmation_required',
    exists (
      select 1
      from public.activity_fulfillment_policies policy
      where policy.policy_code = 'gift-certificate-v1'
        and policy.requires_checkin = true
        and policy.requires_buyer_confirmation = true
    )

  union all
  select
    '10_raw_qr_token_not_stored',
    not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'activity_fulfillment_qr_sessions'
        and column_name in ('raw_token', 'raw_qr_token', 'qr_token')
    )

  union all
  select
    '11_qr_hash_unique',
    exists (
      select 1
      from pg_indexes
      where schemaname = 'public'
        and tablename = 'activity_fulfillment_qr_sessions'
        and indexname = 'activity_fulfillment_qr_token_hash_uidx'
        and indexdef ilike '%unique%'
    )

  union all
  select
    '12_one_live_qr_per_certificate_recipient',
    exists (
      select 1
      from pg_indexes
      where schemaname = 'public'
        and tablename = 'activity_fulfillment_qr_sessions'
        and indexname = 'activity_fulfillment_one_issued_qr_uidx'
        and indexdef ilike '%status = ''issued''%'
    )

  union all
  select
    '13_qr_expiry_index_exists',
    to_regclass(
      'public.activity_fulfillment_qr_expiry_idx'
    ) is not null

  union all
  select
    '14_checkin_records_individual_staff',
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'activity_fulfillment_checkins'
        and column_name = 'staff_user_id'
    )
    and exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'activity_fulfillment_checkins'
        and column_name = 'staff_actor_id'
    )

  union all
  select
    '15_checkin_records_buyer_identity',
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'activity_fulfillment_checkins'
        and column_name = 'recipient_user_id'
    )
    and exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'activity_fulfillment_checkins'
        and column_name = 'recipient_actor_id'
    )

  union all
  select
    '16_checkin_can_link_actual_activity',
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'activity_fulfillment_checkins'
        and column_name = 'actual_activity_event_id'
    )

  union all
  select
    '17_one_registered_checkin_per_plan',
    exists (
      select 1
      from pg_indexes
      where schemaname = 'public'
        and tablename = 'activity_fulfillment_checkins'
        and indexname =
          'activity_fulfillment_one_registered_checkin_uidx'
        and indexdef ilike '%status = ''registered''%'
    )

  union all
  select
    '18_confirmation_supports_three_buyer_results',
    exists (
      select 1
      from pg_constraint constraint_row
      where constraint_row.conrelid =
        'public.activity_fulfillment_confirmations'::regclass
        and constraint_row.conname =
          'activity_fulfillment_confirmations_status_check'
        and pg_get_constraintdef(constraint_row.oid)
          ilike '%confirmed_by_buyer%'
        and pg_get_constraintdef(constraint_row.oid)
          ilike '%disputed%'
        and pg_get_constraintdef(constraint_row.oid)
          ilike '%partial_problem%'
    )

  union all
  select
    '19_auto_confirmed_state_supported',
    exists (
      select 1
      from pg_constraint constraint_row
      where constraint_row.conrelid =
        'public.activity_fulfillment_confirmations'::regclass
        and constraint_row.conname =
          'activity_fulfillment_confirmations_status_check'
        and pg_get_constraintdef(constraint_row.oid)
          ilike '%auto_confirmed%'
    )

  union all
  select
    '20_confirmation_deadline_fields_exist',
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'activity_fulfillment_confirmations'
        and column_name = 'request_due_at'
    )
    and exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'activity_fulfillment_confirmations'
        and column_name = 'response_deadline_at'
    )

  union all
  select
    '21_event_log_is_immutable',
    exists (
      select 1
      from pg_trigger trigger_row
      where trigger_row.tgrelid =
        'public.activity_fulfillment_event_log'::regclass
        and trigger_row.tgname =
          'activity_fulfillment_event_log_immutable_trg'
        and not trigger_row.tgisinternal
    )

  union all
  select
    '22_rls_enabled_on_all_five_tables',
    (
      select count(*) = 5
      from pg_class class_row
      join pg_namespace namespace_row
        on namespace_row.oid = class_row.relnamespace
      where namespace_row.nspname = 'public'
        and class_row.relname in (
          'activity_fulfillment_policies',
          'activity_fulfillment_qr_sessions',
          'activity_fulfillment_checkins',
          'activity_fulfillment_confirmations',
          'activity_fulfillment_event_log'
        )
        and class_row.relrowsecurity = true
    )

  union all
  select
    '23_anon_has_no_table_privileges',
    not exists (
      select 1
      from information_schema.role_table_grants grant_row
      where grant_row.grantee = 'anon'
        and grant_row.table_schema = 'public'
        and grant_row.table_name in (
          'activity_fulfillment_policies',
          'activity_fulfillment_qr_sessions',
          'activity_fulfillment_checkins',
          'activity_fulfillment_confirmations',
          'activity_fulfillment_event_log'
        )
    )

  union all
  select
    '24_authenticated_has_no_table_privileges',
    not exists (
      select 1
      from information_schema.role_table_grants grant_row
      where grant_row.grantee = 'authenticated'
        and grant_row.table_schema = 'public'
        and grant_row.table_name in (
          'activity_fulfillment_policies',
          'activity_fulfillment_qr_sessions',
          'activity_fulfillment_checkins',
          'activity_fulfillment_confirmations',
          'activity_fulfillment_event_log'
        )
    )

  union all
  select
    '25_service_role_has_expected_access',
    has_table_privilege(
      'service_role',
      'public.activity_fulfillment_policies',
      'SELECT,INSERT,UPDATE'
    )
    and has_table_privilege(
      'service_role',
      'public.activity_fulfillment_qr_sessions',
      'SELECT,INSERT,UPDATE'
    )
    and has_table_privilege(
      'service_role',
      'public.activity_fulfillment_checkins',
      'SELECT,INSERT,UPDATE'
    )
    and has_table_privilege(
      'service_role',
      'public.activity_fulfillment_confirmations',
      'SELECT,INSERT,UPDATE'
    )
    and has_table_privilege(
      'service_role',
      'public.activity_fulfillment_event_log',
      'SELECT,INSERT'
    )
)
select check_code, passed
from checks
order by check_code;
