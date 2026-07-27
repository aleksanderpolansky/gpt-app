-- ARCTor.app P8 runtime residual check
-- READ ONLY

select
  (
    select count(*)
    from public.value_objects
    where metadata_json ? 'p8_runtime_token'
  ) as runtime_value_object_rows,
  (
    select count(*)
    from public.value_object_tree_operations
    where idempotency_key like 'p8rt-%'
  ) as runtime_operation_rows,
  (
    select count(*)
    from public.value_object_tree_operation_items item
    join public.value_object_tree_operations operation_row
      on operation_row.id = item.operation_id
    where operation_row.idempotency_key like 'p8rt-%'
  ) as runtime_operation_item_rows;
