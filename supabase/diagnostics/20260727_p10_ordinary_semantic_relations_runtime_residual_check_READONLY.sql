-- ARCTor.app
-- P10 runtime residual check
-- READ ONLY

select
  (
    select count(*)
    from public.value_object_relation_operations
    where idempotency_key like 'p10-runtime-%'
  ) as runtime_operation_rows,
  (
    select count(*)
    from public.value_objects
    where metadata_json ->> 'fixture' in (
      'p10_runtime',
      'p10_runtime_foreign'
    )
  ) as runtime_value_object_rows,
  (
    select count(*)
    from public.value_object_relations relation
    join public.value_objects source_object
      on source_object.id = relation.source_value_object_id
    where source_object.metadata_json ->> 'fixture' in (
      'p10_runtime',
      'p10_runtime_foreign'
    )
  ) +
  (
    select count(*)
    from public.value_object_relations relation
    join public.value_objects target_object
      on target_object.id = relation.target_value_object_id
    where target_object.metadata_json ->> 'fixture' in (
      'p10_runtime',
      'p10_runtime_foreign'
    )
  ) as runtime_relation_references;
