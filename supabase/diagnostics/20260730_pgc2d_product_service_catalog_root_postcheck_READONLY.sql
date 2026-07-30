-- ARCTor.app — PGC2D product/service catalog root postcheck
-- READ ONLY

with function_definition as (
  select
    pg_get_functiondef(p.oid) as definition
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'create_product_service_leaf_v1'
),
checks as (
  select
    '01_unique_root_index_present'::text as check_code,
    exists (
      select 1
      from pg_catalog.pg_indexes
      where schemaname = 'public'
        and tablename = 'value_objects'
        and indexname = 'value_objects_products_services_root_uidx'
    ) as passed

  union all

  select
    '02_catalog_item_index_present',
    exists (
      select 1
      from pg_catalog.pg_indexes
      where schemaname = 'public'
        and tablename = 'value_objects'
        and indexname = 'value_objects_catalog_items_owner_idx'
    )

  union all

  select
    '03_create_rpc_present',
    exists (select 1 from function_definition)

  union all

  select
    '04_rpc_knows_hidden_root',
    exists (
      select 1
      from function_definition
      where definition like '%products_services%'
        and definition like '%system_hidden_from_observation_ui%'
    )

  union all

  select
    '05_rpc_knows_product_and_service',
    exists (
      select 1
      from function_definition
      where definition like '%product_type%'
        and definition like '%service_type%'
    )

  union all

  select
    '06_no_duplicate_catalog_roots',
    not exists (
      select 1
      from public.value_objects
      where node_role_code = 'structural'
        and metadata_json ->> 'system_root_code' = 'products_services'
      group by
        owner_user_id,
        owner_actor_id,
        coalesce(
          organization_id,
          '00000000-0000-0000-0000-000000000000'::uuid
        )
      having count(*) > 1
    )

  union all

  select
    '07_existing_catalog_roots_are_hidden_structural',
    not exists (
      select 1
      from public.value_objects
      where metadata_json ->> 'system_root_code' = 'products_services'
        and (
          node_role_code is distinct from 'structural'
          or object_kind is distinct from 'other'
          or parent_value_object_id is not null
          or metadata_json -> 'system_hidden_from_observation_ui'
             is distinct from 'true'::jsonb
        )
    )

  union all

  select
    '08_existing_catalog_items_are_supported_leaves',
    not exists (
      select 1
      from public.value_objects
      where metadata_json ->> 'catalog_contract' =
        'pgc2d-products-services-v1'
        and (
          node_role_code is distinct from 'activity_leaf'
          or object_kind not in ('product_type', 'service_type')
          or parent_value_object_id is null
          or root_value_object_id is null
        )
    )

  union all

  select
    '09_no_catalog_data_created_by_migration',
    not exists (
      select 1
      from public.value_objects
      where metadata_json ->> 'authoring_contract' in (
        'pgc2d-products-services-root-v1',
        'pgc2d-products-services-item-v1'
      )
    )
)
select check_code, passed
from checks
order by check_code;
