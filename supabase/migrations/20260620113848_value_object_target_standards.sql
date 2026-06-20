begin;

create table if not exists public.value_object_target_standards (
  id uuid primary key default gen_random_uuid(),

  value_object_id uuid not null
    references public.value_objects(id)
    on delete cascade,

  user_id uuid not null
    references public.app_users(id)
    on delete cascade,

  owner_actor_id uuid not null
    references public.actors(id)
    on delete cascade,

  created_by_actor_id uuid
    references public.actors(id)
    on delete set null,

  organization_id uuid
    references public.organizations(id)
    on delete set null,

  metric_type text not null,
  rule_type text not null,
  target_value numeric not null,
  target_min numeric,
  target_max numeric,
  unit text not null,
  period text not null,

  priority text not null default 'normal',
  source text not null default 'user_defined',
  status text not null default 'active',

  label text,
  description text,
  safety_note text,
  idempotency_key text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint value_object_target_standards_metric_type_allowed
    check (
      metric_type in (
        'duration',
        'volume',
        'count',
        'distance',
        'energy',
        'money',
        'score'
      )
    ),

  constraint value_object_target_standards_rule_type_allowed
    check (
      rule_type in (
        'desired_minimum',
        'desired_maximum',
        'desired_range',
        'exact_target',
        'frequency_minimum'
      )
    ),

  constraint value_object_target_standards_unit_allowed
    check (
      unit in (
        'minutes',
        'hours',
        'liters',
        'milliliters',
        'steps',
        'repetitions',
        'kilometers',
        'kcal',
        'PLN',
        'EUR',
        'points',
        'score'
      )
    ),

  constraint value_object_target_standards_period_allowed
    check (
      period in (
        'day',
        'week',
        'month',
        'quarter',
        'year',
        'rolling_7_days',
        'rolling_30_days'
      )
    ),

  constraint value_object_target_standards_priority_allowed
    check (
      priority in (
        'low',
        'normal',
        'high',
        'critical'
      )
    ),

  constraint value_object_target_standards_source_allowed
    check (
      source in (
        'user_defined',
        'system_default',
        'professional_guideline',
        'manual',
        'imported'
      )
    ),

  constraint value_object_target_standards_status_allowed
    check (
      status in (
        'draft',
        'active',
        'archived'
      )
    ),

  constraint value_object_target_standards_non_negative_values
    check (
      target_value >= 0
      and (target_min is null or target_min >= 0)
      and (target_max is null or target_max >= 0)
    ),

  constraint value_object_target_standards_range_values_valid
    check (
      (
        rule_type <> 'desired_range'
      )
      or
      (
        target_min is not null
        and target_max is not null
        and target_min <= target_max
      )
    ),

  constraint value_object_target_standards_label_length
    check (
      label is null
      or char_length(label) <= 200
    ),

  constraint value_object_target_standards_description_length
    check (
      description is null
      or char_length(description) <= 4000
    ),

  constraint value_object_target_standards_safety_note_length
    check (
      safety_note is null
      or char_length(safety_note) <= 500
    ),

  constraint value_object_target_standards_metadata_object
    check (
      jsonb_typeof(metadata) = 'object'
    )
);

comment on table public.value_object_target_standards is
  'User-owned structured target standards for Value Objects. Used to compare activity facts against planned values such as duration, volume, count, distance, money or score. Server-mediated writes only.';

comment on column public.value_object_target_standards.value_object_id is
  'Target Value Object whose facts will be compared with this standard.';

comment on column public.value_object_target_standards.user_id is
  'Owner app_users.id. Derived server-side from Auth0 session; client-provided ownership must not be trusted.';

comment on column public.value_object_target_standards.owner_actor_id is
  'Owner actor id, normally the current person actor. Used to align with Value Object ownership checks.';

comment on column public.value_object_target_standards.metric_type is
  'What is measured: duration, volume, count, distance, energy, money or score.';

comment on column public.value_object_target_standards.rule_type is
  'How actual facts are compared with the target: desired minimum, maximum, range, exact target or frequency minimum.';

comment on column public.value_object_target_standards.target_value is
  'Main target value. For desired_range this can store a representative midpoint or user-visible reference value while target_min and target_max hold the actual range.';

comment on column public.value_object_target_standards.safety_note is
  'Product safety note. Standards are analytics targets/reference thresholds, not medical diagnosis, legal advice or guaranteed productivity truth.';

create index if not exists value_object_target_standards_value_object_id_idx
  on public.value_object_target_standards (value_object_id);

create index if not exists value_object_target_standards_user_id_idx
  on public.value_object_target_standards (user_id);

create index if not exists value_object_target_standards_owner_actor_id_idx
  on public.value_object_target_standards (owner_actor_id);

create index if not exists value_object_target_standards_org_id_idx
  on public.value_object_target_standards (organization_id);

create index if not exists value_object_target_standards_status_idx
  on public.value_object_target_standards (status);

create index if not exists value_object_target_standards_metric_period_idx
  on public.value_object_target_standards (metric_type, period);

create index if not exists value_object_target_standards_user_vo_status_idx
  on public.value_object_target_standards (user_id, value_object_id, status);

create unique index if not exists value_object_target_standards_idempotency_unique_idx
  on public.value_object_target_standards (user_id, value_object_id, idempotency_key)
  where idempotency_key is not null;

do $$
begin
  if exists (
    select 1
    from pg_proc
    join pg_namespace
      on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname = 'set_universal_rubricator_updated_at'
  ) and not exists (
    select 1
    from pg_trigger
    where tgname = 'value_object_target_standards_set_updated_at'
  ) then
    create trigger value_object_target_standards_set_updated_at
    before update on public.value_object_target_standards
    for each row
    execute function public.set_universal_rubricator_updated_at();
  end if;
end $$;

alter table public.value_object_target_standards enable row level security;

revoke all on table public.value_object_target_standards from anon;
revoke all on table public.value_object_target_standards from authenticated;

drop policy if exists "No direct client access to value object target standards"
on public.value_object_target_standards;

create policy "No direct client access to value object target standards"
on public.value_object_target_standards
for all
to anon, authenticated
using (false)
with check (false);

grant select, insert, update, delete on table public.value_object_target_standards to service_role;

commit;

