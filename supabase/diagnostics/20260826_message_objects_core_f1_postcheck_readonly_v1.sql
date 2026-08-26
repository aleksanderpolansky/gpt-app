-- ARCTor.app
-- MESSAGE OBJECTS CORE F1 — READ-ONLY POSTCHECK V1
-- Safe to run after ARCTOR_MESSAGE_OBJECTS_CORE_F1_DB_FOUNDATION_V1.sql.

with target_tables(table_name) as (
  values
    ('message_objects'),
    ('message_object_audience_actors'),
    ('message_object_relations'),
    ('message_object_distributions'),
    ('message_object_media')
),
table_checks as (
  select
    target.table_name,
    to_regclass('public.' || target.table_name) is not null as exists_ok,
    coalesce(class_row.relrowsecurity, false) as rls_ok,
    not has_table_privilege('anon', 'public.' || target.table_name, 'SELECT') as anon_select_blocked,
    not has_table_privilege('authenticated', 'public.' || target.table_name, 'SELECT') as authenticated_select_blocked,
    has_table_privilege('service_role', 'public.' || target.table_name, 'SELECT') as service_select_ok,
    has_table_privilege('service_role', 'public.' || target.table_name, 'INSERT') as service_insert_ok,
    has_table_privilege('service_role', 'public.' || target.table_name, 'UPDATE') as service_update_ok,
    has_table_privilege('service_role', 'public.' || target.table_name, 'DELETE') as service_delete_ok
  from target_tables target
  left join pg_class class_row
    on class_row.oid = to_regclass('public.' || target.table_name)
)
select
  case
    when bool_and(
      exists_ok
      and rls_ok
      and anon_select_blocked
      and authenticated_select_blocked
      and service_select_ok
      and service_insert_ok
      and service_update_ok
      and service_delete_ok
    )
    and to_regprocedure(
      'public.create_message_object_v1(uuid,uuid,uuid,text,text,jsonb,text,text,jsonb,text,text,timestamp with time zone,text,text,text,text,text,timestamp with time zone,jsonb)'
    ) is not null
    and to_regprocedure('public.activate_message_object_v1(uuid,uuid)') is not null
    and to_regprocedure('public.withdraw_message_object_v1(uuid,uuid)') is not null
    then 'PASS'
    else 'FAIL'
  end as status,
  jsonb_agg(
    jsonb_build_object(
      'table', table_name,
      'exists', exists_ok,
      'rls', rls_ok,
      'anonSelectBlocked', anon_select_blocked,
      'authenticatedSelectBlocked', authenticated_select_blocked,
      'serviceSelect', service_select_ok,
      'serviceInsert', service_insert_ok,
      'serviceUpdate', service_update_ok,
      'serviceDelete', service_delete_ok
    )
    order by table_name
  ) as table_checks,
  to_regclass('public.chat_messages') is not null as legacy_chat_messages_preserved,
  to_regclass('public.message_objects') is not null as message_objects_present,
  to_regprocedure(
    'public.create_message_object_v1(uuid,uuid,uuid,text,text,jsonb,text,text,jsonb,text,text,timestamp with time zone,text,text,text,text,text,timestamp with time zone,jsonb)'
  ) is not null as create_rpc_present,
  to_regprocedure('public.activate_message_object_v1(uuid,uuid)') is not null as activate_rpc_present,
  to_regprocedure('public.withdraw_message_object_v1(uuid,uuid)') is not null as withdraw_rpc_present
from table_checks;
