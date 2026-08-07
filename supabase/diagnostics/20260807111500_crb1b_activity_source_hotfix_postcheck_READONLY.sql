-- ARCTor CRB1B read-only postcheck.
-- Expected: every row passed=true.

with source_constraint as (
  select pg_get_constraintdef(c.oid) as definition
  from pg_catalog.pg_constraint c
  where c.conrelid = 'public.activity_events'::regclass
    and c.conname = 'activity_events_source_check'
),
materializer as (
  select p.prosrc as body
  from pg_catalog.pg_proc p
  where p.oid = to_regprocedure(
    'public.materialize_confirmed_purchase_reality_v1(uuid,uuid)'
  )
),
checks as (
  select
    '01_source_constraint_allows_system_event'::text as check_name,
    coalesce((
      select position('system_event' in definition) > 0
      from source_constraint
    ), false) as passed,
    coalesce((select definition from source_constraint), 'missing') as detail

  union all
  select
    '02_source_constraint_does_not_allow_purchase_confirmation',
    coalesce((
      select position('purchase_confirmation' in definition) = 0
      from source_constraint
    ), false),
    'purchase_confirmation remains provenance metadata, not activity_events.source'

  union all
  select
    '03_purchase_template_uses_system_event',
    exists (
      select 1
      from public.activity_templates
      where template_scope = 'system'
        and slug = 'confirmed-purchase-v1'
        and default_source_type = 'system_event'
    ),
    'confirmed-purchase-v1'

  union all
  select
    '04_sale_template_uses_system_event',
    exists (
      select 1
      from public.activity_templates
      where template_scope = 'system'
        and slug = 'confirmed-sale-v1'
        and default_source_type = 'system_event'
    ),
    'confirmed-sale-v1'

  union all
  select
    '05_materializer_writes_system_event',
    coalesce((
      select
        position('''source'', ''system_event''' in body) > 0
      from materializer
    ), false),
    'both generated actual activities use an allowed source'

  union all
  select
    '06_materializer_no_longer_writes_purchase_confirmation_source',
    coalesce((
      select
        position('''source'', ''purchase_confirmation''' in body) = 0
      from materializer
    ), false),
    'invalid activity source removed'

  union all
  select
    '07_purchase_confirmation_provenance_preserved',
    coalesce((
      select
        position('purchaseConfirmationId' in body) > 0
        and position('source_purchase_confirmation_id' in body) > 0
      from materializer
    ), false),
    'evidence linkage remains explicit'

  union all
  select
    '08_no_partial_runtime_rows_from_failed_confirmation',
    (
      select count(*) = 0
      from public.commerce_transactions
    ),
    format(
      'commerce_transactions=%s',
      (select count(*) from public.commerce_transactions)
    )
)
select check_name, passed, detail
from checks
order by check_name;
