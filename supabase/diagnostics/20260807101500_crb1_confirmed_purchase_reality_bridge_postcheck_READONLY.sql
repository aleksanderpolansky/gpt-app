-- ARCTor CRB1 read-only postcheck.
-- Expected: every row passed=true.
-- This query does not modify data.

with function_defs as (
  select
    procedure_row.proname,
    procedure_row.prosecdef,
    pg_get_functiondef(procedure_row.oid) as definition
  from pg_catalog.pg_proc procedure_row
  join pg_catalog.pg_namespace namespace_row
    on namespace_row.oid = procedure_row.pronamespace
  where namespace_row.nspname = 'public'
    and procedure_row.proname in (
      'materialize_confirmed_purchase_reality_v1',
      'confirm_purchase_and_award_points'
    )
),
materializer as (
  select *
  from function_defs
  where proname = 'materialize_confirmed_purchase_reality_v1'
  limit 1
),
confirmer as (
  select *
  from function_defs
  where proname = 'confirm_purchase_and_award_points'
  limit 1
),
checks as (
  select
    '01_commerce_transactions_exists'::text as check_name,
    to_regclass('public.commerce_transactions') is not null as passed,
    to_regclass('public.commerce_transactions')::text as detail

  union all
  select
    '02_commerce_transaction_items_exists',
    to_regclass('public.commerce_transaction_items') is not null,
    to_regclass('public.commerce_transaction_items')::text

  union all
  select
    '03_source_purchase_confirmation_unique',
    exists (
      select 1
      from pg_catalog.pg_constraint constraint_row
      where constraint_row.conrelid = 'public.commerce_transactions'::regclass
        and constraint_row.contype = 'u'
        and pg_get_constraintdef(constraint_row.oid)
          ilike '%source_purchase_confirmation_id%'
    ),
    'one economic transaction per purchase confirmation'

  union all
  select
    '04_purchase_activity_template_present',
    exists (
      select 1
      from public.activity_templates
      where template_scope = 'system'
        and slug = 'confirmed-purchase-v1'
        and status = 'active'
        and is_active = true
    ),
    'confirmed-purchase-v1'

  union all
  select
    '05_sale_activity_template_present',
    exists (
      select 1
      from public.activity_templates
      where template_scope = 'system'
        and slug = 'confirmed-sale-v1'
        and status = 'active'
        and is_active = true
    ),
    'confirmed-sale-v1'

  union all
  select
    '06_materializer_exists',
    to_regprocedure(
      'public.materialize_confirmed_purchase_reality_v1(uuid,uuid)'
    ) is not null,
    'materialize_confirmed_purchase_reality_v1(uuid,uuid)'

  union all
  select
    '07_materializer_security_definer',
    coalesce((select prosecdef from materializer), false),
    coalesce((select prosecdef::text from materializer), 'missing')

  union all
  select
    '08_materializer_uses_canonical_activity_rpc',
    coalesce(
      (
        select
          position('create_activity_event_pp1_v1' in definition) > 0
          and position('commerce-purchase:' in definition) > 0
          and position('commerce-sale:' in definition) > 0
        from materializer
      ),
      false
    ),
    'buyer and seller actual activities use PP1 idempotent creation'

  union all
  select
    '09_confirm_still_awards_points_through_existing_ledger',
    coalesce(
      (
        select position('add_points_to_wallet' in definition) > 0
        from confirmer
      ),
      false
    ),
    'POINTS ledger path preserved'

  union all
  select
    '10_confirm_calls_reality_materializer',
    coalesce(
      (
        select position(
          'materialize_confirmed_purchase_reality_v1'
          in definition
        ) > 0
        from confirmer
      ),
      false
    ),
    'same confirmation RPC bridges into reality model'

  union all
  select
    '11_existing_owner_limits_preserved',
    coalesce(
      (
        select
          position('points_awarded_monthly' in definition) > 0
          and position('purchase_confirmations_monthly' in definition) > 0
          and position('resolve_owner_commercial_limit_v1' in definition) > 0
        from confirmer
      ),
      false
    ),
    'monthly POINTS and confirmation limits still present'

  union all
  select
    '12_no_ai_fact_or_goal_world_write_in_materializer',
    coalesce(
      (
        select
          position('activity_event_measures' in definition) = 0
          and position('activity_object_facts' in definition) = 0
          and position('goal_world' in definition) = 0
        from materializer
      ),
      false
    ),
    'CRB1 stops before AI/facts/VO-ON/goal worlds'

  union all
  select
    '13_item_value_object_is_nullable',
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'commerce_transaction_items'
        and column_name = 'value_object_id'
        and is_nullable = 'YES'
    ),
    'unknown item does not block transaction recording'

  union all
  select
    '14_commerce_tables_rls_enabled',
    (
      select bool_and(class_row.relrowsecurity)
      from pg_catalog.pg_class class_row
      where class_row.oid in (
        'public.commerce_transactions'::regclass,
        'public.commerce_transaction_items'::regclass
      )
    ),
    'RLS enabled on both bridge tables'

  union all
  select
    '15_authenticated_has_no_direct_table_select',
    not has_table_privilege(
      'authenticated',
      'public.commerce_transactions',
      'SELECT'
    )
    and not has_table_privilege(
      'authenticated',
      'public.commerce_transaction_items',
      'SELECT'
    ),
    'server-mediated only'

  union all
  select
    '16_service_role_can_execute_materializer',
    has_function_privilege(
      'service_role',
      'public.materialize_confirmed_purchase_reality_v1(uuid,uuid)',
      'EXECUTE'
    ),
    'service_role execute'

  union all
  select
    '17_authenticated_cannot_execute_materializer',
    not has_function_privilege(
      'authenticated',
      'public.materialize_confirmed_purchase_reality_v1(uuid,uuid)',
      'EXECUTE'
    ),
    'authenticated direct execute denied'

  union all
  select
    '18_current_bridge_rows_summary',
    true,
    format(
      'commerce_transactions=%s; items=%s; no automatic historical backfill is executed by this migration',
      (select count(*) from public.commerce_transactions),
      (select count(*) from public.commerce_transaction_items)
    )
)
select check_name, passed, detail
from checks
order by check_name;
