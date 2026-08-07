-- ARCTor GCR6H read-only postcheck.
-- Expected: every row returns passed=true.

with checks as (
  select
    '01_visibility_column_exists'::text as check_name,
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'activity_gift_certificate_terms'
        and column_name = 'public_visibility_status'
        and is_nullable = 'NO'
    ) as passed,
    null::text as detail

  union all
  select
    '02_visibility_constraint_validated',
    exists (
      select 1
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public'
        and t.relname = 'activity_gift_certificate_terms'
        and c.conname = 'activity_gift_certificate_terms_public_visibility_check'
        and c.convalidated
    ),
    null

  union all
  select
    '03_visibility_function_exists',
    to_regprocedure('public.set_gift_certificate_public_visibility_v1(uuid,uuid,uuid,text)') is not null,
    coalesce(to_regprocedure('public.set_gift_certificate_public_visibility_v1(uuid,uuid,uuid,text)')::text, 'missing')

  union all
  select
    '04_visibility_security_definer',
    coalesce((
      select p.prosecdef
      from pg_proc p
      where p.oid = to_regprocedure('public.set_gift_certificate_public_visibility_v1(uuid,uuid,uuid,text)')
    ), false),
    coalesce((
      select p.prosecdef::text
      from pg_proc p
      where p.oid = to_regprocedure('public.set_gift_certificate_public_visibility_v1(uuid,uuid,uuid,text)')
    ), 'missing')

  union all
  select
    '05_visibility_search_path_locked',
    coalesce((
      select 'search_path=public, pg_temp' = any(coalesce(p.proconfig, array[]::text[]))
      from pg_proc p
      where p.oid = to_regprocedure('public.set_gift_certificate_public_visibility_v1(uuid,uuid,uuid,text)')
    ), false),
    coalesce((
      select array_to_string(p.proconfig, ',')
      from pg_proc p
      where p.oid = to_regprocedure('public.set_gift_certificate_public_visibility_v1(uuid,uuid,uuid,text)')
    ), 'missing')

  union all
  select
    '06_service_role_execute',
    has_function_privilege(
      'service_role',
      'public.set_gift_certificate_public_visibility_v1(uuid,uuid,uuid,text)',
      'EXECUTE'
    ),
    has_function_privilege(
      'service_role',
      'public.set_gift_certificate_public_visibility_v1(uuid,uuid,uuid,text)',
      'EXECUTE'
    )::text

  union all
  select
    '07_authenticated_no_execute',
    not has_function_privilege(
      'authenticated',
      'public.set_gift_certificate_public_visibility_v1(uuid,uuid,uuid,text)',
      'EXECUTE'
    ),
    has_function_privilege(
      'authenticated',
      'public.set_gift_certificate_public_visibility_v1(uuid,uuid,uuid,text)',
      'EXECUTE'
    )::text

  union all
  select
    '08_legacy_hide_function_removed',
    to_regprocedure('public.hide_gift_certificate_activity_v1(uuid,uuid,uuid)') is null,
    coalesce(to_regprocedure('public.hide_gift_certificate_activity_v1(uuid,uuid,uuid)')::text, 'removed')

  union all
  select
    '09_order_guard_trigger_present',
    exists (
      select 1
      from pg_trigger tg
      join pg_class t on t.oid = tg.tgrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public'
        and t.relname = 'activity_gift_certificate_terms'
        and tg.tgname = 'trg_guard_gift_certificate_visibility_lifecycle_v1'
        and not tg.tgisinternal
    ),
    null

  union all
  select
    '10_legacy_drafts_are_hidden',
    not exists (
      select 1
      from public.activity_gift_certificate_terms
      where lifecycle_status = 'draft'
        and public_visibility_status <> 'hidden'
    ),
    count(*) filter (
      where lifecycle_status = 'draft'
        and public_visibility_status = 'hidden'
    )::text
  from public.activity_gift_certificate_terms

  union all
  select
    '11_visibility_function_does_not_touch_financial_fields',
    position('points_transaction_id =' in lower(pg_get_functiondef(to_regprocedure('public.set_gift_certificate_public_visibility_v1(uuid,uuid,uuid,text)')))) = 0
      and position('recipient_actor_id =' in lower(pg_get_functiondef(to_regprocedure('public.set_gift_certificate_public_visibility_v1(uuid,uuid,uuid,text)')))) = 0
      and position('lifecycle_status =' in lower(pg_get_functiondef(to_regprocedure('public.set_gift_certificate_public_visibility_v1(uuid,uuid,uuid,text)')))) = 0,
    'visibility-only update'
)
select check_name, passed, detail
from checks
order by check_name;
