/*
P4.8.0-A7.2 — additive migration
READY FOR MANUAL SUPABASE APPLICATION AFTER A7.1 REVIEW.

Purpose:
- Add value_objects.commercial_usage
- Add purchase_confirmations.currency
- Add semantic comments
- Keep commercial core additive and non-destructive

Forbidden:
- Do not create purchase_confirmation_items
- Do not add purchase_confirmations.offer_id
- Do not add purchase_confirmations.value_object_id
- Do not introduce cart/order/item-flow
*/

begin;

alter table public.value_objects
  add column if not exists commercial_usage text default 'none';

alter table public.value_objects
  drop constraint if exists value_objects_commercial_usage_check;

alter table public.value_objects
  add constraint value_objects_commercial_usage_check
  check (
    commercial_usage is null
    or commercial_usage in (
      'none',
      'catalog_info',
      'certificate_base',
      'both'
    )
  );

comment on column public.value_objects.commercial_usage is
'Commercial usage scenario for a Value Object. This does not define the type/nature of the Value Object. Allowed values: none, catalog_info, certificate_base, both.';

alter table public.purchase_confirmations
  add column if not exists currency text default 'PLN';

alter table public.purchase_confirmations
  drop constraint if exists purchase_confirmations_currency_check;

alter table public.purchase_confirmations
  add constraint purchase_confirmations_currency_check
  check (
    currency is null
    or currency ~ '^[A-Z]{3}$'
  );

comment on column public.purchase_confirmations.currency is
'Currency for external purchase amount. Purchase confirmation remains organization-level and amount-based; this column does not create cart/order/item semantics.';

comment on table public.purchase_confirmations is
'External purchase confirmation request. Purchase happens outside the platform. This table must remain organization-level and amount-based; no purchase_confirmation_items, cart, order, offer_id or value_object_id is required for the target model.';

comment on table public.offer_items is
'Internal offer package/composition table. This is not a purchase confirmation item table and must not be interpreted as checkout/cart/order semantics.';

commit;

/*
Post-migration verification:

select
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'value_objects' and column_name = 'commercial_usage')
    or
    (table_name = 'purchase_confirmations' and column_name = 'currency')
  )
order by table_name, column_name;

select
  conname,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conname in (
  'value_objects_commercial_usage_check',
  'purchase_confirmations_currency_check'
);

select
  count(*) as purchase_confirmations_with_invalid_currency
from public.purchase_confirmations
where currency is not null
  and currency !~ '^[A-Z]{3}$';

select
  count(*) as value_objects_with_invalid_commercial_usage
from public.value_objects
where commercial_usage is not null
  and commercial_usage not in (
    'none',
    'catalog_info',
    'certificate_base',
    'both'
  );
*/


