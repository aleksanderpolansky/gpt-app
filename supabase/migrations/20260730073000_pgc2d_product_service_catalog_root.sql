-- ARCTor.app — PGC2D product/service catalog root and atomic create flow
-- Prepared after PGC2C live acceptance.
-- This file is NOT executed by the source-patch package.

begin;

create unique index if not exists value_objects_products_services_root_uidx
  on public.value_objects (
    owner_user_id,
    owner_actor_id,
    coalesce(
      organization_id,
      '00000000-0000-0000-0000-000000000000'::uuid
    )
  )
  where node_role_code = 'structural'
    and metadata_json ->> 'system_root_code' = 'products_services';

create index if not exists value_objects_catalog_items_owner_idx
  on public.value_objects (
    owner_user_id,
    owner_actor_id,
    organization_id,
    object_kind,
    created_at desc
  )
  where object_kind in ('product_type', 'service_type')
    and metadata_json ->> 'catalog_contract' =
      'pgc2d-products-services-v1';

create or replace function public.create_product_service_leaf_v1(
  p_owner_user_id uuid,
  p_owner_actor_id uuid,
  p_organization_id uuid,
  p_object_kind text,
  p_title text,
  p_description text,
  p_default_price numeric,
  p_default_currency text,
  p_default_duration_minutes integer
)
returns table (
  root_value_object_id uuid,
  value_object_id uuid,
  provider_actor_id uuid,
  provider_type text,
  organization_id uuid,
  default_currency text,
  created_root boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_title text := btrim(coalesce(p_title, ''));
  v_description text := nullif(btrim(coalesce(p_description, '')), '');
  v_object_kind text := btrim(coalesce(p_object_kind, ''));
  v_currency text := upper(btrim(coalesce(p_default_currency, '')));
  v_actor_type text;
  v_root_id uuid;
  v_value_object_id uuid;
  v_provider_actor_id uuid;
  v_provider_type text;
  v_created_root boolean := false;
  v_organization_currency text;
  v_zero_organization_id constant uuid :=
    '00000000-0000-0000-0000-000000000000'::uuid;
begin
  if p_owner_user_id is null or p_owner_actor_id is null then
    raise exception using
      errcode = '22004',
      message = 'PGC2D_OWNER_CONTEXT_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.app_users app_user
    where app_user.id = p_owner_user_id
      and app_user.access_status is distinct from 'blocked'
  ) then
    raise exception using
      errcode = '42501',
      message = 'PGC2D_OWNER_USER_UNAVAILABLE';
  end if;

  select actor.actor_type
  into v_actor_type
  from public.actors actor
  join public.actor_public_profiles profile
    on profile.actor_id = actor.id
  where actor.id = p_owner_actor_id
    and actor.status = 'active'
    and actor.actor_type in ('person', 'avatar')
    and profile.owner_user_id = p_owner_user_id
    and (
      (actor.actor_type = 'person' and profile.profile_kind = 'personal')
      or
      (actor.actor_type = 'avatar' and profile.profile_kind = 'avatar')
    )
  limit 1;

  if v_actor_type is null then
    raise exception using
      errcode = '42501',
      message = 'PGC2D_ACTIVE_ACTOR_NOT_OWNED';
  end if;

  if v_object_kind not in ('product_type', 'service_type') then
    raise exception using
      errcode = '22023',
      message = 'PGC2D_OBJECT_KIND_INVALID';
  end if;

  if v_title = '' or char_length(v_title) > 180 then
    raise exception using
      errcode = '22023',
      message = 'PGC2D_TITLE_INVALID';
  end if;

  if char_length(coalesce(v_description, '')) > 4000 then
    raise exception using
      errcode = '22001',
      message = 'PGC2D_DESCRIPTION_TOO_LONG';
  end if;

  if p_default_price is null
     or p_default_price < 0
     or p_default_price > 1000000000 then
    raise exception using
      errcode = '22023',
      message = 'PGC2D_DEFAULT_PRICE_INVALID';
  end if;

  if v_object_kind = 'service_type'
     and p_default_duration_minutes is not null
     and (
       p_default_duration_minutes <= 0
       or p_default_duration_minutes > 525600
     ) then
    raise exception using
      errcode = '22023',
      message = 'PGC2D_DEFAULT_DURATION_INVALID';
  end if;

  if p_organization_id is null then
    v_provider_actor_id := p_owner_actor_id;
    v_provider_type := v_actor_type;
    v_currency := 'EUR';
  else
    select
      organization.default_currency,
      organization_actor.id
    into
      v_organization_currency,
      v_provider_actor_id
    from public.organizations organization
    join public.actors organization_actor
      on organization_actor.organization_id = organization.id
     and organization_actor.actor_type = 'organization'
     and organization_actor.status = 'active'
    where organization.id = p_organization_id
      and organization.owner_actor_id = p_owner_actor_id
      and organization.status = 'active'
    limit 1;

    if v_provider_actor_id is null then
      raise exception using
        errcode = '42501',
        message = 'PGC2D_ORGANIZATION_ACCESS_DENIED';
    end if;

    v_provider_type := 'organization';
    v_currency := upper(btrim(coalesce(v_organization_currency, '')));
  end if;

  if v_currency !~ '^[A-Z]{3}$' then
    raise exception using
      errcode = '22023',
      message = 'PGC2D_PROVIDER_CURRENCY_INVALID';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      p_owner_user_id::text || ':' ||
      p_owner_actor_id::text || ':' ||
      coalesce(p_organization_id::text, v_zero_organization_id::text) ||
      ':products_services',
      0
    )
  );

  select value_object.id
  into v_root_id
  from public.value_objects value_object
  where value_object.owner_user_id = p_owner_user_id
    and value_object.owner_actor_id = p_owner_actor_id
    and coalesce(value_object.organization_id, v_zero_organization_id) =
      coalesce(p_organization_id, v_zero_organization_id)
    and value_object.node_role_code = 'structural'
    and value_object.metadata_json ->> 'system_root_code' =
      'products_services'
  order by value_object.created_at
  limit 1
  for update;

  if v_root_id is null then
    insert into public.value_objects (
      owner_actor_id,
      created_by_actor_id,
      actor_id,
      app_user_id,
      owner_user_id,
      organization_id,
      usage_scope,
      value_type,
      object_kind,
      node_role_code,
      branch_type_code,
      root_value_object_id,
      parent_value_object_id,
      instance_of_value_object_id,
      title,
      description,
      unit_type,
      default_price,
      default_currency,
      default_duration_minutes,
      is_marketplace_sellable,
      is_free_possible,
      commercial_usage,
      visibility,
      privacy_level,
      sensitivity_level,
      source,
      status,
      identity_attributes_json,
      metadata_json
    )
    values (
      p_owner_actor_id,
      p_owner_actor_id,
      p_owner_actor_id,
      p_owner_user_id,
      p_owner_user_id,
      p_organization_id,
      'commercial',
      'other',
      'other',
      'structural',
      'external_capital',
      null,
      null,
      null,
      'Товары и услуги',
      'Скрытый системный корень товаров и услуг предоставляющего.',
      null,
      null,
      v_currency,
      null,
      false,
      false,
      'both',
      'private',
      'private',
      'standard',
      'system',
      'active',
      jsonb_build_object(
        'provider_actor_id', v_provider_actor_id,
        'provider_type', v_provider_type
      ),
      jsonb_build_object(
        'authoring_contract', 'pgc2d-products-services-root-v1',
        'system_root_code', 'products_services',
        'system_hidden_from_observation_ui', true,
        'provider_actor_id', v_provider_actor_id,
        'provider_type', v_provider_type,
        'organization_id', p_organization_id
      )
    )
    returning id into v_root_id;

    v_created_root := true;
  end if;

  insert into public.value_objects (
    owner_actor_id,
    created_by_actor_id,
    actor_id,
    app_user_id,
    owner_user_id,
    organization_id,
    usage_scope,
    value_type,
    object_kind,
    node_role_code,
    branch_type_code,
    root_value_object_id,
    parent_value_object_id,
    instance_of_value_object_id,
    title,
    description,
    unit_type,
    default_price,
    default_currency,
    default_duration_minutes,
    is_marketplace_sellable,
    is_free_possible,
    commercial_usage,
    visibility,
    privacy_level,
    sensitivity_level,
    source,
    status,
    identity_attributes_json,
    metadata_json
  )
  values (
    p_owner_actor_id,
    p_owner_actor_id,
    p_owner_actor_id,
    p_owner_user_id,
    p_owner_user_id,
    p_organization_id,
    'commercial',
    v_object_kind,
    v_object_kind,
    'activity_leaf',
    'external_capital',
    v_root_id,
    v_root_id,
    null,
    v_title,
    v_description,
    null,
    p_default_price,
    v_currency,
    case
      when v_object_kind = 'service_type'
        then p_default_duration_minutes
      else null
    end,
    false,
    false,
    'certificate_base',
    'private',
    'private',
    'standard',
    'manual',
    'draft',
    jsonb_build_object(
      'catalog_item_kind', v_object_kind,
      'provider_actor_id', v_provider_actor_id,
      'provider_type', v_provider_type
    ),
    jsonb_build_object(
      'authoring_contract', 'pgc2d-products-services-item-v1',
      'catalog_contract', 'pgc2d-products-services-v1',
      'system_hidden_from_observation_ui', true,
      'catalog_root_id', v_root_id,
      'provider_actor_id', v_provider_actor_id,
      'provider_type', v_provider_type,
      'organization_id', p_organization_id
    )
  )
  returning id into v_value_object_id;

  return query
  select
    v_root_id,
    v_value_object_id,
    v_provider_actor_id,
    v_provider_type,
    p_organization_id,
    v_currency,
    v_created_root;
end;
$function$;

revoke all on function public.create_product_service_leaf_v1(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  numeric,
  text,
  integer
) from public, anon, authenticated;

grant execute on function public.create_product_service_leaf_v1(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  numeric,
  text,
  integer
) to service_role;

comment on function public.create_product_service_leaf_v1(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  numeric,
  text,
  integer
) is
  'PGC2D server-only atomic creator. Reuses one hidden products/services root per active profile or owned organization and creates a draft product_type/service_type leaf.';

commit;
