-- ARCTor CRB1C read-only postcheck.
-- Expected: every row passed=true.

with materializer as (
  select p.prosrc as body
  from pg_catalog.pg_proc p
  where p.oid = to_regprocedure(
    'public.materialize_confirmed_purchase_reality_v1(uuid,uuid)'
  )
),
checks as (
  select
    '01_materializer_exists'::text as check_name,
    exists (select 1 from materializer) as passed,
    'materialize_confirmed_purchase_reality_v1(uuid,uuid)'::text as detail

  union all
  select
    '02_invalid_organization_acting_for_assignment_removed',
    coalesce((
      select position(
        'acting_for_actor_id = v_seller_organization_actor_id'
        in body
      ) = 0
      from materializer
    ), false),
    'organization actor is not forced into account-owned acting_for_actor_id'

  union all
  select
    '03_organization_actor_preserved_in_metadata',
    coalesce((
      select
        position('organizationActorId' in body) > 0
        and position('v_seller_organization_actor_id' in body) > 0
      from materializer
    ), false),
    'organization identity remains explicit'

  union all
  select
    '04_commerce_transaction_preserves_organization_actor',
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'commerce_transactions'
        and column_name = 'seller_organization_actor_id'
    ),
    'seller_organization_actor_id'

  union all
  select
    '05_purchase_and_sale_still_use_canonical_activity_rpc',
    coalesce((
      select
        position('create_activity_event_pp1_v1' in body) > 0
        and position('commerce-purchase:' in body) > 0
        and position('commerce-sale:' in body) > 0
      from materializer
    ), false),
    'canonical PP1 activity creation preserved'

  union all
  select
    '06_system_event_source_preserved',
    coalesce((
      select
        position('''source'', ''system_event''' in body) > 0
        and position('''source'', ''purchase_confirmation''' in body) = 0
      from materializer
    ), false),
    'CRB1B source hotfix remains active'

  union all
  select
    '07_purchase_confirmation_provenance_preserved',
    coalesce((
      select
        position('purchaseConfirmationId' in body) > 0
        and position('source_purchase_confirmation_id' in body) > 0
      from materializer
    ), false),
    'evidence linkage preserved'

  union all
  select
    '08_no_partial_rows_from_failed_runtime_attempts',
    (select count(*) = 0 from public.commerce_transactions),
    format(
      'commerce_transactions=%s',
      (select count(*) from public.commerce_transactions)
    )
)
select check_name, passed, detail
from checks
order by check_name;
