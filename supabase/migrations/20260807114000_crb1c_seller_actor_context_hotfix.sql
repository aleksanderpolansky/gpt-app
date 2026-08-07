-- ARCTor CRB1C
-- Seller actor-context hotfix.
--
-- Reality Model v2 ownership rule:
-- activity_events actor-context fields must reference actors owned by the same
-- account. An organization actor is not a personal/avatar actor owned by that
-- account, so it must not be forced into acting_for_actor_id.
--
-- The organization remains explicitly represented by:
--   commerce_transactions.seller_organization_actor_id
--   commerce_transactions.organization_id
--   activity metadata organizationActorId / organizationId
--
-- Baseline: main @ bc8882ead7a4e4c3359df7d05375c85d9a3de2f0

begin;

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
      'source', 'system_event',
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
      'source', 'system_event',
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
  'CRB1C materializes one confirmed external purchase as one commerce transaction plus buyer Purchase and seller Sale actual activity_events. Seller activity keeps account-owned actor context; organization identity is stored in commerce transaction and metadata rather than acting_for_actor_id.';

commit;
