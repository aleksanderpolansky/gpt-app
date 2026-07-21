-- Atomic, server-only avatar creation with the editable profile fields.
-- Ownership stays in the protected server-side profile row and is never
-- accepted from or returned to the browser.

create or replace function public.create_avatar_profile_v2(
  p_owner_user_id uuid,
  p_display_name text,
  p_bio text,
  p_image_url text,
  p_public_phone text,
  p_website_url text,
  p_messenger_url text
)
returns table (
  profile_id uuid,
  public_slug text,
  profile_kind text,
  display_name text,
  is_public boolean
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $function$
declare
  v_display_name text := btrim(coalesce(p_display_name, ''));
  v_bio text := nullif(btrim(coalesce(p_bio, '')), '');
  v_image_url text := nullif(btrim(coalesce(p_image_url, '')), '');
  v_public_phone text := nullif(btrim(coalesce(p_public_phone, '')), '');
  v_website_url text := nullif(btrim(coalesce(p_website_url, '')), '');
  v_messenger_url text := nullif(btrim(coalesce(p_messenger_url, '')), '');
  v_actor_id uuid;
  v_profile_id uuid;
  v_public_slug text;
begin
  if p_owner_user_id is null then
    raise exception 'Avatar owner is required.'
      using errcode = '22004';
  end if;

  if v_display_name = '' then
    raise exception 'Avatar name is required.'
      using errcode = '22023';
  end if;

  if char_length(v_display_name) > 160 then
    raise exception 'Avatar name must not exceed 160 characters.'
      using errcode = '22001';
  end if;

  if char_length(coalesce(v_bio, '')) > 5000 then
    raise exception 'Avatar description must not exceed 5000 characters.'
      using errcode = '22001';
  end if;

  if char_length(coalesce(v_image_url, '')) > 3000000 then
    raise exception 'Avatar image value is too large.'
      using errcode = '22001';
  end if;

  if v_image_url is not null
     and v_image_url !~* '^https?://'
     and v_image_url !~* '^data:image/(png|jpe?g|webp|gif);base64,' then
    raise exception 'Unsupported avatar image format.'
      using errcode = '22023';
  end if;

  if char_length(coalesce(v_public_phone, '')) > 80
     or char_length(coalesce(v_website_url, '')) > 500
     or char_length(coalesce(v_messenger_url, '')) > 500 then
    raise exception 'One or more avatar contact values are too long.'
      using errcode = '22001';
  end if;

  if not exists (
    select 1
    from public.app_users as app_user
    where app_user.id = p_owner_user_id
  ) then
    raise exception 'Avatar owner does not exist.'
      using errcode = '23503';
  end if;

  insert into public.actors (
    actor_type,
    display_name,
    status
  )
  values (
    'avatar',
    v_display_name,
    'active'
  )
  returning id into v_actor_id;

  -- Independent random public identifier: no owner, primary-profile, person,
  -- actor or Auth0 value is embedded in the visitor-facing URL.
  v_public_slug := 'avatar-' || replace(gen_random_uuid()::text, '-', '');

  insert into public.actor_public_profiles (
    owner_user_id,
    actor_id,
    profile_kind,
    public_slug,
    display_name,
    bio,
    image_url,
    image_source,
    public_phone,
    website_url,
    messenger_url,
    is_public,
    published_at
  )
  values (
    p_owner_user_id,
    v_actor_id,
    'avatar',
    v_public_slug,
    v_display_name,
    v_bio,
    v_image_url,
    'custom',
    v_public_phone,
    v_website_url,
    v_messenger_url,
    false,
    null
  )
  returning id into v_profile_id;

  return query
  select
    profile.id,
    profile.public_slug,
    profile.profile_kind,
    profile.display_name,
    profile.is_public
  from public.actor_public_profiles as profile
  where profile.id = v_profile_id;
end;
$function$;

revoke all on function public.create_avatar_profile_v2(
  uuid, text, text, text, text, text, text
) from public;
revoke all on function public.create_avatar_profile_v2(
  uuid, text, text, text, text, text, text
) from anon;
revoke all on function public.create_avatar_profile_v2(
  uuid, text, text, text, text, text, text
) from authenticated;
grant execute on function public.create_avatar_profile_v2(
  uuid, text, text, text, text, text, text
) to service_role;

comment on function public.create_avatar_profile_v2(
  uuid, text, text, text, text, text, text
) is
  'Atomically creates one hidden avatar and its initial editable fields. Server-only; public output contains no owner linkage.';
