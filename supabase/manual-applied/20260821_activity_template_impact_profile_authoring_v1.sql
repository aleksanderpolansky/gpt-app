-- ARCTOR_ACTIVITY_TEMPLATE_IMPACT_PROFILE_AUTHORING_V1
-- Additive authoring foundation for reusable activity-template -> observation-object profiles.
-- One real activity event remains one row. Template/object relations are stored once and
-- expanded virtually at read time. No historical facts are rewritten.

begin;

create extension if not exists "pgcrypto";

-- Fail closed if the expected ARCTor baseline is not present.
do $$
begin
  if to_regclass('public.activity_templates') is null then
    raise exception 'ARCTOR_ATIP_V1_PREFLIGHT: activity_templates missing';
  end if;
  if to_regclass('public.activity_events') is null then
    raise exception 'ARCTOR_ATIP_V1_PREFLIGHT: activity_events missing';
  end if;
  if to_regclass('public.value_objects') is null then
    raise exception 'ARCTOR_ATIP_V1_PREFLIGHT: value_objects missing';
  end if;
  if to_regclass('public.value_object_analytics_profiles_v1') is null then
    raise exception 'ARCTOR_ATIP_V1_PREFLIGHT: value_object_analytics_profiles_v1 missing';
  end if;
  if to_regclass('public.actor_public_profiles') is null then
    raise exception 'ARCTOR_ATIP_V1_PREFLIGHT: actor_public_profiles missing';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'activity_events' and column_name = 'activity_template_id'
  ) then
    raise exception 'ARCTOR_ATIP_V1_PREFLIGHT: activity_events.activity_template_id missing';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'activity_events' and column_name = 'metadata_json'
  ) then
    raise exception 'ARCTOR_ATIP_V1_PREFLIGHT: activity_events.metadata_json missing';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'activity_events' and column_name = 'acting_as_actor_id'
  ) then
    raise exception 'ARCTOR_ATIP_V1_PREFLIGHT: activity_events.acting_as_actor_id missing';
  end if;
end
$$;

create table if not exists public.activity_template_impact_profiles_v1 (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.activity_templates(id) on delete cascade,
  owner_user_id uuid not null references public.app_users(id) on delete cascade,
  owner_actor_id uuid not null references public.actors(id) on delete cascade,
  version_no integer not null,
  status text not null default 'active',
  notes text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  retired_at timestamptz,
  constraint activity_template_impact_profiles_v1_version_check check (version_no >= 1),
  constraint activity_template_impact_profiles_v1_status_check check (status in ('active','retired')),
  constraint activity_template_impact_profiles_v1_template_version_unique unique (template_id, version_no)
);

create unique index if not exists idx_atip_v1_one_active_profile
  on public.activity_template_impact_profiles_v1(template_id)
  where status = 'active';

create index if not exists idx_atip_v1_owner
  on public.activity_template_impact_profiles_v1(owner_user_id, owner_actor_id, status);

create table if not exists public.activity_template_profile_parameters_v1 (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.activity_template_impact_profiles_v1(id) on delete cascade,
  parameter_code text not null,
  title text not null,
  unit_code text,
  is_required boolean not null default false,
  display_order integer not null default 100,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint atipp_v1_parameter_code_check check (
    parameter_code in ('process_count','repetition_count','distance_m','duration_seconds')
  ),
  constraint atipp_v1_title_not_empty check (length(trim(title)) > 0),
  constraint atipp_v1_profile_parameter_unique unique (profile_id, parameter_code)
);

create index if not exists idx_atipp_v1_profile_order
  on public.activity_template_profile_parameters_v1(profile_id, display_order, parameter_code);

create table if not exists public.activity_template_profile_object_links_v1 (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.activity_template_impact_profiles_v1(id) on delete cascade,
  target_value_object_id uuid not null references public.value_objects(id) on delete restrict,
  relation_code text not null default 'affects',
  confidence numeric(5,4) not null default 1,
  notes text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint atipol_v1_relation_check check (
    relation_code in ('affects','uses','supports','inhibits','observes')
  ),
  constraint atipol_v1_confidence_check check (confidence >= 0 and confidence <= 1),
  constraint atipol_v1_profile_target_unique unique (profile_id, target_value_object_id)
);

-- Fast in both directions: template/profile -> objects and object -> profiles.
create index if not exists idx_atipol_v1_profile_target
  on public.activity_template_profile_object_links_v1(profile_id, target_value_object_id);
create index if not exists idx_atipol_v1_target_profile
  on public.activity_template_profile_object_links_v1(target_value_object_id, profile_id);

create table if not exists public.activity_template_parameter_routes_v1 (
  id uuid primary key default gen_random_uuid(),
  profile_object_link_id uuid not null references public.activity_template_profile_object_links_v1(id) on delete cascade,
  profile_parameter_id uuid not null references public.activity_template_profile_parameters_v1(id) on delete cascade,
  target_parameter_code text not null,
  aggregation_code text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint atipr_v1_target_parameter_check check (
    target_parameter_code ~ '^[a-z][a-z0-9_]{0,79}$'
  ),
  constraint atipr_v1_aggregation_check check (
    aggregation_code in ('copy','count','sum','max','min','avg')
  ),
  constraint atipr_v1_route_unique unique (
    profile_object_link_id,
    profile_parameter_id,
    target_parameter_code
  )
);

create index if not exists idx_atipr_v1_link
  on public.activity_template_parameter_routes_v1(profile_object_link_id);
create index if not exists idx_atipr_v1_parameter
  on public.activity_template_parameter_routes_v1(profile_parameter_id);

-- Snapshot the exact profile version used by an event. Existing events remain untouched.
alter table public.activity_events
  add column if not exists impact_profile_id uuid
  references public.activity_template_impact_profiles_v1(id)
  on delete set null;

create index if not exists idx_activity_events_impact_profile_id
  on public.activity_events(impact_profile_id)
  where impact_profile_id is not null;

create or replace function public.set_activity_event_impact_profile_v1()
returns trigger
language plpgsql
security invoker
set search_path = public, extensions, pg_temp
as $$
begin
  if new.activity_template_id is null then
    new.impact_profile_id := null;
    return new;
  end if;

  if tg_op = 'INSERT' then
    select p.id
      into new.impact_profile_id
    from public.activity_template_impact_profiles_v1 p
    where p.template_id = new.activity_template_id
      and p.status = 'active'
    order by p.version_no desc
    limit 1;
    return new;
  end if;

  if new.activity_template_id is distinct from old.activity_template_id then
    select p.id
      into new.impact_profile_id
    from public.activity_template_impact_profiles_v1 p
    where p.template_id = new.activity_template_id
      and p.status = 'active'
    order by p.version_no desc
    limit 1;
    return new;
  end if;

  if new.impact_profile_id is null then
    select p.id
      into new.impact_profile_id
    from public.activity_template_impact_profiles_v1 p
    where p.template_id = new.activity_template_id
      and p.status = 'active'
    order by p.version_no desc
    limit 1;
  elsif not exists (
    select 1
    from public.activity_template_impact_profiles_v1 p
    where p.id = new.impact_profile_id
      and p.template_id = new.activity_template_id
  ) then
    raise exception 'ATIP_V1_EVENT_PROFILE_TEMPLATE_MISMATCH';
  end if;

  return new;
end
$$;

drop trigger if exists trg_activity_events_impact_profile_v1 on public.activity_events;
create trigger trg_activity_events_impact_profile_v1
before insert or update of activity_template_id, impact_profile_id
on public.activity_events
for each row
execute function public.set_activity_event_impact_profile_v1();

-- Safe numeric extraction from event metadata. Invalid text returns NULL, never raises.
create or replace function public.arctor_jsonb_first_numeric_v1(
  p_json jsonb,
  p_keys text[]
)
returns numeric
language plpgsql
immutable
strict
set search_path = public, extensions, pg_temp
as $$
declare
  v_key text;
  v_text text;
begin
  foreach v_key in array p_keys loop
    v_text := nullif(trim(p_json ->> v_key), '');
    if v_text is not null and v_text ~ '^[+-]?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)$' then
      return v_text::numeric;
    end if;
  end loop;
  return null;
end
$$;

-- Virtual expansion: no 67 physical fact rows are inserted per event.
create or replace view public.activity_event_profile_object_contributions_v1
with (security_invoker = true)
as
select
  e.id as event_id,
  e.user_id,
  e.acting_as_actor_id,
  e.activity_template_id as template_id,
  e.impact_profile_id as profile_id,
  l.id as profile_object_link_id,
  l.target_value_object_id,
  l.relation_code,
  l.confidence,
  coalesce(e.started_at, e.ended_at, e.created_at) as event_at,
  1::numeric as process_count,
  public.arctor_jsonb_first_numeric_v1(
    coalesce(e.metadata_json, '{}'::jsonb),
    array['repetition_count','repetitionCount','repetitions','reps']
  ) as repetition_count,
  public.arctor_jsonb_first_numeric_v1(
    coalesce(e.metadata_json, '{}'::jsonb),
    array['distance_m','distanceM','distance_meters','distanceMeters']
  ) as distance_m,
  coalesce(
    public.arctor_jsonb_first_numeric_v1(
      coalesce(e.metadata_json, '{}'::jsonb),
      array['duration_seconds','durationSeconds']
    ),
    case when e.duration_minutes is not null then e.duration_minutes::numeric * 60 else null end
  ) as duration_seconds
from public.activity_events e
join public.activity_template_profile_object_links_v1 l
  on l.profile_id = e.impact_profile_id
where e.impact_profile_id is not null;

-- Parameter-level virtual contributions using the saved routing table.
create or replace view public.activity_event_virtual_parameter_contributions_v1
with (security_invoker = true)
as
select
  c.event_id,
  c.user_id,
  c.acting_as_actor_id,
  c.template_id,
  c.profile_id,
  c.profile_object_link_id,
  c.target_value_object_id,
  c.relation_code,
  c.confidence,
  c.event_at,
  p.parameter_code as source_parameter_code,
  r.target_parameter_code,
  r.aggregation_code,
  case p.parameter_code
    when 'process_count' then c.process_count
    when 'repetition_count' then c.repetition_count
    when 'distance_m' then c.distance_m
    when 'duration_seconds' then c.duration_seconds
    else null
  end as value_numeric
from public.activity_event_profile_object_contributions_v1 c
join public.activity_template_parameter_routes_v1 r
  on r.profile_object_link_id = c.profile_object_link_id
join public.activity_template_profile_parameters_v1 p
  on p.id = r.profile_parameter_id
 and p.profile_id = c.profile_id;

-- Atomic save: create/update a private user template and write a new immutable profile version.
create or replace function public.save_activity_template_impact_profile_v1(
  p_owner_user_id uuid,
  p_owner_actor_id uuid,
  p_template_id uuid,
  p_title text,
  p_description text,
  p_template_group text,
  p_default_duration_minutes integer,
  p_notes text,
  p_parameters jsonb,
  p_links jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_template_id uuid;
  v_profile_id uuid;
  v_version integer;
  v_parameter jsonb;
  v_link jsonb;
  v_route jsonb;
  v_parameter_id uuid;
  v_process_parameter_id uuid;
  v_link_id uuid;
  v_target_id uuid;
  v_relation text;
  v_confidence numeric;
  v_code text;
  v_target_code text;
  v_aggregation text;
  v_title text;
  v_unit text;
  v_required boolean;
  v_display integer;
  v_routes jsonb;
  v_has_process_route boolean;
begin
  if p_owner_user_id is null or p_owner_actor_id is null then
    raise exception 'ATIP_V1_OWNER_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.actors a
    join public.actor_public_profiles ap
      on ap.actor_id = a.id
     and ap.owner_user_id = p_owner_user_id
    where a.id = p_owner_actor_id
      and a.status = 'active'
  ) then
    raise exception 'ATIP_V1_ACTIVE_ACTOR_NOT_OWNED';
  end if;

  if p_title is null or length(trim(p_title)) < 1 or length(trim(p_title)) > 180 then
    raise exception 'ATIP_V1_TITLE_INVALID';
  end if;

  if p_default_duration_minutes is not null and p_default_duration_minutes < 0 then
    raise exception 'ATIP_V1_DURATION_INVALID';
  end if;

  if p_parameters is null or jsonb_typeof(p_parameters) <> 'array' then
    raise exception 'ATIP_V1_PARAMETERS_ARRAY_REQUIRED';
  end if;
  if p_links is null or jsonb_typeof(p_links) <> 'array' then
    raise exception 'ATIP_V1_LINKS_ARRAY_REQUIRED';
  end if;
  if jsonb_array_length(p_links) > 500 then
    raise exception 'ATIP_V1_TOO_MANY_LINKS';
  end if;

  if p_template_id is null then
    v_template_id := gen_random_uuid();
    insert into public.activity_templates (
      id,
      owner_user_id,
      owner_actor_id,
      organization_id,
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
      default_status,
      default_source_type,
      default_privacy_scope,
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
    ) values (
      v_template_id,
      p_owner_user_id,
      p_owner_actor_id,
      null,
      'user-' || replace(v_template_id::text, '-', ''),
      trim(p_title),
      trim(p_title),
      nullif(trim(coalesce(p_description,'')),''),
      coalesce(nullif(trim(p_template_group),''),'general'),
      'user',
      'private',
      'user_created',
      'active',
      p_default_duration_minutes,
      'completed',
      'manual_chat',
      'private',
      true,
      false,
      true,
      true,
      true,
      true,
      '{}'::jsonb,
      '{}'::jsonb,
      jsonb_build_object('contract','ARCTOR_ACTIVITY_TEMPLATE_IMPACT_PROFILE_AUTHORING_V1'),
      100,
      true
    );
  else
    select t.id
      into v_template_id
    from public.activity_templates t
    where t.id = p_template_id
      and t.template_scope = 'user'
      and t.owner_user_id = p_owner_user_id
      and t.owner_actor_id = p_owner_actor_id
      and t.organization_id is null
    for update;

    if v_template_id is null then
      raise exception 'ATIP_V1_TEMPLATE_NOT_OWNED';
    end if;

    update public.activity_templates
    set
      title = trim(p_title),
      short_title = trim(p_title),
      description = nullif(trim(coalesce(p_description,'')),''),
      template_group = coalesce(nullif(trim(p_template_group),''),'general'),
      default_duration_minutes = p_default_duration_minutes,
      status = 'active',
      is_active = true,
      updated_at = now()
    where id = v_template_id;
  end if;

  select coalesce(max(p.version_no),0) + 1
    into v_version
  from public.activity_template_impact_profiles_v1 p
  where p.template_id = v_template_id;

  update public.activity_template_impact_profiles_v1
  set status = 'retired', retired_at = now(), updated_at = now()
  where template_id = v_template_id and status = 'active';

  insert into public.activity_template_impact_profiles_v1 (
    template_id, owner_user_id, owner_actor_id, version_no, status, notes, metadata_json
  ) values (
    v_template_id,
    p_owner_user_id,
    p_owner_actor_id,
    v_version,
    'active',
    nullif(trim(coalesce(p_notes,'')),''),
    jsonb_build_object(
      'contract','ARCTOR_ACTIVITY_TEMPLATE_IMPACT_PROFILE_AUTHORING_V1',
      'virtualContributions',true,
      'rawFactsRemainImmutable',true
    )
  ) returning id into v_profile_id;

  -- Every linked object always receives one virtual process per real event.
  insert into public.activity_template_profile_parameters_v1 (
    profile_id, parameter_code, title, unit_code, is_required, display_order
  ) values (
    v_profile_id, 'process_count', 'Количество процессов', 'process', true, 10
  ) returning id into v_process_parameter_id;

  for v_parameter in select value from jsonb_array_elements(p_parameters) loop
    v_code := lower(trim(coalesce(v_parameter ->> 'parameterCode','')));
    if v_code = 'process_count' then
      continue;
    end if;
    if v_code not in ('repetition_count','distance_m','duration_seconds') then
      raise exception 'ATIP_V1_PARAMETER_CODE_INVALID: %', v_code;
    end if;

    v_title := coalesce(nullif(trim(v_parameter ->> 'title'),''), v_code);
    v_unit := nullif(trim(v_parameter ->> 'unitCode'),'');
    v_required := coalesce((v_parameter ->> 'isRequired')::boolean, false);
    v_display := coalesce((v_parameter ->> 'displayOrder')::integer, 100);

    if not exists (
      select 1 from public.activity_template_profile_parameters_v1 p
      where p.profile_id = v_profile_id and p.parameter_code = v_code
    ) then
      insert into public.activity_template_profile_parameters_v1 (
        profile_id, parameter_code, title, unit_code, is_required, display_order
      ) values (
        v_profile_id, v_code, left(v_title,180), left(v_unit,40), v_required, v_display
      );
    end if;
  end loop;

  for v_link in select value from jsonb_array_elements(p_links) loop
    if coalesce(v_link ->> 'targetValueObjectId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      raise exception 'ATIP_V1_TARGET_ID_INVALID';
    end if;
    v_target_id := (v_link ->> 'targetValueObjectId')::uuid;
    v_relation := lower(trim(coalesce(v_link ->> 'relationCode','affects')));
    if v_relation not in ('affects','uses','supports','inhibits','observes') then
      raise exception 'ATIP_V1_RELATION_INVALID: %', v_relation;
    end if;
    v_confidence := coalesce((v_link ->> 'confidence')::numeric, 1);
    if v_confidence < 0 or v_confidence > 1 then
      raise exception 'ATIP_V1_CONFIDENCE_INVALID';
    end if;

    if not exists (
      select 1
      from public.value_objects vo
      where vo.id = v_target_id
        and vo.ontology_node_role_code = 'leaf'
        and (
          (
            vo.scope_code = 'global'
            and vo.owner_user_id is null
            and vo.owner_actor_id is null
            and vo.status = 'active'
          )
          or
          (
            vo.scope_code = 'actor'
            and vo.owner_user_id = p_owner_user_id
            and vo.owner_actor_id = p_owner_actor_id
            and vo.status in ('draft','active')
          )
        )
    ) then
      raise exception 'ATIP_V1_TARGET_NOT_ACCESSIBLE_LEAF: %', v_target_id;
    end if;

    insert into public.activity_template_profile_object_links_v1 (
      profile_id, target_value_object_id, relation_code, confidence, notes, metadata_json
    ) values (
      v_profile_id,
      v_target_id,
      v_relation,
      v_confidence,
      nullif(trim(coalesce(v_link ->> 'notes','')),''),
      jsonb_build_object('source','manual_template_authoring')
    ) returning id into v_link_id;

    v_routes := coalesce(v_link -> 'routes','[]'::jsonb);
    if jsonb_typeof(v_routes) <> 'array' then
      raise exception 'ATIP_V1_ROUTES_ARRAY_REQUIRED';
    end if;
    if jsonb_array_length(v_routes) > 40 then
      raise exception 'ATIP_V1_TOO_MANY_ROUTES';
    end if;

    v_has_process_route := false;

    for v_route in select value from jsonb_array_elements(v_routes) loop
      v_code := lower(trim(coalesce(v_route ->> 'sourceParameterCode','')));
      v_target_code := lower(trim(coalesce(v_route ->> 'targetParameterCode','')));
      v_aggregation := lower(trim(coalesce(v_route ->> 'aggregationCode','')));

      if v_target_code !~ '^[a-z][a-z0-9_]{0,79}$' then
        raise exception 'ATIP_V1_TARGET_PARAMETER_INVALID: %', v_target_code;
      end if;
      if v_aggregation not in ('copy','count','sum','max','min','avg') then
        raise exception 'ATIP_V1_AGGREGATION_INVALID: %', v_aggregation;
      end if;

      select p.id
        into v_parameter_id
      from public.activity_template_profile_parameters_v1 p
      where p.profile_id = v_profile_id and p.parameter_code = v_code;

      if v_parameter_id is null then
        raise exception 'ATIP_V1_SOURCE_PARAMETER_NOT_ENABLED: %', v_code;
      end if;

      insert into public.activity_template_parameter_routes_v1 (
        profile_object_link_id, profile_parameter_id, target_parameter_code, aggregation_code
      ) values (
        v_link_id, v_parameter_id, v_target_code, v_aggregation
      ) on conflict do nothing;

      if v_code = 'process_count' and v_target_code = 'process_count' then
        v_has_process_route := true;
      end if;
    end loop;

    if not v_has_process_route then
      insert into public.activity_template_parameter_routes_v1 (
        profile_object_link_id, profile_parameter_id, target_parameter_code, aggregation_code
      ) values (
        v_link_id, v_process_parameter_id, 'process_count', 'count'
      ) on conflict do nothing;
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'templateId', v_template_id,
    'profileId', v_profile_id,
    'versionNo', v_version,
    'linkedObjects', jsonb_array_length(p_links)
  );
end
$$;

-- RLS: these are internal authoring/projection tables. Application API uses service_role
-- after Auth0 + active actor resolution. No direct browser table access.
alter table public.activity_template_impact_profiles_v1 enable row level security;
alter table public.activity_template_profile_parameters_v1 enable row level security;
alter table public.activity_template_profile_object_links_v1 enable row level security;
alter table public.activity_template_parameter_routes_v1 enable row level security;

revoke all on table public.activity_template_impact_profiles_v1 from public, anon, authenticated;
revoke all on table public.activity_template_profile_parameters_v1 from public, anon, authenticated;
revoke all on table public.activity_template_profile_object_links_v1 from public, anon, authenticated;
revoke all on table public.activity_template_parameter_routes_v1 from public, anon, authenticated;
revoke all on public.activity_event_profile_object_contributions_v1 from public, anon, authenticated;
revoke all on public.activity_event_virtual_parameter_contributions_v1 from public, anon, authenticated;
revoke all on function public.save_activity_template_impact_profile_v1(uuid,uuid,uuid,text,text,text,integer,text,jsonb,jsonb) from public, anon, authenticated;
revoke all on function public.arctor_jsonb_first_numeric_v1(jsonb,text[]) from public, anon, authenticated;

grant select, insert, update, delete on table public.activity_template_impact_profiles_v1 to service_role;
grant select, insert, update, delete on table public.activity_template_profile_parameters_v1 to service_role;
grant select, insert, update, delete on table public.activity_template_profile_object_links_v1 to service_role;
grant select, insert, update, delete on table public.activity_template_parameter_routes_v1 to service_role;
grant select on public.activity_event_profile_object_contributions_v1 to service_role;
grant select on public.activity_event_virtual_parameter_contributions_v1 to service_role;
grant execute on function public.save_activity_template_impact_profile_v1(uuid,uuid,uuid,text,text,text,integer,text,jsonb,jsonb) to service_role;
grant execute on function public.arctor_jsonb_first_numeric_v1(jsonb,text[]) to service_role;

comment on table public.activity_template_impact_profiles_v1 is
'ARCTor reusable, versioned impact profile for an activity template. One profile stores the reusable map to observation objects; events do not fan out into physical fact rows.';
comment on table public.activity_template_parameter_routes_v1 is
'Controlled parameter routing only. No arbitrary formula/eval. Maps event parameters to observation-object parameter codes.';
comment on view public.activity_event_virtual_parameter_contributions_v1 is
'Virtual event->object parameter contributions. Query-time expansion; no physical 67x fact fan-out.';

commit;
