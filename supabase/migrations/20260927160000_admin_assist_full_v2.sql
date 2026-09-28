begin;
create table public.admin_assist_full_sessions_v2 (
 id uuid primary key default gen_random_uuid(), token_hash text unique not null,
 admin_user_id uuid not null references public.app_users(id), target_user_id uuid not null references public.app_users(id),
 initial_profile_id uuid not null references public.actor_public_profiles(id), restore_profile_id text,
 expires_at timestamptz not null default now()+interval '30 minutes', revoked_at timestamptz,
 created_at timestamptz not null default now()
);
create table public.admin_assist_full_requests_v2 (
 id bigint generated always as identity primary key, session_id uuid not null references public.admin_assist_full_sessions_v2(id),
 admin_user_id uuid not null, target_user_id uuid not null, action text not null,
 method text, pathname text, profile_id text, created_at timestamptz not null default clock_timestamp()
);
alter table public.admin_assist_full_sessions_v2 enable row level security;
alter table public.admin_assist_full_requests_v2 enable row level security;
revoke all on public.admin_assist_full_sessions_v2,public.admin_assist_full_requests_v2 from public,anon,authenticated;
grant all on public.admin_assist_full_sessions_v2,public.admin_assist_full_requests_v2 to service_role;
grant usage,select on sequence public.admin_assist_full_requests_v2_id_seq to service_role;
create function public.admin_assist_full_v2(p_sub text,p_action text,p_token text,p_body jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare a uuid; u public.app_users%rowtype; s public.admin_assist_full_sessions_v2%rowtype; pr uuid;
begin
 select id into a from public.app_users where auth0_sub=p_sub and access_status is distinct from 'blocked';
 if a is null or not exists(select 1 from public.platform_admins where app_user_id=a and status='active' and role in ('owner','admin')) then
 raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
 if p_action='start' then perform 1 from public.app_users where id=a for update; end if;
 if p_action in ('lookup','start') then
 select * into u from public.app_users where (id::text=p_body->>'user' or auth0_sub=p_body->>'user') and access_status is distinct from 'blocked';
 if u.id is null or u.auth0_sub is null then raise exception 'TARGET_NOT_FOUND'; end if;
 if exists(select 1 from public.platform_admins where app_user_id=u.id and role='owner' and status='active') and not exists(select 1 from public.platform_admins where app_user_id=a and role='owner' and status='active') then raise exception 'OWNER_REQUIRED' using errcode='42501'; end if;
 if p_action='lookup' then return jsonb_build_object('user',jsonb_build_object('id',u.id,'name',u.name,'email',u.email),
 'profiles',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.display_name)) from public.actor_public_profiles p join public.actors ac on ac.id=p.actor_id where p.owner_user_id=u.id and p.profile_kind in ('personal','avatar') and ac.status='active'),'[]'::jsonb)); end if;
 pr:=(p_body->>'profileId')::uuid;
 if not exists(select 1 from public.actor_public_profiles p join public.actors ac on ac.id=p.actor_id where p.id=pr and p.owner_user_id=u.id and p.profile_kind in ('personal','avatar') and ac.status='active') then raise exception 'PROFILE_NOT_OWNED'; end if;
 if length(coalesce(p_token,''))<>64 then raise exception 'INVALID_TOKEN'; end if;
 -- One full assistance session per administrator. Other devices fail closed until explicitly exited/restarted.
 update public.admin_assist_full_sessions_v2 set revoked_at=clock_timestamp() where admin_user_id=a and revoked_at is null;
 insert into public.admin_assist_full_sessions_v2(token_hash,admin_user_id,target_user_id,initial_profile_id,restore_profile_id)
 values(p_token,a,u.id,pr,p_body->>'restoreProfileId') returning * into s;
 elsif p_action in ('context','request','stop') then
 select * into s from public.admin_assist_full_sessions_v2 where token_hash=p_token and admin_user_id=a;
 if s.id is null then raise exception 'ASSIST_SESSION_REQUIRED' using errcode='42501'; end if;
 if p_action='stop' then
 update public.admin_assist_full_sessions_v2 set revoked_at=coalesce(revoked_at,clock_timestamp()) where id=s.id;
 else
 if s.revoked_at is not null or s.expires_at<=clock_timestamp() then raise exception 'ASSIST_SESSION_EXPIRED' using errcode='42501'; end if;
 select * into u from public.app_users where id=s.target_user_id and access_status is distinct from 'blocked';
 if u.id is null or u.auth0_sub is null then raise exception 'TARGET_ACCESS_REVOKED' using errcode='42501'; end if;
 if exists(select 1 from public.platform_admins where app_user_id=u.id and role='owner' and status='active') and not exists(select 1 from public.platform_admins where app_user_id=a and role='owner' and status='active') then raise exception 'OWNER_REQUIRED' using errcode='42501'; end if;

 end if;
 else raise exception 'UNKNOWN_ACTION'; end if;
 if p_action in ('start','stop','request') then
 insert into public.admin_assist_full_requests_v2(session_id,admin_user_id,target_user_id,action,method,pathname,profile_id)
 values(s.id,a,s.target_user_id,p_action,left(p_body->>'method',16),left(p_body->>'pathname',500),p_body->>'profileId');
 end if;
 if p_action='stop' then return jsonb_build_object('restoreProfileId',s.restore_profile_id); end if;
 return jsonb_build_object('sessionId',s.id,'adminUserId',a,'targetUserId',s.target_user_id,'initialProfileId',s.initial_profile_id,'expiresAt',s.expires_at,
 'user',jsonb_strip_nulls(jsonb_build_object('sub',u.auth0_sub,'name',u.name,'email',u.email,'picture',u.picture)));
end $$;
revoke all on function public.admin_assist_full_v2(text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.admin_assist_full_v2(text,text,text,jsonb) to service_role;
commit;
