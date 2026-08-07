-- ARCTor CRB1
-- Confirmed purchase -> commerce transaction -> two canonical actual activities.
-- AI / facts / VO-ON / goal-world enrichment is intentionally NOT part of this step.
-- purchase_confirmations remains the evidence / agreement workflow.
-- Baseline: main @ 9a8b783422b33f71748957ba33d23a1b53c0c2d2

begin;

-- ---------------------------------------------------------------------------
-- 1. System activity templates for the two actor perspectives of one economic fact.
-- ---------------------------------------------------------------------------

insert into public.activity_templates (
  slug,
  title,
  short_title,
  description,
  template_group,
  template_scope,
  visibility,
  source_type,
  status,
  default_duration_minutes,
  quick_duration_minutes,
  default_status,
  default_source_type,
  default_privacy_scope,
  icon_key,
  color_key,
  show_in_quick_capture,
  show_in_onboarding,
  allow_manual_duration,
  allow_comment,
  allow_started_at_override,
  allow_ended_at_override,
  input_schema_json,
  ui_schema_json,
  default_metadata_json,
  sort_order,
  is_active
)
values
  (
    'confirmed-purchase-v1',
    'Confirmed purchase',
    'Purchase',
    'Actual activity created only after an external purchase confirmation is accepted by the organization.',
    'commerce',
    'system',
    'public_template',
    'system_seed',
    'active',
    null,
    '{}'::integer[],
    'completed',
    'manual_form',
    'private',
    'shopping-bag',
    'green',
    false,
    false,
    false,
    true,
    true,
    true,
    jsonb_build_object(
      'contract', 'crb1-confirmed-purchase-reality-v1',
      'activityRoleCode', 'actual',
      'realitySide', 'buyer'
    ),
    '{}'::jsonb,
    jsonb_build_object(
      'commerceContract', 'crb1-confirmed-purchase-reality-v1',
      'canonicalEntity', 'activity_events',
      'realitySide', 'buyer',
      'analysisStatus', 'pending'
    ),
    50,
    true
  ),
  (
    'confirmed-sale-v1',
    'Confirmed sale',
    'Sale',
    'Actual activity created for the seller side of one confirmed external purchase.',
    'commerce',
    'system',
    'public_template',
    'system_seed',
    'active',
    null,
    '{}'::integer[],
    'completed',
    'manual_form',
    'private',
    'store',
    'blue',
    false,
    false,
    false,
    true,
    true,
    true,
    jsonb_build_object(
      'contract', 'crb1-confirmed-purchase-reality-v1',
      'activityRoleCode', 'actual',
      'realitySide', 'seller'
    ),
    '{}'::jsonb,
    jsonb_build_object(
      'commerceContract', 'crb1-confirmed-purchase-reality-v1',
      'canonicalEntity', 'activity_events',
      'realitySide', 'seller',
      'analysisStatus', 'pending'
    ),
    51,
    true
  )
on conflict do nothing;

update public.activity_templates
set
  title = case slug
    when 'confirmed-purchase-v1' then 'Confirmed purchase'
    else 'Confirmed sale'
  end,
  short_title = case slug
    when 'confirmed-purchase-v1' then 'Purchase'
    else 'Sale'
  end,
  description = case slug
    when 'confirmed-purchase-v1'
      then 'Actual activity created only after an external purchase confirmation is accepted by the organization.'
    else 'Actual activity created for the seller side of one confirmed external purchase.'
  end,
  template_group = 'commerce',
  visibility = 'public_template',
  source_type = 'system_seed',
  status = 'active',
  default_status = 'completed',
  default_source_type = 'manual_form',
  default_privacy_scope = 'private',
  show_in_quick_capture = false,
  show_in_onboarding = false,
  allow_manual_duration = false,
  allow_comment = true,
  allow_started_at_override = true,
  allow_ended_at_override = true,
  default_metadata_json = jsonb_build_object(
    'commerceContract', 'crb1-confirmed-purchase-reality-v1',
    'canonicalEntity', 'activity_events',
    'realitySide', case slug
      when 'confirmed-purchase-v1' then 'buyer'
      else 'seller'
    end,
    'analysisStatus', 'pending'
  ),
  is_active = true,
  updated_at = clock_timestamp()
where template_scope = 'system'
  and owner_user_id is null
  and organization_id is null
  and slug in ('confirmed-purchase-v1', 'confirmed-sale-v1');

-- ---------------------------------------------------------------------------
-- 2. Canonical economic transaction.
--    purchase_confirmation is evidence/workflow; this row is confirmed reality.
-- ---------------------------------------------------------------------------

create table if not exists public.commerce_transactions (
  id uuid primary key default gen_random_uuid(),

  source_purchase_confirmation_id uuid not null
    references public.purchase_confirmations(id) on delete restrict,

  buyer_user_id uuid not null
    references public.app_users(id) on delete restrict,
  buyer_actor_id uuid not null
    references public.actors(id) on delete restrict,

  seller_owner_user_id uuid not null
    references public.app_users(id) on delete restrict,
  seller_manager_actor_id uuid not null
    references public.actors(id) on delete restrict,
  seller_organization_actor_id uuid not null
    references public.actors(id) on delete restrict,
  organization_id uuid not null
    references public.organizations(id) on delete restrict,

  status text not null default 'confirmed',

  purchase_amount numeric(18,2) not null,
  purchase_currency text not null,

  -- Confirmation time is NOT silently substituted for the real purchase time.
  reported_purchase_at timestamptz null,
  confirmed_at timestamptz not null,

  points_awarded numeric(18,2) not null default 0,
  points_transaction_id uuid not null
    references public.points_transactions(id) on delete restrict,

  buyer_comment text null,
  seller_comment text null,
  receipt_url text null,

  purchase_activity_event_id uuid null
    references public.activity_events(id) on delete restrict,
  sale_activity_event_id uuid null
    references public.activity_events(id) on delete restrict,

  analysis_status text not null default 'pending',
  metadata_json jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),

  constraint commerce_transactions_source_confirmation_unique
    unique (source_purchase_confirmation_id),
  constraint commerce_transactions_points_transaction_unique
    unique (points_transaction_id),
  constraint commerce_transactions_purchase_activity_unique
    unique (purchase_activity_event_id),
  constraint commerce_transactions_sale_activity_unique
    unique (sale_activity_event_id),
  constraint commerce_transactions_status_check
    check (status in ('confirmed')),
  constraint commerce_transactions_amount_positive_check
    check (purchase_amount > 0),
  constraint commerce_transactions_currency_format_check
    check (purchase_currency ~ '^[A-Z]{3}$'),
  constraint commerce_transactions_points_nonnegative_check
    check (points_awarded >= 0),
  constraint commerce_transactions_analysis_status_check
    check (analysis_status in ('pending', 'analyzed', 'failed', 'skipped')),
  constraint commerce_transactions_metadata_object_check
    check (jsonb_typeof(metadata_json) = 'object')
);

create index if not exists commerce_transactions_buyer_idx
  on public.commerce_transactions (buyer_user_id, confirmed_at desc);

create index if not exists commerce_transactions_seller_idx
  on public.commerce_transactions (seller_owner_user_id, confirmed_at desc);

create index if not exists commerce_transactions_organization_idx
  on public.commerce_transactions (organization_id, confirmed_at desc);

-- ---------------------------------------------------------------------------
-- 3. Future line items.
--    No item is fabricated from the old generic comment field in CRB1.
-- ---------------------------------------------------------------------------

create table if not exists public.commerce_transaction_items (
  id uuid primary key default gen_random_uuid(),
  commerce_transaction_id uuid not null
    references public.commerce_transactions(id) on delete cascade,

  original_description text not null,
  value_object_id uuid null
    references public.value_objects(id) on delete restrict,

  quantity numeric(18,4) null,
  unit text null,
  line_amount numeric(18,2) null,
  line_currency text null,

  classification_status text not null default 'pending',
  classification_confidence numeric(5,4) null,
  metadata_json jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),

  constraint commerce_transaction_items_description_check
    check (btrim(original_description) <> ''),
  constraint commerce_transaction_items_quantity_check
    check (quantity is null or quantity > 0),
  constraint commerce_transaction_items_line_amount_check
    check (line_amount is null or line_amount >= 0),
  constraint commerce_transaction_items_currency_check
    check (line_currency is null or line_currency ~ '^[A-Z]{3}$'),
  constraint commerce_transaction_items_classification_status_check
    check (classification_status in ('pending', 'matched', 'confirmed', 'ignored')),
  constraint commerce_transaction_items_confidence_check
    check (
      classification_confidence is null
      or (
        classification_confidence >= 0
        and classification_confidence <= 1
      )
    ),
  constraint commerce_transaction_items_metadata_object_check
    check (jsonb_typeof(metadata_json) = 'object')
);

create index if not exists commerce_transaction_items_transaction_idx
  on public.commerce_transaction_items (commerce_transaction_id, created_at);

create index if not exists commerce_transaction_items_value_object_idx
  on public.commerce_transaction_items (value_object_id)
  where value_object_id is not null;

alter table public.commerce_transactions enable row level security;
alter table public.commerce_transaction_items enable row level security;

revoke all on table public.commerce_transactions
  from public, anon, authenticated;
revoke all on table public.commerce_transaction_items
  from public, anon, authenticated;

grant select, insert, update, delete
  on table public.commerce_transactions
  to service_role;
grant select, insert, update, delete
  on table public.commerce_transaction_items
  to service_role;

-- ---------------------------------------------------------------------------
-- 4. Materializer: confirmed purchase reality -> one transaction + two actual
--    activities. No measures/facts/VO/goal-world write happens here.
-- ---------------------------------------------------------------------------

create or replace function public.materialize_confirmed_purchase_reality_v1(
  p_purchase_confirmation_id uuid,
  p_points_transaction_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $function$
declare
  v_purchase public.purchase_confirmations%rowtype;
  v_organization public.organizations%rowtype;
  v_points public.points_transactions%rowtype;

  v_buyer_actor_id uuid;
  v_seller_manager_actor_id uuid;
  v_seller_organization_actor_id uuid;

  v_purchase_template_id uuid;
  v_sale_template_id uuid;

  v_transaction public.commerce_transactions%rowtype;

  v_purchase_result jsonb;
  v_sale_result jsonb;
  v_purchase_activity_event_id uuid;
  v_sale_activity_event_id uuid;

  v_purchase_title text;
  v_sale_title text;
begin
  if p_purchase_confirmation_id is null
     or p_points_transaction_id is null then
    raise exception using
      errcode = '22023',
      message = 'CRB1_MATERIALIZE_CONTEXT_REQUIRED';
  end if;

  select *
  into v_purchase
  from public.purchase_confirmations purchase
  where purchase.id = p_purchase_confirmation_id
  for update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'CRB1_PURCHASE_CONFIRMATION_NOT_FOUND';
  end if;

  if v_purchase.status is distinct from 'confirmed'
     or v_purchase.confirmed_at is null then
    raise exception using
      errcode = '23514',
      message = 'CRB1_PURCHASE_MUST_BE_CONFIRMED';
  end if;

  select *
  into v_organization
  from public.organizations organization
  where organization.id = v_purchase.organization_id
  for update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'CRB1_ORGANIZATION_NOT_FOUND';
  end if;

  select *
  into v_points
  from public.points_transactions transaction_row
  where transaction_row.id = p_points_transaction_id
  for update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'CRB1_POINTS_TRANSACTION_NOT_FOUND';
  end if;

  if v_points.user_id is distinct from v_purchase.buyer_user_id
     or v_points.organization_id is distinct from v_purchase.organization_id
     or v_points.source_type is distinct from 'purchase_confirmation'
     or v_points.source_id is distinct from v_purchase.id
     or v_points.amount is distinct from v_purchase.points_awarded then
    raise exception using
      errcode = '23514',
      message = 'CRB1_POINTS_TRANSACTION_MISMATCH';
  end if;

  -- Old purchase confirmations did not store active actor context.
  -- For CRB1, map the buyer deterministically to the canonical personal profile.
  select profile.actor_id
  into v_buyer_actor_id
  from public.actor_public_profiles profile
  join public.actors actor
    on actor.id = profile.actor_id
   and actor.status = 'active'
  where profile.owner_user_id = v_purchase.buyer_user_id
    and profile.profile_kind = 'personal'
  order by actor.created_at
  limit 1;

  if v_buyer_actor_id is null then
    raise exception using
      errcode = '42501',
      message = 'CRB1_BUYER_PERSONAL_ACTOR_NOT_AVAILABLE';
  end if;

  v_seller_manager_actor_id := v_organization.owner_actor_id;

  if v_seller_manager_actor_id is null
     or not exists (
       select 1
       from public.actor_public_profiles profile
       join public.actors actor
         on actor.id = profile.actor_id
        and actor.status = 'active'
       where profile.owner_user_id = v_organization.created_by_user_id
         and profile.actor_id = v_seller_manager_actor_id
     ) then
    raise exception using
      errcode = '42501',
      message = 'CRB1_SELLER_MANAGER_ACTOR_NOT_AVAILABLE';
  end if;

  select actor.id
  into v_seller_organization_actor_id
  from public.actors actor
  where actor.organization_id = v_organization.id
    and actor.actor_type = 'organization'
    and actor.status = 'active'
  order by actor.created_at
  limit 1;

  if v_seller_organization_actor_id is null then
    raise exception using
      errcode = '42501',
      message = 'CRB1_SELLER_ORGANIZATION_ACTOR_NOT_AVAILABLE';
  end if;

  select template.id
  into v_purchase_template_id
  from public.activity_templates template
  where template.template_scope = 'system'
    and template.owner_user_id is null
    and template.organization_id is null
    and template.slug = 'confirmed-purchase-v1'
    and template.status = 'active'
    and template.is_active = true
  order by template.created_at
  limit 1;

  select template.id
  into v_sale_template_id
  from public.activity_templates template
  where template.template_scope = 'system'
    and template.owner_user_id is null
    and template.organization_id is null
    and template.slug = 'confirmed-sale-v1'
    and template.status = 'active'
    and template.is_active = true
  order by template.created_at
  limit 1;

  if v_purchase_template_id is null or v_sale_template_id is null then
    raise exception using
      errcode = '55000',
      message = 'CRB1_ACTIVITY_TEMPLATE_NOT_AVAILABLE';
  end if;

  select *
  into v_transaction
  from public.commerce_transactions transaction_row
  where transaction_row.source_purchase_confirmation_id = v_purchase.id
  for update;

  if found then
    if v_transaction.points_transaction_id
         is distinct from p_points_transaction_id then
      raise exception using
        errcode = '23505',
        message = 'CRB1_TRANSACTION_IDEMPOTENCY_CONFLICT';
    end if;

    return jsonb_build_object(
      'ok', true,
      'disposition', 'idempotent_replay',
      'commerceTransactionId', v_transaction.id,
      'purchaseActivityEventId', v_transaction.purchase_activity_event_id,
      'saleActivityEventId', v_transaction.sale_activity_event_id,
      'analysisStatus', v_transaction.analysis_status
    );
  end if;

  insert into public.commerce_transactions (
    source_purchase_confirmation_id,
    buyer_user_id,
    buyer_actor_id,
    seller_owner_user_id,
    seller_manager_actor_id,
    seller_organization_actor_id,
    organization_id,
    status,
    purchase_amount,
    purchase_currency,
    reported_purchase_at,
    confirmed_at,
    points_awarded,
    points_transaction_id,
    buyer_comment,
    seller_comment,
    receipt_url,
    analysis_status,
    metadata_json
  )
  values (
    v_purchase.id,
    v_purchase.buyer_user_id,
    v_buyer_actor_id,
    v_organization.created_by_user_id,
    v_seller_manager_actor_id,
    v_seller_organization_actor_id,
    v_organization.id,
    'confirmed',
    v_purchase.purchase_amount,
    upper(v_purchase.purchase_currency),
    null,
    v_purchase.confirmed_at,
    coalesce(v_purchase.points_awarded, 0),
    p_points_transaction_id,
    v_purchase.user_comment,
    v_purchase.seller_comment,
    v_purchase.receipt_url,
    'pending',
    jsonb_build_object(
      'commerceContract', 'crb1-confirmed-purchase-reality-v1',
      'evidenceType', 'purchase_confirmation',
      'purchaseConfirmationId', v_purchase.id,
      'purchaseOccurrenceTimeKnown', false,
      'confirmationObservedAt', v_purchase.confirmed_at,
      'buyerActorResolution', 'personal_profile_from_account',
      'sellerOrganizationActorId', v_seller_organization_actor_id,
      'futureAnalysis', 'activity-facts-vo-goal-world'
    )
  )
  returning *
  into v_transaction;

  v_purchase_title :=
    'Purchase at ' ||
    coalesce(nullif(btrim(v_organization.organization_name), ''), 'organization');

  v_sale_title :=
    'Sale at ' ||
    coalesce(nullif(btrim(v_organization.organization_name), ''), 'organization');

  v_purchase_result := public.create_activity_event_pp1_v1(
    v_purchase.buyer_user_id,
    v_buyer_actor_id,
    'commerce-purchase:' || v_purchase.id::text,
    jsonb_build_object(
      'activityRoleCode', 'actual',
      'inputText', v_purchase.user_comment,
      'title', v_purchase_title,
      'description', v_purchase.user_comment,
      'status', 'completed',
      'source', 'purchase_confirmation',
      'privacyScope', 'private',
      'temporalDirection', 'past',
      'metadata', jsonb_build_object(
        'commerceContract', 'crb1-confirmed-purchase-reality-v1',
        'commerceTransactionId', v_transaction.id,
        'purchaseConfirmationId', v_purchase.id,
        'realitySide', 'buyer',
        'counterpartyOrganizationId', v_organization.id,
        'counterpartyOrganizationActorId', v_seller_organization_actor_id,
        'purchaseAmount', v_purchase.purchase_amount,
        'purchaseCurrency', upper(v_purchase.purchase_currency),
        'pointsAwarded', coalesce(v_purchase.points_awarded, 0),
        'confirmationObservedAt', v_purchase.confirmed_at,
        'purchaseOccurrenceTimeKnown', false,
        'analysisStatus', 'pending'
      )
    ),
    '{}'::uuid[]
  );

  v_purchase_activity_event_id :=
    nullif(v_purchase_result -> 'activityEvent' ->> 'id', '')::uuid;

  if v_purchase_activity_event_id is null then
    raise exception using
      errcode = '55000',
      message = 'CRB1_PURCHASE_ACTIVITY_CREATE_FAILED';
  end if;

  update public.activity_events
  set
    activity_template_id = v_purchase_template_id,
    metadata_json = coalesce(metadata_json, '{}'::jsonb)
      || jsonb_build_object(
        'commerceTransactionId', v_transaction.id,
        'commerceActivityTemplate', 'confirmed-purchase-v1'
      ),
    updated_at = clock_timestamp()
  where id = v_purchase_activity_event_id
    and activity_role_code = 'actual';

  if not found then
    raise exception using
      errcode = '55000',
      message = 'CRB1_PURCHASE_ACTIVITY_TEMPLATE_ASSIGNMENT_FAILED';
  end if;

  v_sale_result := public.create_activity_event_pp1_v1(
    v_organization.created_by_user_id,
    v_seller_manager_actor_id,
    'commerce-sale:' || v_purchase.id::text,
    jsonb_build_object(
      'activityRoleCode', 'actual',
      'inputText', v_purchase.seller_comment,
      'title', v_sale_title,
      'description', v_purchase.seller_comment,
      'status', 'completed',
      'source', 'purchase_confirmation',
      'privacyScope', 'private',
      'temporalDirection', 'past',
      'metadata', jsonb_build_object(
        'commerceContract', 'crb1-confirmed-purchase-reality-v1',
        'commerceTransactionId', v_transaction.id,
        'purchaseConfirmationId', v_purchase.id,
        'realitySide', 'seller',
        'organizationId', v_organization.id,
        'organizationActorId', v_seller_organization_actor_id,
        'buyerUserId', v_purchase.buyer_user_id,
        'buyerActorId', v_buyer_actor_id,
        'purchaseAmount', v_purchase.purchase_amount,
        'purchaseCurrency', upper(v_purchase.purchase_currency),
        'confirmationObservedAt', v_purchase.confirmed_at,
        'purchaseOccurrenceTimeKnown', false,
        'analysisStatus', 'pending'
      )
    ),
    '{}'::uuid[]
  );

  v_sale_activity_event_id :=
    nullif(v_sale_result -> 'activityEvent' ->> 'id', '')::uuid;

  if v_sale_activity_event_id is null then
    raise exception using
      errcode = '55000',
      message = 'CRB1_SALE_ACTIVITY_CREATE_FAILED';
  end if;

  update public.activity_events
  set
    activity_template_id = v_sale_template_id,
    acting_for_actor_id = v_seller_organization_actor_id,
    metadata_json = coalesce(metadata_json, '{}'::jsonb)
      || jsonb_build_object(
        'commerceTransactionId', v_transaction.id,
        'organizationActorId', v_seller_organization_actor_id,
        'commerceActivityTemplate', 'confirmed-sale-v1'
      ),
    updated_at = clock_timestamp()
  where id = v_sale_activity_event_id
    and activity_role_code = 'actual';

  if not found then
    raise exception using
      errcode = '55000',
      message = 'CRB1_SALE_ACTIVITY_TEMPLATE_ASSIGNMENT_FAILED';
  end if;

  update public.commerce_transactions
  set
    purchase_activity_event_id = v_purchase_activity_event_id,
    sale_activity_event_id = v_sale_activity_event_id,
    updated_at = clock_timestamp()
  where id = v_transaction.id
  returning *
  into v_transaction;

  return jsonb_build_object(
    'ok', true,
    'disposition', 'created',
    'commerceTransactionId', v_transaction.id,
    'purchaseActivityEventId', v_transaction.purchase_activity_event_id,
    'saleActivityEventId', v_transaction.sale_activity_event_id,
    'analysisStatus', v_transaction.analysis_status
  );
end;
$function$;

revoke all on function public.materialize_confirmed_purchase_reality_v1(
  uuid,
  uuid
) from public, anon, authenticated;

grant execute on function public.materialize_confirmed_purchase_reality_v1(
  uuid,
  uuid
) to service_role;

comment on function public.materialize_confirmed_purchase_reality_v1(
  uuid,
  uuid
) is
  'CRB1 materializes one confirmed external purchase as one commerce transaction plus buyer Purchase and seller Sale actual activity_events. It intentionally does not write measures, object facts, VO relations or goal worlds.';

comment on table public.commerce_transactions is
  'Confirmed economic reality. purchase_confirmations remains the evidence/agreement workflow; this table is the one-row economic fact shared by buyer and seller activity projections.';

comment on table public.commerce_transaction_items is
  'Future line items of a confirmed commerce transaction. value_object_id stays nullable until explicit matching or future AI analysis.';

-- ---------------------------------------------------------------------------
-- 5. Extend the existing confirmation RPC without changing its public signature
--    or POINTS rules. The bridge call is inside the same PostgreSQL transaction.
-- ---------------------------------------------------------------------------

create or replace function public.confirm_purchase_and_award_points(
  p_purchase_confirmation_id uuid,
  p_confirmed_by_user_id uuid,
  p_seller_comment text default null::text
)
returns table(
  purchase_confirmation_id uuid,
  buyer_user_id uuid,
  organization_id uuid,
  points_awarded numeric,
  status text,
  transaction_id uuid
)
language plpgsql
as $function$
declare
  v_purchase public.purchase_confirmations%rowtype;
  v_rule public.points_reward_rules%rowtype;
  v_organization public.organizations%rowtype;
  v_month_start timestamp with time zone;
  v_month_end timestamp with time zone;
  v_user_points_this_month numeric;
  v_owner_confirmations_this_month integer;
  v_monthly_points_limit integer;
  v_monthly_confirmation_limit integer;
  v_points_to_award numeric;
  v_points_result record;
  v_status_before text;
  v_event_type text;
  v_reality_result jsonb;
begin
  select pc.*
  into v_purchase
  from public.purchase_confirmations pc
  where pc.id = p_purchase_confirmation_id
  for update;

  if not found then
    raise exception 'Purchase confirmation not found';
  end if;

  if v_purchase.status = 'confirmed' then
    raise exception 'Purchase confirmation is already confirmed';
  end if;

  if v_purchase.status not in ('requested', 'rejected') then
    raise exception 'Only requested or rejected purchase confirmations can be confirmed';
  end if;

  select organization.*
  into v_organization
  from public.organizations organization
  where organization.id = v_purchase.organization_id
  for update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'PGC8B_PURCHASE_ORGANIZATION_NOT_FOUND';
  end if;

  if v_organization.created_by_user_id
       is distinct from p_confirmed_by_user_id then
    raise exception using
      errcode = '42501',
      message = 'PGC8B_ONLY_ORGANIZATION_OWNER_CAN_CONFIRM_PURCHASE';
  end if;

  if v_purchase.buyer_user_id
       is not distinct from v_organization.created_by_user_id then
    raise exception using
      errcode = '42501',
      message = 'PGC8B_OWNER_CANNOT_CONFIRM_OWN_PURCHASE';
  end if;

  perform 1
  from public.app_users app_user
  where app_user.id in (
    v_purchase.buyer_user_id,
    v_organization.created_by_user_id
  )
  order by app_user.id
  for update;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'PGC8B_PURCHASE_ACCOUNT_CONTEXT_NOT_AVAILABLE';
  end if;

  v_status_before := v_purchase.status;

  if v_status_before = 'rejected' then
    v_event_type := 'corrected_to_confirmed';
  else
    v_event_type := 'confirmed';
  end if;

  select r.*
  into v_rule
  from public.points_reward_rules r
  where r.organization_id = v_purchase.organization_id
    and r.is_active = true
    and r.status = 'active'
    and r.purchase_currency = v_purchase.purchase_currency
  order by r.created_at desc
  limit 1;

  if not found then
    raise exception 'Active reward rule not found for this organization and currency';
  end if;

  if v_purchase.purchase_amount < v_rule.min_purchase_amount then
    raise exception 'Purchase amount is lower than minimum purchase amount';
  end if;

  v_month_start := date_trunc('month', now());
  v_month_end := v_month_start + interval '1 month';

  select coalesce(sum(pc.points_awarded), 0)
  into v_user_points_this_month
  from public.purchase_confirmations pc
  where pc.buyer_user_id = v_purchase.buyer_user_id
    and pc.status = 'confirmed'
    and pc.confirmed_at >= v_month_start
    and pc.confirmed_at < v_month_end;

  v_points_to_award := v_rule.points_per_confirmed_purchase;

  v_monthly_points_limit := public.resolve_owner_commercial_limit_v1(
    v_purchase.buyer_user_id,
    'points_awarded_monthly',
    now()
  );

  if v_user_points_this_month + v_points_to_award
       > v_monthly_points_limit then
    raise exception using
      errcode = '23514',
      message = 'PGC8B_OWNER_MONTHLY_POINTS_LIMIT_EXCEEDED',
      detail = format(
        'buyer_user_id=%s current=%s requested=%s limit=%s',
        v_purchase.buyer_user_id,
        v_user_points_this_month,
        v_points_to_award,
        v_monthly_points_limit
      );
  end if;

  select count(*)::integer
  into v_owner_confirmations_this_month
  from public.purchase_confirmations pc
  join public.organizations organization
    on organization.id = pc.organization_id
  where organization.created_by_user_id =
      v_organization.created_by_user_id
    and pc.status = 'confirmed'
    and pc.confirmed_at >= v_month_start
    and pc.confirmed_at < v_month_end;

  v_monthly_confirmation_limit :=
    public.resolve_owner_commercial_limit_v1(
      v_organization.created_by_user_id,
      'purchase_confirmations_monthly',
      now()
    );

  if v_owner_confirmations_this_month
       >= v_monthly_confirmation_limit then
    raise exception using
      errcode = '23514',
      message = 'PGC8B_OWNER_MONTHLY_CONFIRMATION_LIMIT_EXCEEDED',
      detail = format(
        'owner_user_id=%s current=%s limit=%s',
        v_organization.created_by_user_id,
        v_owner_confirmations_this_month,
        v_monthly_confirmation_limit
      );
  end if;

  select *
  into v_points_result
  from public.add_points_to_wallet(
    v_purchase.buyer_user_id,
    v_purchase.organization_id,
    v_points_to_award,
    'purchase_confirmation',
    v_purchase.id,
    null,
    null,
    'Points awarded for confirmed purchase'
  );

  update public.purchase_confirmations pc
  set
    confirmed_by_user_id = p_confirmed_by_user_id,
    seller_comment = p_seller_comment,
    points_awarded = v_points_to_award,
    status = 'confirmed',
    confirmed_at = now(),
    rejected_at = null,
    last_decision_at = now(),
    updated_at = now()
  where pc.id = v_purchase.id
  returning pc.* into v_purchase;

  insert into public.purchase_confirmation_events (
    purchase_confirmation_id,
    organization_id,
    buyer_user_id,
    actor_user_id,
    event_type,
    status_before,
    status_after,
    purchase_amount,
    purchase_currency,
    points_awarded,
    buyer_public_code,
    user_comment,
    seller_comment
  )
  values (
    v_purchase.id,
    v_purchase.organization_id,
    v_purchase.buyer_user_id,
    p_confirmed_by_user_id,
    v_event_type,
    v_status_before,
    v_purchase.status,
    v_purchase.purchase_amount,
    v_purchase.purchase_currency,
    v_purchase.points_awarded,
    v_purchase.buyer_public_code,
    v_purchase.user_comment,
    v_purchase.seller_comment
  );

  -- CRB1: this is deliberately after the canonical confirmation + POINTS write,
  -- but still inside the SAME PostgreSQL transaction. Any bridge failure rolls
  -- the entire confirmation operation back.
  v_reality_result := public.materialize_confirmed_purchase_reality_v1(
    v_purchase.id,
    v_points_result.transaction_id::uuid
  );

  if coalesce((v_reality_result ->> 'ok')::boolean, false) is not true then
    raise exception using
      errcode = '55000',
      message = 'CRB1_REALITY_MATERIALIZATION_FAILED';
  end if;

  return query
  select
    v_purchase.id,
    v_purchase.buyer_user_id,
    v_purchase.organization_id,
    v_purchase.points_awarded,
    v_purchase.status,
    v_points_result.transaction_id::uuid;
end;
$function$;

comment on function public.confirm_purchase_and_award_points(
  uuid,
  uuid,
  text
) is
  'Confirms an external purchase, awards POINTS under existing PGC8B rules, and atomically materializes the confirmed economic reality as one commerce transaction plus Purchase/Sale actual activities.';

commit;
