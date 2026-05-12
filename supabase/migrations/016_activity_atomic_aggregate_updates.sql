create unique index if not exists daily_aggregates_user_date_type_key_metric_uidx
on public.daily_aggregates (
  user_id,
  aggregate_date,
  aggregate_type,
  aggregate_key,
  metric_key
);

create unique index if not exists current_snapshots_user_entity_metric_uidx
on public.current_snapshots (
  user_id,
  snapshot_entity_type,
  snapshot_entity_key,
  metric_key
);

create or replace function public.increment_daily_aggregate(
  p_user_id uuid,
  p_event_id uuid,
  p_aggregate_date date,
  p_aggregate_type text,
  p_aggregate_key text,
  p_metric_key text,
  p_metric_unit text,
  p_delta numeric,
  p_source text default 'rule',
  p_metadata_json jsonb default '{}'::jsonb
)
returns public.daily_aggregates
language plpgsql
set search_path = public
as $$
declare
  v_row public.daily_aggregates;
begin
  insert into public.daily_aggregates (
    user_id,
    aggregate_date,
    aggregate_type,
    aggregate_key,
    metric_key,
    metric_value_numeric,
    metric_unit,
    source,
    last_event_id,
    metadata_json
  )
  values (
    p_user_id,
    p_aggregate_date,
    p_aggregate_type,
    p_aggregate_key,
    p_metric_key,
    coalesce(p_delta, 0),
    p_metric_unit,
    coalesce(p_source, 'rule'),
    p_event_id,
    coalesce(p_metadata_json, '{}'::jsonb)
  )
  on conflict (
    user_id,
    aggregate_date,
    aggregate_type,
    aggregate_key,
    metric_key
  )
  do update set
    metric_value_numeric =
      coalesce(public.daily_aggregates.metric_value_numeric, 0)
      + coalesce(excluded.metric_value_numeric, 0),
    metric_unit = excluded.metric_unit,
    source = excluded.source,
    last_event_id = excluded.last_event_id,
    metadata_json =
      coalesce(public.daily_aggregates.metadata_json, '{}'::jsonb)
      || coalesce(excluded.metadata_json, '{}'::jsonb),
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.upsert_current_snapshot(
  p_user_id uuid,
  p_event_id uuid,
  p_snapshot_entity_type text,
  p_snapshot_entity_key text,
  p_metric_key text,
  p_metric_value_numeric numeric default null,
  p_metric_value_text text default null,
  p_metric_unit text default null,
  p_metadata_json jsonb default '{}'::jsonb
)
returns public.current_snapshots
language plpgsql
set search_path = public
as $$
declare
  v_row public.current_snapshots;
begin
  insert into public.current_snapshots (
    user_id,
    snapshot_entity_type,
    snapshot_entity_key,
    metric_key,
    metric_value_numeric,
    metric_value_text,
    metric_unit,
    last_event_id,
    metadata_json
  )
  values (
    p_user_id,
    p_snapshot_entity_type,
    p_snapshot_entity_key,
    p_metric_key,
    p_metric_value_numeric,
    p_metric_value_text,
    p_metric_unit,
    p_event_id,
    coalesce(p_metadata_json, '{}'::jsonb)
  )
  on conflict (
    user_id,
    snapshot_entity_type,
    snapshot_entity_key,
    metric_key
  )
  do update set
    metric_value_numeric =
      case
        when excluded.metric_value_numeric is null
          then public.current_snapshots.metric_value_numeric
        else
          coalesce(public.current_snapshots.metric_value_numeric, 0)
          + excluded.metric_value_numeric
      end,
    metric_value_text =
      coalesce(excluded.metric_value_text, public.current_snapshots.metric_value_text),
    metric_unit =
      coalesce(excluded.metric_unit, public.current_snapshots.metric_unit),
    last_event_id = excluded.last_event_id,
    metadata_json =
      coalesce(public.current_snapshots.metadata_json, '{}'::jsonb)
      || coalesce(excluded.metadata_json, '{}'::jsonb),
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.increment_daily_aggregate(
  uuid,
  uuid,
  date,
  text,
  text,
  text,
  text,
  numeric,
  text,
  jsonb
) to anon, authenticated, service_role;

grant execute on function public.upsert_current_snapshot(
  uuid,
  uuid,
  text,
  text,
  text,
  numeric,
  text,
  text,
  jsonb
) to anon, authenticated, service_role;
