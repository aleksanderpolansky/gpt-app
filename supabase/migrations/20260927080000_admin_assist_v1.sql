begin;
create table public.admin_assist_sessions_v1 (
 id uuid primary key default gen_random_uuid(), token_hash text not null unique,
 admin_user_id uuid not null references public.app_users(id),
 target_user_id uuid not null references public.app_users(id),
 target_actor_id uuid not null references public.actors(id),
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '30 minutes',
 revoked_at timestamptz
);
create table public.admin_assist_audit_v1 (
 id bigint generated always as identity primary key,
 session_id uuid not null references public.admin_assist_sessions_v1(id),
 admin_user_id uuid not null, target_user_id uuid not null, target_actor_id uuid not null,
 action text not null, entity_id uuid, before_data jsonb, after_data jsonb,
 created_at timestamptz not null default clock_timestamp()
);
alter table public.admin_assist_sessions_v1 enable row level security;
alter table public.admin_assist_audit_v1 enable row level security;
revoke all on public.admin_assist_sessions_v1, public.admin_assist_audit_v1 from public, anon, authenticated;
grant all on public.admin_assist_sessions_v1, public.admin_assist_audit_v1 to service_role;
grant usage, select on sequence public.admin_assist_audit_v1_id_seq to service_role;

create function public.admin_assist_v1(p_admin uuid, p_action text, p_token text, p_body jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
 s public.admin_assist_sessions_v1%rowtype;
 u public.app_users%rowtype;
 entity uuid; actor uuid; before_row jsonb; after_row jsonb; result jsonb; n integer;
 locale text; envelope jsonb; fields jsonb; variants jsonb; metadata jsonb;
begin
 if not exists(select 1 from public.platform_admins a join public.app_users au on au.id=a.app_user_id
 where a.app_user_id=p_admin and a.status='active' and a.role in ('owner','admin')
 and au.access_status is distinct from 'blocked') then
 raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
 if p_action in ('lookup','start') then
 select * into u from public.app_users where auth0_sub=p_body->>'user' or id::text=p_body->>'user';
 if u.id is null or u.access_status='blocked' then raise exception 'USER_NOT_AVAILABLE'; end if;
 if p_action='lookup' then
 return jsonb_build_object('user',jsonb_build_object('id',u.id,'name',u.name,'email',u.email),
 'profiles',coalesce((select jsonb_agg(jsonb_build_object('actorId',p.actor_id,'name',p.display_name))
 from public.actor_public_profiles p join public.actors a on a.id=p.actor_id
 where p.owner_user_id=u.id and p.profile_kind in ('personal','avatar') and a.status='active'),'[]'::jsonb));
 end if;
 actor:=(p_body->>'actorId')::uuid;
 if not exists(select 1 from public.actor_public_profiles p join public.actors a on a.id=p.actor_id
 where p.owner_user_id=u.id and p.actor_id=actor and p.profile_kind in ('personal','avatar') and a.status='active')
 then raise exception 'PROFILE_NOT_OWNED' using errcode='42501'; end if;
 if p_token is null or length(p_token)<>64 then raise exception 'INVALID_TOKEN'; end if;
 insert into public.admin_assist_sessions_v1(token_hash,admin_user_id,target_user_id,target_actor_id)
 values(p_token,p_admin,u.id,actor) returning * into s;
 else
 select * into s from public.admin_assist_sessions_v1 where token_hash=p_token and admin_user_id=p_admin for update;
 if s.id is null then raise exception 'ASSIST_SESSION_REQUIRED' using errcode='42501'; end if;
 if p_action<>'stop' then
 if s.revoked_at is not null or s.expires_at<=clock_timestamp() then raise exception 'ASSIST_SESSION_EXPIRED' using errcode='42501'; end if;
 if not exists(select 1 from public.actor_public_profiles p join public.actors a on a.id=p.actor_id
 join public.app_users au on au.id=p.owner_user_id where p.owner_user_id=s.target_user_id and p.actor_id=s.target_actor_id
 and p.profile_kind in ('personal','avatar') and a.status='active' and au.access_status is distinct from 'blocked')
 then raise exception 'TARGET_ACCESS_REVOKED' using errcode='42501'; end if;
 end if;
 end if;
 if p_action in ('start','list') then
 result:=jsonb_build_object('sessionId',s.id,'expiresAt',s.expires_at,'targetUserId',s.target_user_id,'targetActorId',s.target_actor_id,
 'userName',(select coalesce(name,email,id::text) from public.app_users where id=s.target_user_id),
 'profileName',(select display_name from public.actor_public_profiles where actor_id=s.target_actor_id and owner_user_id=s.target_user_id limit 1),
 'organizations',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'title',o.organization_name,'text',o.description,'shortText',o.short_description,'localized',o.metadata_json->'localizedContent','version',md5(to_jsonb(o)::text))) from public.organizations o where o.owner_actor_id=s.target_actor_id),'[]'::jsonb),
 'messages',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'title',m.title,'text',m.content_text,'version',md5(to_jsonb(m)::text)))
 from public.message_objects m join public.actors a on a.id=m.author_actor_id join public.organizations o on o.id=a.organization_id
 where m.owner_user_id=s.target_user_id and o.owner_actor_id=s.target_actor_id and a.actor_type='organization' and m.lifecycle_status='draft'),'[]'::jsonb),
 'templates',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'title',t.title,'text',t.description,'duration',t.default_duration_minutes,'version',md5(to_jsonb(t)::text))) from public.activity_templates t where t.owner_user_id=s.target_user_id and t.owner_actor_id=s.target_actor_id and t.template_scope='user' and t.organization_id is null),'[]'::jsonb));
 elsif p_action='stop' then
 if (p_body->>'sessionId') is distinct from s.id::text then raise exception 'SESSION_CHANGED'; end if;
 update public.admin_assist_sessions_v1 set revoked_at=coalesce(revoked_at,clock_timestamp()) where id=s.id;
 result:='{}'::jsonb;
 elsif p_action in ('organization','message','template','create-template') then
 if (p_body->>'sessionId') is distinct from s.id::text then raise exception 'SESSION_CHANGED'; end if;
 if jsonb_typeof(p_body->'title') is distinct from 'string' or length(btrim(p_body->>'title')) not between 1 and 300
 or jsonb_typeof(p_body->'text') is distinct from 'string' or length(p_body->>'text')>50000 then raise exception 'INVALID_CONTENT'; end if;
 if p_action<>'create-template' then entity:=(p_body->>'id')::uuid; end if;
 if p_action='organization' then
 select to_jsonb(o) into before_row from public.organizations o where id=entity and owner_actor_id=s.target_actor_id for update;
 elsif p_action='message' then
 select to_jsonb(m) into before_row from public.message_objects m where m.id=entity and m.owner_user_id=s.target_user_id and m.lifecycle_status='draft'
 and exists(select 1 from public.actors a join public.organizations o on o.id=a.organization_id where a.id=m.author_actor_id and a.actor_type='organization' and o.owner_actor_id=s.target_actor_id) for update;
 elsif p_action='template' then
 select to_jsonb(t) into before_row from public.activity_templates t where id=entity and owner_user_id=s.target_user_id and owner_actor_id=s.target_actor_id and template_scope='user' and organization_id is null for update;
 end if;
 if p_action<>'create-template' and (before_row is null or md5(before_row::text) is distinct from p_body->>'version') then raise exception 'CHANGED_OR_NOT_OWNED'; end if;
 if p_action='organization' then
 if length(coalesce(p_body->>'shortText',''))>2000 then raise exception 'SHORT_TEXT_TOO_LONG'; end if;
 locale:=p_body->>'locale';
 if locale is null or locale not in ('en','pl','ru','uk','de','es','cs') then raise exception 'INVALID_LOCALE'; end if;
 metadata:=coalesce(before_row->'metadata_json','{}'::jsonb);
 envelope:=coalesce(metadata->'localizedContent','{}'::jsonb);
 fields:=jsonb_build_object('organizationName',btrim(p_body->>'title'),'description',p_body->>'text','shortDescription',p_body->>'shortText');
 variants:=coalesce(envelope->'variants','{}'::jsonb);
 variants:=variants||jsonb_build_object(locale,coalesce(variants->locale,'{}'::jsonb)||fields);
 envelope:=envelope||jsonb_build_object('schemaVersion',2,'detectedSourceLocale',coalesce(envelope->>'detectedSourceLocale',locale),
 'sourceLocaleHint',locale,'sourceRevision','assist-'||md5(locale||fields::text),'fieldCodes',
 (select jsonb_agg(distinct v) from jsonb_array_elements(coalesce(envelope->'fieldCodes','[]'::jsonb)||'["organizationName","description","shortDescription"]'::jsonb) v),
 'original',coalesce(envelope->'original','{}'::jsonb)||fields,'variants',variants,
 'humanLocales',(select jsonb_agg(distinct v) from jsonb_array_elements(coalesce(envelope->'humanLocales','[]'::jsonb)||jsonb_build_array(locale)) v),
 'lastEditedLocale',locale,'generatedAt',clock_timestamp(),'provider',coalesce(envelope->>'provider','human'));
 metadata:=metadata||jsonb_build_object('localizedContent',envelope);
 update public.organizations o set organization_name=btrim(p_body->>'title'),description=p_body->>'text',short_description=p_body->>'shortText',metadata_json=metadata,updated_at=clock_timestamp() where id=entity returning to_jsonb(o) into after_row;
 elsif p_action='message' then
 -- Rich content must be edited by its dedicated editor; do not desynchronise it.
 if coalesce(before_row->'content_json','{}'::jsonb)<>'{}'::jsonb then raise exception 'RICH_CONTENT_USE_ORIGINAL_EDITOR'; end if;
 update public.message_objects m set title=btrim(p_body->>'title'),content_text=p_body->>'text',edited_at=clock_timestamp(),updated_at=clock_timestamp() where id=entity returning to_jsonb(m) into after_row;
 else
 n:=(p_body->>'duration')::integer;
 if n is null or n<1 or n>10080 then raise exception 'INVALID_DURATION'; end if;
 if p_action='create-template' then
 entity:=gen_random_uuid();
 insert into public.activity_templates as t(id,owner_user_id,owner_actor_id,slug,title,description,template_scope,visibility,source_type,default_duration_minutes)
 values(entity,s.target_user_id,s.target_actor_id,'assist-'||entity::text,btrim(p_body->>'title'),p_body->>'text','user','private','user_created',n) returning to_jsonb(t) into after_row;
 else
 update public.activity_templates t set title=btrim(p_body->>'title'),description=p_body->>'text',default_duration_minutes=n,updated_at=clock_timestamp() where id=entity returning to_jsonb(t) into after_row;
 end if;
 end if;
 result:=jsonb_build_object('saved',true,'id',entity);
 else raise exception 'UNKNOWN_ACTION'; end if;
 if p_action<>'list' then
 insert into public.admin_assist_audit_v1(session_id,admin_user_id,target_user_id,target_actor_id,action,entity_id,before_data,after_data)
 values(s.id,p_admin,s.target_user_id,s.target_actor_id,p_action,entity,before_row,after_row);
 end if;
 return result;
end $$;
revoke all on function public.admin_assist_v1(uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.admin_assist_v1(uuid,text,text,jsonb) to service_role;
commit;
