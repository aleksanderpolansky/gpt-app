begin;

create table if not exists public.external_api_rate_limit_windows (
  provider text not null,
  operation text not null,
  scope_type text not null,
  scope_key text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (
    provider,
    operation,
    scope_type,
    scope_key,
    window_started_at
  ),
  constraint external_api_rate_limit_windows_provider_check
    check (provider in ('GOOGLE_PLACES_NEW')),
  constraint external_api_rate_limit_windows_operation_check
    check (operation in ('search', 'resolve')),
  constraint external_api_rate_limit_windows_scope_type_check
    check (
      scope_type in (
        'user_hour',
        'user_day',
        'global_day',
        'global_month'
      )
    ),
  constraint external_api_rate_limit_windows_scope_key_check
    check (length(scope_key) between 1 and 128),
  constraint external_api_rate_limit_windows_request_count_check
    check (request_count >= 0)
);

comment on table public.external_api_rate_limit_windows is
  'Server-only rolling quota counters for paid external APIs. GC address-search limits are enforced before any Google Places request.';

comment on column public.external_api_rate_limit_windows.scope_key is
  'A non-reversible SHA-256 application key for user scopes or * for global scopes. Raw Auth0 subjects are not stored.';

alter table public.external_api_rate_limit_windows enable row level security;

revoke all on table public.external_api_rate_limit_windows
  from public, anon, authenticated;

grant select, insert, update, delete
  on table public.external_api_rate_limit_windows
  to service_role;

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

  if p_operation = 'search' then
    v_user_scope_type := 'user_hour';
    v_user_window_start :=
      date_trunc('hour', v_now at time zone 'UTC') at time zone 'UTC';
    v_user_window_end := v_user_window_start + interval '1 hour';
    v_user_limit := 30;
    v_global_day_limit := 500;
    v_global_month_limit := 9000;
  elsif p_operation = 'resolve' then
    v_user_scope_type := 'user_day';
    v_user_window_start := v_global_day_start;
    v_user_window_end := v_global_day_start + interval '1 day';
    v_user_limit := 10;
    v_global_day_limit := 100;
    v_global_month_limit := 3000;
  else
    raise exception using
      errcode = '22023',
      message = 'GOOGLE_PLACES_RATE_LIMIT_INVALID_OPERATION';
  end if;

  v_global_day_end := v_global_day_start + interval '1 day';
  v_global_month_end := v_global_month_start + interval '1 month';

  /*
   * Traffic is intentionally low. A per-operation advisory transaction lock
   * gives exact counters and prevents concurrent requests from crossing the
   * global limits before both counters are updated.
   */
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
  'Atomically consumes one Google Places request allowance. Search: 30/user/hour, 500/day and 9000/month globally. Resolve: 10/user/day, 100/day and 3000/month globally.';

commit;
