-- Atomic, server-only avatar profile creation.
-- The public slug is generated independently from both owner_user_id and actor_id.

create or replace function public.create_avatar_profile_v1(
  p_owner_user_id uuid,
  p_display_name text
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

  -- A fresh random value is used for the public URL. It is deliberately not
  -- derived from owner_user_id, actor_id, the primary profile or Auth0 data.
  v_public_slug := 'avatar-' || replace(gen_random_uuid()::text, '-', '');

  insert into public.actor_public_profiles (
    owner_user_id,
    actor_id,
    profile_kind,
    public_slug,
    display_name,
    image_url,
    image_source,
    is_public,
    published_at
  )
  values (
    p_owner_user_id,
    v_actor_id,
    'avatar',
    v_public_slug,
    v_display_name,
    null,
    'custom',
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

revoke all on function public.create_avatar_profile_v1(uuid, text) from public;
revoke all on function public.create_avatar_profile_v1(uuid, text) from anon;
revoke all on function public.create_avatar_profile_v1(uuid, text) from authenticated;
grant execute on function public.create_avatar_profile_v1(uuid, text) to service_role;

comment on function public.create_avatar_profile_v1(uuid, text) is
  'Creates one hidden avatar actor and its profile atomically. Server-only; does not copy primary-profile or Auth0 identity data.';
