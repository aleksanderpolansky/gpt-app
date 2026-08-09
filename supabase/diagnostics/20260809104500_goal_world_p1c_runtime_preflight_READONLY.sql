-- ARCTor.app Goal World P1C
-- READ ONLY PRE-FLIGHT.

select
  count(*) as p1b_mapped_objects
from public.value_objects
where canonical_key is not null
  and definition_version = 1
  and origin_type_code = 'legacy';

select
  count(*) as p1b_definition_versions
from public.value_object_definition_versions
where source_context = 'P1B_LEGACY_VALUE_OBJECT_MAPPING_V1';

select
  to_regclass('public.value_object_facet_registry') is not null
    as facet_registry_exists,
  to_regclass('public.value_object_kind_registry') is not null
    as kind_registry_exists,
  to_regclass('public.value_object_definition_versions') is not null
    as definition_ledger_exists,
  to_regclass('public.value_object_ontology_write_requests') is not null
    as p1c_write_requests_already_exists;

select
  to_regprocedure(
    'public.create_value_object_ontology_v1(uuid,uuid,uuid,jsonb,text,text)'
  ) is not null as create_rpc_already_exists,
  to_regprocedure(
    'public.get_value_object_ontology_card_v1(uuid,uuid,uuid)'
  ) is not null as read_rpc_already_exists,
  to_regprocedure(
    'public.set_value_object_ontology_lifecycle_v1(uuid,uuid,uuid,text)'
  ) is not null as lifecycle_rpc_already_exists;
