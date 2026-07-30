-- ARCTor.app PGC6A
-- Read-only postcheck for the gift-certificate publication foundation.

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
    and p.proname = 'publish_gift_certificate_activity_v1'
    and pg_get_function_identity_arguments(p.oid)
      = 'p_owner_user_id uuid, p_manager_actor_id uuid, p_activity_event_id uuid'
),
checks as (
  select
    '01_published_at_column' as check_code,
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'activity_gift_certificate_terms'
        and column_name = 'published_at'
        and data_type = 'timestamp with time zone'
    ) as passed

  union all

  select
    '02_available_shape_constraint',
    exists (
      select 1
      from pg_constraint
      where conrelid = 'public.activity_gift_certificate_terms'::regclass
        and conname = 'activity_gift_certificate_available_shape_check'
    )

  union all

  select
    '03_available_overlap_index',
    to_regclass(
      'public.activity_gift_certificate_available_overlap_idx'
    ) is not null

  union all

  select
    '04_publication_trigger',
    exists (
      select 1
      from pg_trigger
      where tgrelid = 'public.activity_gift_certificate_terms'::regclass
        and tgname = 'activity_gift_certificate_publication_state_trg'
        and not tgisinternal
    )

  union all

  select
    '05_publication_function',
    exists (select 1 from function_contract)

  union all

  select
    '06_security_definer',
    coalesce(
      (select prosecdef from function_contract limit 1),
      false
    )

  union all

  select
    '07_locked_search_path',
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
    '08_owner_guard',
    coalesce(
      (
        select definition like
          '%PGC6A_CERTIFICATE_OWNER_MISMATCH%'
        from function_contract
        limit 1
      ),
      false
    )

  union all

  select
    '09_draft_only_transition',
    coalesce(
      (
        select definition like
          '%PGC6A_ONLY_DRAFT_CAN_BE_PUBLISHED%'
        from function_contract
        limit 1
      ),
      false
    )

  union all

  select
    '10_expired_validity_guard',
    coalesce(
      (
        select definition like
          '%PGC6A_VALIDITY_ALREADY_ENDED%'
        from function_contract
        limit 1
      ),
      false
    )

  union all

  select
    '11_overlap_limit_guard',
    coalesce(
      (
        select definition like
          '%PGC6A_PROVIDER_AVAILABLE_CERTIFICATE_LIMIT_REACHED%'
          and definition like '%v_overlap_count >= 3%'
        from function_contract
        limit 1
      ),
      false
    )

  union all

  select
    '12_activity_status_planned',
    coalesce(
      (
        select definition like
          '%status = ''planned''%'
        from function_contract
        limit 1
      ),
      false
    )

  union all

  select
    '13_idempotent_replay',
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
    '14_service_role_only_execute',
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
  provider_actor_id,
  lifecycle_status,
  available_from,
  available_until,
  published_at,
  recipient_user_id,
  public_code,
  qr_token_hash
from public.activity_gift_certificate_terms
order by created_at, activity_event_id;
