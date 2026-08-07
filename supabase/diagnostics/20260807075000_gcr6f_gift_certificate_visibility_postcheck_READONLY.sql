-- ARCTor GCR6F read-only postcheck.
select '01_hide_function_exists' as check_name,
       to_regprocedure('public.hide_gift_certificate_activity_v1(uuid,uuid,uuid)') is not null as passed,
       coalesce(to_regprocedure('public.hide_gift_certificate_activity_v1(uuid,uuid,uuid)')::text, 'missing') as detail
union all
select '02_hide_security_definer',
       coalesce((select p.prosecdef
                 from pg_proc p
                 join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public'
                   and p.proname = 'hide_gift_certificate_activity_v1'
                   and pg_get_function_identity_arguments(p.oid) = 'p_owner_user_id uuid, p_manager_actor_id uuid, p_activity_event_id uuid'), false),
       coalesce((select p.prosecdef::text
                 from pg_proc p
                 join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public'
                   and p.proname = 'hide_gift_certificate_activity_v1'
                   and pg_get_function_identity_arguments(p.oid) = 'p_owner_user_id uuid, p_manager_actor_id uuid, p_activity_event_id uuid'), 'missing')
union all
select '03_hide_search_path_locked',
       coalesce((select array_to_string(p.proconfig, ',') like '%search_path=public, pg_temp%'
                 from pg_proc p
                 join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public'
                   and p.proname = 'hide_gift_certificate_activity_v1'
                   and pg_get_function_identity_arguments(p.oid) = 'p_owner_user_id uuid, p_manager_actor_id uuid, p_activity_event_id uuid'), false),
       coalesce((select array_to_string(p.proconfig, ',')
                 from pg_proc p
                 join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public'
                   and p.proname = 'hide_gift_certificate_activity_v1'
                   and pg_get_function_identity_arguments(p.oid) = 'p_owner_user_id uuid, p_manager_actor_id uuid, p_activity_event_id uuid'), 'missing')
union all
select '04_service_role_execute',
       has_function_privilege('service_role', 'public.hide_gift_certificate_activity_v1(uuid,uuid,uuid)', 'EXECUTE'),
       has_function_privilege('service_role', 'public.hide_gift_certificate_activity_v1(uuid,uuid,uuid)', 'EXECUTE')::text
union all
select '05_authenticated_no_execute',
       not has_function_privilege('authenticated', 'public.hide_gift_certificate_activity_v1(uuid,uuid,uuid)', 'EXECUTE'),
       has_function_privilege('authenticated', 'public.hide_gift_certificate_activity_v1(uuid,uuid,uuid)', 'EXECUTE')::text;
