-- ARCTor.app
-- CUX4A1 cleanup postcheck — READ ONLY

with checks as (
  select
    10 as ord,
    'runtime_helper_removed' as check_code,
    to_regprocedure(
      'public.cux4a1_runtime_acceptance_helper_20260728()'
    ) is null as passed,
    jsonb_build_object(
      'procedure',
      to_regprocedure(
        'public.cux4a1_runtime_acceptance_helper_20260728()'
      )::text
    ) as details

  union all

  select
    20,
    'runtime_run_residuals_zero',
    not exists (
      select 1
      from public.activity_semantic_enrichment_runs_cux4
      where input_snapshot_json->>'fixture'= 'true'
        and input_snapshot_json ? 'fixtureKey'
    ),
    jsonb_build_object(
      'residual',
      (
        select count(*)
        from public.activity_semantic_enrichment_runs_cux4
        where input_snapshot_json->>'fixture'='true'
          and input_snapshot_json ? 'fixtureKey'
      )
    )

  union all

  select
    30,
    'runtime_activity_residuals_zero',
    not exists (
      select 1
      from public.activity_events
      where metadata_json->>'cux4a1RuntimeFixture'='true'
    ),
    jsonb_build_object(
      'residual',
      (
        select count(*)
        from public.activity_events
        where metadata_json->>'cux4a1RuntimeFixture'='true'
      )
    )

  union all

  select
    40,
    'runtime_operation_residuals_zero',
    not exists (
      select 1
      from public.activity_event_write_operations operation
      where operation.idempotency_key
        like 'cux4a1-runtime-20260728-%'
    ),
    jsonb_build_object(
      'residual',
      (
        select count(*)
        from public.activity_event_write_operations operation
        where operation.idempotency_key
          like 'cux4a1-runtime-20260728-%'
      )
    )
)
select
  row_number() over(order by ord) as check_no,
  check_code,
  passed,
  details
from checks
order by ord;
