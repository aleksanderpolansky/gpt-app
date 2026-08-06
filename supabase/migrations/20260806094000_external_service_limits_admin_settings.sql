begin;

create table if not exists public.external_api_rate_limit_settings (
  provider text not null,
  operation text not null,
  enabled boolean not null default true,
  user_scope_type text not null,
  user_limit integer not null,
  global_day_limit integer not null,
  global_month_limit integer not null,
  updated_at timestamptz not null default now(),
  updated_by_app_user_id uuid null references public.app_users(id) on delete set null,
  primary key (provider, operation),
  constraint external_api_rate_limit_settings_provider_check
    check (provider in ('GOOGLE_PLACES_NEW')),
  constraint external_api_rate_limit_settings_operation_check
    check (operation in ('search', 'resolve')),
  constraint external_api_rate_limit_settings_scope_check
    check (
      (operation = 'search' and user_scope_type = 'user_hour')
      or
      (operation = 'resolve' and user_scope_type = 'user_day')
    ),
  constraint external_api_rate_limit_settings_user_limit_check
    check (user_limit >= 1),
  constraint external_api_rate_limit_settings_day_limit_check
    check (global_day_limit >= 1),
  constraint external_api_rate_limit_settings_month_limit_check
    check (global_month_limit >= global_day_limit)
);

comment on table public.external_api_rate_limit_settings is
  'Server-only editable limits for paid external APIs. Values are administered from /admin/users and applied immediately.';

alter table public.external_api_rate_limit_settings enable row level security;

revoke all on table public.external_api_rate_limit_settings
  from public, anon, authenticated;

grant select, insert, update, delete
  on table public.external_api_rate_limit_settings
  to service_role;

create table if not exists public.external_api_rate_limit_settings_audit (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  operation text not null,
  previous_settings jsonb not null,
  new_settings jsonb not null,
  changed_by_app_user_id uuid not null references public.app_users(id) on delete restrict,
  changed_at timestamptz not null default now(),
  constraint external_api_rate_limit_settings_audit_provider_check
    check (provider in ('GOOGLE_PLACES_NEW')),
  constraint external_api_rate_limit_settings_audit_operation_check
    check (operation in ('search', 'resolve'))
);

comment on table public.external_api_rate_limit_settings_audit is
  'Immutable administrative audit trail for external API limit changes.';

alter table public.external_api_rate_limit_settings_audit enable row level security;

revoke all on table public.external_api_rate_limit_settings_audit
  from public, anon, authenticated;

grant select, insert
  on table public.external_api_rate_limit_settings_audit
  to service_role;

insert into public.external_api_rate_limit_settings (
  provider,
  operation,
  enabled,
  user_scope_type,
  user_limit,
  global_day_limit,
  global_month_limit
)
values
  (
    'GOOGLE_PLACES_NEW',
    'search',
    true,
    'user_hour',
    30,
    500,
    9000
  ),
  (
    'GOOGLE_PLACES_NEW',
    'resolve',
    true,
    'user_day',
    10,
    100,
    3000
  )
on conflict (provider, operation)
do nothing;

create or replace function public.update_google_places_rate_limit_settings_v1(
  p_actor_app_user_id uuid,
  p_search_enabled boolean,
  p_search_user_hour_limit integer,
  p_search_global_day_limit integer,
  p_search_global_month_limit integer,
  p_resolve_enabled boolean,
  p_resolve_user_day_limit integer,
  p_resolve_global_day_limit integer,
  p_resolve_global_month_limit integer
)
returns setof public.external_api_rate_limit_settings
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_search_before public.external_api_rate_limit_settings%rowtype;
  v_resolve_before public.external_api_rate_limit_settings%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  if p_actor_app_user_id is null then
    raise exception using
      errcode = '22023',
      message = 'EXTERNAL_LIMITS_ACTOR_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.platform_admins admins
    where admins.app_user_id = p_actor_app_user_id
      and admins.status = 'active'
      and admins.role in ('owner', 'admin')
  ) then
    raise exception using
      errcode = '42501',
      message = 'EXTERNAL_LIMITS_ACTIVE_ADMIN_REQUIRED';
  end if;

  if p_search_user_hour_limit < 1
     or p_search_global_day_limit < 1
     or p_search_global_month_limit < p_search_global_day_limit then
    raise exception using
      errcode = '22023',
      message = 'EXTERNAL_LIMITS_INVALID_SEARCH_VALUES';
  end if;

  if p_resolve_user_day_limit < 1
     or p_resolve_global_day_limit < 1
     or p_resolve_global_month_limit < p_resolve_global_day_limit then
    raise exception using
      errcode = '22023',
      message = 'EXTERNAL_LIMITS_INVALID_RESOLVE_VALUES';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('GOOGLE_PLACES_NEW:SETTINGS', 0)
  );

  select *
    into v_search_before
  from public.external_api_rate_limit_settings settings
  where settings.provider = 'GOOGLE_PLACES_NEW'
    and settings.operation = 'search'
  for update;

  select *
    into v_resolve_before
  from public.external_api_rate_limit_settings settings
  where settings.provider = 'GOOGLE_PLACES_NEW'
    and settings.operation = 'resolve'
  for update;

  if v_search_before.provider is null or v_resolve_before.provider is null then
    raise exception using
      errcode = 'P0001',
      message = 'EXTERNAL_LIMITS_SETTINGS_MISSING';
  end if;

  update public.external_api_rate_limit_settings
  set enabled = p_search_enabled,
      user_limit = p_search_user_hour_limit,
      global_day_limit = p_search_global_day_limit,
      global_month_limit = p_search_global_month_limit,
      updated_at = v_now,
      updated_by_app_user_id = p_actor_app_user_id
  where provider = 'GOOGLE_PLACES_NEW'
    and operation = 'search';

  update public.external_api_rate_limit_settings
  set enabled = p_resolve_enabled,
      user_limit = p_resolve_user_day_limit,
      global_day_limit = p_resolve_global_day_limit,
      global_month_limit = p_resolve_global_month_limit,
      updated_at = v_now,
      updated_by_app_user_id = p_actor_app_user_id
  where provider = 'GOOGLE_PLACES_NEW'
    and operation = 'resolve';

  if (
    v_search_before.enabled,
    v_search_before.user_limit,
    v_search_before.global_day_limit,
    v_search_before.global_month_limit
  ) is distinct from (
    p_search_enabled,
    p_search_user_hour_limit,
    p_search_global_day_limit,
    p_search_global_month_limit
  ) then
    insert into public.external_api_rate_limit_settings_audit (
      provider,
      operation,
      previous_settings,
      new_settings,
      changed_by_app_user_id,
      changed_at
    )
    values (
      'GOOGLE_PLACES_NEW',
      'search',
      jsonb_build_object(
        'enabled', v_search_before.enabled,
        'userScopeType', v_search_before.user_scope_type,
        'userLimit', v_search_before.user_limit,
        'globalDayLimit', v_search_before.global_day_limit,
        'globalMonthLimit', v_search_before.global_month_limit
      ),
      jsonb_build_object(
        'enabled', p_search_enabled,
        'userScopeType', 'user_hour',
        'userLimit', p_search_user_hour_limit,
        'globalDayLimit', p_search_global_day_limit,
        'globalMonthLimit', p_search_global_month_limit
      ),
      p_actor_app_user_id,
      v_now
    );
  end if;

  if (
    v_resolve_before.enabled,
    v_resolve_before.user_limit,
    v_resolve_before.global_day_limit,
    v_resolve_before.global_month_limit
  ) is distinct from (
    p_resolve_enabled,
    p_resolve_user_day_limit,
    p_resolve_global_day_limit,
    p_resolve_global_month_limit
  ) then
    insert into public.external_api_rate_limit_settings_audit (
      provider,
      operation,
      previous_settings,
      new_settings,
      changed_by_app_user_id,
      changed_at
    )
    values (
      'GOOGLE_PLACES_NEW',
      'resolve',
      jsonb_build_object(
        'enabled', v_resolve_before.enabled,
        'userScopeType', v_resolve_before.user_scope_type,
        'userLimit', v_resolve_before.user_limit,
        'globalDayLimit', v_resolve_before.global_day_limit,
        'globalMonthLimit', v_resolve_before.global_month_limit
      ),
      jsonb_build_object(
        'enabled', p_resolve_enabled,
        'userScopeType', 'user_day',
        'userLimit', p_resolve_user_day_limit,
        'globalDayLimit', p_resolve_global_day_limit,
        'globalMonthLimit', p_resolve_global_month_limit
      ),
      p_actor_app_user_id,
      v_now
    );
  end if;

  return query
  select settings.*
  from public.external_api_rate_limit_settings settings
  where settings.provider = 'GOOGLE_PLACES_NEW'
  order by settings.operation;
end;
$function$;

revoke all on function public.update_google_places_rate_limit_settings_v1(
  uuid,
  boolean,
  integer,
  integer,
  integer,
  boolean,
  integer,
  integer,
  integer
) from public, anon, authenticated;

grant execute on function public.update_google_places_rate_limit_settings_v1(
  uuid,
  boolean,
  integer,
  integer,
  integer,
  boolean,
  integer,
  integer,
  integer
) to service_role;

create or replace function public.consume_google_places_rate_limit_v1(
  p_user_key text,
  p_operation text
)
returns table (
  allowed boolean,
  retry_after_seconds integer,
  limit_scope text,
  user_count integer,
  user_limit integer,
  global_day_count integer,
  global_day_limit integer,
  global_month_count integer,
  global_month_limit integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_provider constant text := 'GOOGLE_PLACES_NEW';
  v_now timestamptz := clock_timestamp();

  v_enabled boolean;
  v_user_scope_type text;
  v_user_window_start timestamptz;
  v_user_window_end timestamptz;

  v_global_day_start timestamptz :=
    date_trunc('day', v_now at time zone 'UTC') at time zone 'UTC';
  v_global_day_end timestamptz;

  v_global_month_start timestamptz :=
    date_trunc('month', v_now at time zone 'UTC') at time zone 'UTC';
  v_global_month_end timestamptz;

  v_user_count integer := 0;
  v_user_limit integer;
  v_global_day_count integer := 0;
  v_global_day_limit integer;
  v_global_month_count integer := 0;
  v_global_month_limit integer;
  v_retry_until timestamptz;
begin
  p_user_key := lower(btrim(coalesce(p_user_key, '')));
  p_operation := lower(btrim(coalesce(p_operation, '')));

  if p_user_key !~ '^[a-f0-9]{64}$' then
    raise exception using
      errcode = '22023',
      message = 'GOOGLE_PLACES_RATE_LIMIT_INVALID_USER_KEY';
  end if;

  if p_operation not in ('search', 'resolve') then
    raise exception using
      errcode = '22023',
      message = 'GOOGLE_PLACES_RATE_LIMIT_INVALID_OPERATION';
  end if;

  select
    settings.enabled,
    settings.user_scope_type,
    settings.user_limit,
    settings.global_day_limit,
    settings.global_month_limit
  into
    v_enabled,
    v_user_scope_type,
    v_user_limit,
    v_global_day_limit,
    v_global_month_limit
  from public.external_api_rate_limit_settings settings
  where settings.provider = v_provider
    and settings.operation = p_operation;

  if v_enabled is null then
    raise exception using
      errcode = 'P0001',
      message = 'GOOGLE_PLACES_RATE_LIMIT_SETTINGS_MISSING';
  end if;

  if not v_enabled then
    allowed := false;
    retry_after_seconds := 3600;
    limit_scope := 'disabled';
    user_count := 0;
    user_limit := v_user_limit;
    global_day_count := 0;
    global_day_limit := v_global_day_limit;
    global_month_count := 0;
    global_month_limit := v_global_month_limit;
    return next;
    return;
  end if;

  if v_user_scope_type = 'user_hour' then
    v_user_window_start :=
      date_trunc('hour', v_now at time zone 'UTC') at time zone 'UTC';
    v_user_window_end := v_user_window_start + interval '1 hour';
  elsif v_user_scope_type = 'user_day' then
    v_user_window_start := v_global_day_start;
    v_user_window_end := v_global_day_start + interval '1 day';
  else
    raise exception using
      errcode = 'P0001',
      message = 'GOOGLE_PLACES_RATE_LIMIT_INVALID_SCOPE_SETTING';
  end if;

  v_global_day_end := v_global_day_start + interval '1 day';
  v_global_month_end := v_global_month_start + interval '1 month';

  perform pg_advisory_xact_lock(
    hashtextextended(v_provider || ':' || p_operation, 0)
  );

  delete from public.external_api_rate_limit_windows
  where provider = v_provider
    and window_started_at < v_global_month_start - interval '2 months';

  select counters.request_count
    into v_user_count
  from public.external_api_rate_limit_windows counters
  where counters.provider = v_provider
    and counters.operation = p_operation
    and counters.scope_type = v_user_scope_type
    and counters.scope_key = p_user_key
    and counters.window_started_at = v_user_window_start;

  v_user_count := coalesce(v_user_count, 0);

  select counters.request_count
    into v_global_day_count
  from public.external_api_rate_limit_windows counters
  where counters.provider = v_provider
    and counters.operation = p_operation
    and counters.scope_type = 'global_day'
    and counters.scope_key = '*'
    and counters.window_started_at = v_global_day_start;

  v_global_day_count := coalesce(v_global_day_count, 0);

  select counters.request_count
    into v_global_month_count
  from public.external_api_rate_limit_windows counters
  where counters.provider = v_provider
    and counters.operation = p_operation
    and counters.scope_type = 'global_month'
    and counters.scope_key = '*'
    and counters.window_started_at = v_global_month_start;

  v_global_month_count := coalesce(v_global_month_count, 0);

  if v_global_month_count >= v_global_month_limit then
    allowed := false;
    limit_scope := 'global_month';
    v_retry_until := v_global_month_end;
  elsif v_global_day_count >= v_global_day_limit then
    allowed := false;
    limit_scope := 'global_day';
    v_retry_until := v_global_day_end;
  elsif v_user_count >= v_user_limit then
    allowed := false;
    limit_scope := v_user_scope_type;
    v_retry_until := v_user_window_end;
  else
    insert into public.external_api_rate_limit_windows (
      provider,
      operation,
      scope_type,
      scope_key,
      window_started_at,
      request_count,
      updated_at
    )
    values (
      v_provider,
      p_operation,
      v_user_scope_type,
      p_user_key,
      v_user_window_start,
      1,
      v_now
    )
    on conflict (
      provider,
      operation,
      scope_type,
      scope_key,
      window_started_at
    )
    do update
      set request_count =
            public.external_api_rate_limit_windows.request_count + 1,
          updated_at = excluded.updated_at
    returning request_count into v_user_count;

    insert into public.external_api_rate_limit_windows (
      provider,
      operation,
      scope_type,
      scope_key,
      window_started_at,
      request_count,
      updated_at
    )
    values (
      v_provider,
      p_operation,
      'global_day',
      '*',
      v_global_day_start,
      1,
      v_now
    )
    on conflict (
      provider,
      operation,
      scope_type,
      scope_key,
      window_started_at
    )
    do update
      set request_count =
            public.external_api_rate_limit_windows.request_count + 1,
          updated_at = excluded.updated_at
    returning request_count into v_global_day_count;

    insert into public.external_api_rate_limit_windows (
      provider,
      operation,
      scope_type,
      scope_key,
      window_started_at,
      request_count,
      updated_at
    )
    values (
      v_provider,
      p_operation,
      'global_month',
      '*',
      v_global_month_start,
      1,
      v_now
    )
    on conflict (
      provider,
      operation,
      scope_type,
      scope_key,
      window_started_at
    )
    do update
      set request_count =
            public.external_api_rate_limit_windows.request_count + 1,
          updated_at = excluded.updated_at
    returning request_count into v_global_month_count;

    allowed := true;
    retry_after_seconds := 0;
    limit_scope := null;
  end if;

  if not allowed then
    retry_after_seconds := greatest(
      1,
      ceil(extract(epoch from (v_retry_until - v_now)))::integer
    );
  end if;

  user_count := v_user_count;
  user_limit := v_user_limit;
  global_day_count := v_global_day_count;
  global_day_limit := v_global_day_limit;
  global_month_count := v_global_month_count;
  global_month_limit := v_global_month_limit;

  return next;
end;
$function$;

revoke all on function public.consume_google_places_rate_limit_v1(text, text)
  from public, anon, authenticated;

grant execute
  on function public.consume_google_places_rate_limit_v1(text, text)
  to service_role;

comment on function public.consume_google_places_rate_limit_v1(text, text) is
  'Atomically consumes Google Places allowance using editable server-only settings from external_api_rate_limit_settings.';

commit;
