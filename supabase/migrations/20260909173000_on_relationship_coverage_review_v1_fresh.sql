/* ARCTor.app — ON Relationship Coverage Review v1 (fresh baseline release)
   Global-system relation layer + curator review state.
   Does not mutate value_objects identity rows.
*/
begin;
-- Primary global roots confirmed by read-only DB intake 2026-09-09:
-- Systems and Structures : 1f86ed22-e220-562a-b2a4-341abf5c5780
-- States and Needs       : 6ba4ecf1-8a05-5eaa-b280-4eb7aff2a42a
-- Actions and Processes  : 5b0746a5-0089-5ef4-8cb9-f8279c0ca233
set local lock_timeout = '5s';
set local statement_timeout = '180s';

create table if not exists public.system_value_object_relations (
  id uuid primary key default gen_random_uuid(),
  relation_type_code text not null references public.value_object_relation_types(relation_type_code) on update restrict on delete restrict,
  source_value_object_id uuid not null references public.value_objects(id) on delete restrict,
  target_value_object_id uuid not null references public.value_objects(id) on delete restrict,
  status text not null default 'active' check (status in ('active','inactive')),
  provenance_code text not null default 'curator_manual' check (provenance_code in ('curator_manual','expert_model','imported')),
  created_by_user_id uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint system_vo_relation_no_self_check check (source_value_object_id <> target_value_object_id),
  constraint system_vo_relation_unique unique (relation_type_code,source_value_object_id,target_value_object_id)
);

create index if not exists system_vo_relations_source_idx on public.system_value_object_relations(source_value_object_id,status);
create index if not exists system_vo_relations_target_idx on public.system_value_object_relations(target_value_object_id,status);

create or replace function public.guard_system_value_object_relation_v1()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v_source record; v_target record; v_type record;
begin
  select id,facet_code,node_role_code,owner_user_id,owner_actor_id,status into v_source from public.value_objects where id=new.source_value_object_id;
  select id,facet_code,node_role_code,owner_user_id,owner_actor_id,status into v_target from public.value_objects where id=new.target_value_object_id;
  select * into v_type from public.value_object_relation_types where relation_type_code=new.relation_type_code;
  if v_source.id is null or v_target.id is null then raise exception 'SYSTEM_RELATION_ENDPOINT_NOT_FOUND'; end if;
  if v_source.owner_user_id is not null or v_source.owner_actor_id is not null or v_target.owner_user_id is not null or v_target.owner_actor_id is not null then raise exception 'SYSTEM_RELATION_REQUIRES_GLOBAL_ENDPOINTS'; end if;
  if v_source.status <> 'active' or v_target.status <> 'active' then raise exception 'SYSTEM_RELATION_ENDPOINT_INACTIVE'; end if;
  if v_type.relation_type_code is null or v_type.status <> 'active' or coalesce(v_type.canonical_write_policy_code,'disabled') <> 'enabled' then raise exception 'SYSTEM_RELATION_TYPE_NOT_WRITABLE'; end if;
  if not (v_source.facet_code = any(v_type.allowed_source_facet_codes)) or not (v_target.facet_code = any(v_type.allowed_target_facet_codes)) then raise exception 'SYSTEM_RELATION_FACET_GUARD_REJECTED'; end if;
  if not (v_source.node_role_code = any(v_type.allowed_source_node_roles)) or not (v_target.node_role_code = any(v_type.allowed_target_node_roles)) then raise exception 'SYSTEM_RELATION_NODE_ROLE_GUARD_REJECTED'; end if;
  new.updated_at := clock_timestamp(); return new;
end; $$;

drop trigger if exists system_value_object_relation_guard_v1 on public.system_value_object_relations;
create trigger system_value_object_relation_guard_v1 before insert or update of relation_type_code,source_value_object_id,target_value_object_id,status on public.system_value_object_relations for each row execute function public.guard_system_value_object_relation_v1();

create table if not exists public.value_object_relation_zone_reviews (
  id uuid primary key default gen_random_uuid(),
  value_object_id uuid not null references public.value_objects(id) on delete cascade,
  zone_key text not null,
  outcome_code text not null check (outcome_code in ('links_confirmed','no_links_required','not_applicable','expected_missing')),
  reviewed_at timestamptz not null default clock_timestamp(),
  next_review_at timestamptz,
  reviewed_by_user_id uuid references public.app_users(id) on delete set null,
  review_note text,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint value_object_relation_zone_reviews_key_unique unique(value_object_id,zone_key),
  constraint value_object_relation_zone_reviews_zone_key_check check (char_length(zone_key) between 3 and 160)
);
create index if not exists value_object_relation_zone_reviews_due_idx on public.value_object_relation_zone_reviews(next_review_at) where next_review_at is not null;

alter table public.system_value_object_relations enable row level security;
alter table public.value_object_relation_zone_reviews enable row level security;
revoke all on table public.system_value_object_relations from public,anon,authenticated;
revoke all on table public.value_object_relation_zone_reviews from public,anon,authenticated;
grant select,insert,update,delete on table public.system_value_object_relations to service_role;
grant select,insert,update,delete on table public.value_object_relation_zone_reviews to service_role;

comment on table public.system_value_object_relations is 'Curator-managed typed relations between global system value objects. Separate from actor-owned ordinary relations.';
comment on table public.value_object_relation_zone_reviews is 'Independent completeness-review state per value object and relation/plane zone. Empty reviewed zones are meaningful.';
commit;
