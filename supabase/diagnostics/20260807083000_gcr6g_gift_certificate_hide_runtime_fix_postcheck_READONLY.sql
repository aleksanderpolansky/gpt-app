-- ARCTor GCR6G read-only postcheck.
-- No writes. Expected: every row passed = true.

with fn as (
  select
    p.oid,
    p.proname,
    p.prosecdef,
    coalesce(array_to_string(p.proconfig, ','), '') as proconfig,
    pg_get_functiondef(p.oid) as definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      'hide_gift_certificate_activity_v1',
      'publish_gift_certificate_activity_v1',
      'enforce_gift_certificate_publication_state_v1'
    )
),
checks as (
  select
    '01_hide_function_exists'::text as check_name,
    exists (select 1 from fn where proname = 'hide_gift_certificate_activity_v1') as passed,
    coalesce((select proname from fn where proname = 'hide_gift_certificate_activity_v1' limit 1), 'missing')::text as detail

  union all

  select
    '02_hide_security_definer',
    coalesce((select prosecdef from fn where proname = 'hide_gift_certificate_activity_v1' limit 1), false),
    coalesce((select prosecdef::text from fn where proname = 'hide_gift_certificate_activity_v1' limit 1), 'missing')

  union all

  select
    '03_hide_search_path_locked',
    coalesce((select proconfig ilike '%search_path=public, pg_temp%' from fn where proname = 'hide_gift_certificate_activity_v1' limit 1), false),
    coalesce((select proconfig from fn where proname = 'hide_gift_certificate_activity_v1' limit 1), 'missing')

  union all

  select
    '04_hide_preserves_published_at',
    coalesce((
      select lower(definition) not like '%published_at = null%'
         and lower(definition) like '%lifecycle_status = ''draft''%'
      from fn where proname = 'hide_gift_certificate_activity_v1' limit 1
    ), false),
    'hide must not clear first published_at'

  union all

  select
    '05_publish_supports_reshow',
    coalesce((
      select lower(definition) like '%v_is_reshow%'
         and lower(definition) like '%v_first_published_at%'
         and lower(definition) like '%''shown''%'
      from fn where proname = 'publish_gift_certificate_activity_v1' limit 1
    ), false),
    'publish RPC distinguishes first publication from showing a hidden offer'

  union all

  select
    '06_published_at_guard_retained',
    coalesce((
      select lower(definition) like '%pgc6a_certificate_published_at_immutable%'
      from fn where proname = 'enforce_gift_certificate_publication_state_v1' limit 1
    ), false),
    'first publication timestamp remains immutable'

  union all

  select
    '07_service_role_hide_execute',
    has_function_privilege('service_role','public.hide_gift_certificate_activity_v1(uuid,uuid,uuid)','EXECUTE'),
    has_function_privilege('service_role','public.hide_gift_certificate_activity_v1(uuid,uuid,uuid)','EXECUTE')::text

  union all

  select
    '08_authenticated_no_hide_execute',
    not has_function_privilege('authenticated','public.hide_gift_certificate_activity_v1(uuid,uuid,uuid)','EXECUTE'),
    has_function_privilege('authenticated','public.hide_gift_certificate_activity_v1(uuid,uuid,uuid)','EXECUTE')::text
)
select check_name, passed, detail
from checks
order by check_name;
