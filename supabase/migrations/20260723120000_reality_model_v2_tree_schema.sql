/*
ARCTor.app — Reality Model v2 / P3 Tree schema

Scope:
- add the five stable Value Object branch policies as a read-only registry;
- discard the current test-only Value Object graph and dependent test rows;
- add the canonical v2 tree identity columns to public.value_objects;
- enforce root/parent/branch/no-cycle/no-child-for-leaf invariants;
- temporarily accept new legacy-shaped writes only so existing application
  routes do not fail before their controlled P4-P6 cutover.

Deliberately out of scope:
- root Value Object presets (their final list is not locked yet);
- actor ownership cutover;
- profile attributes and parameter assignments;
- activity-to-Value-Object link cutover and transactional fact fan-out;
- plans, states, evaluations, indices and period analytics.
*/

begin;

do $$
begin
  if to_regclass('public.value_objects') is null then
    raise exception using
      errcode = '42P01',
      message = 'REALITY_V2_TREE_VALUE_OBJECTS_TABLE_REQUIRED';
  end if;
end;
$$;

/*
The project owner explicitly confirmed that all current site data is test
data and does not require preservation. CASCADE intentionally clears test
rows in tables that reference value_objects. No backfill is performed.
*/
truncate table public.value_objects cascade;

create table if not exists public.value_object_branch_types (
  branch_type_code text primary key,
  title_key text not null,
  description_key text not null,
  display_order integer not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint value_object_branch_types_code_format_check
    check (branch_type_code ~ '^[a-z][a-z0-9_]{1,79}$'),
  constraint value_object_branch_types_display_order_check
    check (display_order > 0),
  constraint value_object_branch_types_status_check
    check (status in ('active', 'inactive')),
  constraint value_object_branch_types_display_order_key
    unique (display_order)
);

comment on table public.value_object_branch_types is
  'Reality Model v2 stable branch-policy registry. Rows are system governed; roots inside a branch remain user-extensible.';

comment on column public.value_object_branch_types.branch_type_code is
  'Stable branch policy code. This is not the title or identifier of a root Value Object.';

insert into public.value_object_branch_types (
  branch_type_code,
  title_key,
  description_key,
  display_order,
  status
)
values
  (
    'external_capital',
    'valueObject.branch.externalCapital.title',
    'valueObject.branch.externalCapital.description',
    10,
    'active'
  ),
  (
    'internal_capability',
    'valueObject.branch.internalCapability.title',
    'valueObject.branch.internalCapability.description',
    20,
    'active'
  ),
  (
    'resource',
    'valueObject.branch.resource.title',
    'valueObject.branch.resource.description',
    30,
    'active'
  ),
  (
    'biological_system',
    'valueObject.branch.biologicalSystem.title',
    'valueObject.branch.biologicalSystem.description',
    40,
    'active'
  ),
  (
    'mediator_hormone',
    'valueObject.branch.mediatorHormone.title',
    'valueObject.branch.mediatorHormone.description',
    50,
    'active'
  )
on conflict (branch_type_code) do update
set
  title_key = excluded.title_key,
  description_key = excluded.description_key,
  display_order = excluded.display_order,
  status = excluded.status,
  updated_at = now();

alter table public.value_object_branch_types enable row level security;

drop policy if exists value_object_branch_types_read_all
  on public.value_object_branch_types;

create policy value_object_branch_types_read_all
  on public.value_object_branch_types
  for select
  to anon, authenticated
  using (true);

revoke insert, update, delete, truncate, references, trigger
  on table public.value_object_branch_types
  from anon, authenticated;

grant select
  on table public.value_object_branch_types
  to anon, authenticated;

grant all
  on table public.value_object_branch_types
  to service_role;

alter table public.value_objects
  add column if not exists object_kind text,
  add column if not exists node_role_code text,
  add column if not exists branch_type_code text,
  add column if not exists root_value_object_id uuid,
  add column if not exists instance_of_value_object_id uuid;

comment on column public.value_objects.object_kind is
  'Reality Model v2 canonical object nature. During transition value_type remains as a legacy mirror for v2 rows.';

comment on column public.value_objects.node_role_code is
  'Reality Model v2 tree role: structural or activity_leaf. Null is temporarily accepted only for new writes from routes awaiting P4-P6 cutover.';

comment on column public.value_objects.branch_type_code is
  'Reality Model v2 stable branch policy. Children must inherit the parent and root branch.';

comment on column public.value_objects.root_value_object_id is
  'Reality Model v2 canonical root. A root points to itself; descendants inherit the root from their parent.';

comment on column public.value_objects.parent_value_object_id is
  'Canonical part_of edge only. It is independent from instance_of_value_object_id.';

comment on column public.value_objects.instance_of_value_object_id is
  'Optional type/model edge. It is independent from parent_value_object_id and is not used to build the tree.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.value_objects'::regclass
      and conname = 'value_objects_object_kind_v2_check'
  ) then
    alter table public.value_objects
      add constraint value_objects_object_kind_v2_check
      check (
        object_kind is null
        or object_kind in (
          'asset',
          'person',
          'relationship',
          'skill',
          'knowledge',
          'project',
          'content',
          'product_type',
          'service_type',
          'instance',
          'right',
          'resource',
          'state',
          'symptom',
          'risk',
          'goal',
          'process',
          'reputation',
          'lifestyle',
          'activity_pattern',
          'other'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.value_objects'::regclass
      and conname = 'value_objects_node_role_code_v2_check'
  ) then
    alter table public.value_objects
      add constraint value_objects_node_role_code_v2_check
      check (
        node_role_code is null
        or node_role_code in ('structural', 'activity_leaf')
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.value_objects'::regclass
      and conname = 'value_objects_tree_v2_complete_check'
  ) then
    alter table public.value_objects
      add constraint value_objects_tree_v2_complete_check
      check (
        (
          object_kind is null
          and node_role_code is null
          and branch_type_code is null
          and root_value_object_id is null
          and instance_of_value_object_id is null
        )
        or
        (
          object_kind is not null
          and node_role_code is not null
          and branch_type_code is not null
          and root_value_object_id is not null
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.value_objects'::regclass
      and conname = 'value_objects_value_type_object_kind_lock_v2_check'
  ) then
    alter table public.value_objects
      add constraint value_objects_value_type_object_kind_lock_v2_check
      check (object_kind is null or value_type = object_kind);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.value_objects'::regclass
      and conname = 'value_objects_activity_leaf_shape_v2_check'
  ) then
    alter table public.value_objects
      add constraint value_objects_activity_leaf_shape_v2_check
      check (
        node_role_code is distinct from 'activity_leaf'
        or (
          object_kind = 'activity_pattern'
          and parent_value_object_id is not null
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.value_objects'::regclass
      and conname = 'value_objects_root_shape_v2_check'
  ) then
    alter table public.value_objects
      add constraint value_objects_root_shape_v2_check
      check (
        node_role_code is null
        or (
          parent_value_object_id is null
          and node_role_code = 'structural'
          and root_value_object_id = id
        )
        or (
          parent_value_object_id is not null
          and root_value_object_id <> id
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.value_objects'::regclass
      and conname = 'value_objects_instance_not_self_v2_check'
  ) then
    alter table public.value_objects
      add constraint value_objects_instance_not_self_v2_check
      check (
        instance_of_value_object_id is null
        or instance_of_value_object_id <> id
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.value_objects'::regclass
      and conname = 'value_objects_parent_instance_distinct_v2_check'
  ) then
    alter table public.value_objects
      add constraint value_objects_parent_instance_distinct_v2_check
      check (
        parent_value_object_id is null
        or instance_of_value_object_id is null
        or parent_value_object_id <> instance_of_value_object_id
      );
  end if;
end;
$$;

alter table public.value_objects
  drop constraint if exists value_objects_parent_value_object_id_fkey;

alter table public.value_objects
  add constraint value_objects_parent_value_object_id_fkey
  foreign key (parent_value_object_id)
  references public.value_objects(id)
  on delete restrict;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.value_objects'::regclass
      and conname = 'value_objects_branch_type_code_v2_fkey'
  ) then
    alter table public.value_objects
      add constraint value_objects_branch_type_code_v2_fkey
      foreign key (branch_type_code)
      references public.value_object_branch_types(branch_type_code)
      on update restrict
      on delete restrict;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.value_objects'::regclass
      and conname = 'value_objects_root_value_object_id_v2_fkey'
  ) then
    alter table public.value_objects
      add constraint value_objects_root_value_object_id_v2_fkey
      foreign key (root_value_object_id)
      references public.value_objects(id)
      on update restrict
      on delete restrict;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.value_objects'::regclass
      and conname = 'value_objects_instance_of_value_object_id_v2_fkey'
  ) then
    alter table public.value_objects
      add constraint value_objects_instance_of_value_object_id_v2_fkey
      foreign key (instance_of_value_object_id)
      references public.value_objects(id)
      on update restrict
      on delete set null;
  end if;
end;
$$;

create index if not exists idx_value_objects_object_kind_v2
  on public.value_objects(object_kind)
  where object_kind is not null;

create index if not exists idx_value_objects_node_role_code_v2
  on public.value_objects(node_role_code)
  where node_role_code is not null;

create index if not exists idx_value_objects_branch_type_code_v2
  on public.value_objects(branch_type_code)
  where branch_type_code is not null;

create index if not exists idx_value_objects_root_value_object_id_v2
  on public.value_objects(root_value_object_id)
  where root_value_object_id is not null;

create index if not exists idx_value_objects_instance_of_value_object_id_v2
  on public.value_objects(instance_of_value_object_id)
  where instance_of_value_object_id is not null;

create or replace function public.enforce_value_object_tree_v2()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $function$
declare
  v_tree_requested boolean;
  v_parent record;
  v_root record;
  v_cycle_found boolean;
  v_has_children boolean;
begin
  v_tree_requested :=
    new.object_kind is not null
    or new.node_role_code is not null
    or new.branch_type_code is not null
    or new.root_value_object_id is not null
    or new.instance_of_value_object_id is not null;

  if not v_tree_requested then
    if tg_op = 'UPDATE' then
      if (
         old.object_kind is not null
         or old.node_role_code is not null
         or old.branch_type_code is not null
         or old.root_value_object_id is not null
         or old.instance_of_value_object_id is not null
      ) then
        raise exception using
          errcode = '23514',
          message = 'VALUE_OBJECT_TREE_V2_IDENTITY_CANNOT_BE_CLEARED';
      end if;
    end if;

    return new;
  end if;

  if new.id is null then
    new.id := gen_random_uuid();
  end if;

  if new.object_kind is null
     or new.node_role_code is null
     or new.branch_type_code is null then
    raise exception using
      errcode = '23514',
      message = 'VALUE_OBJECT_TREE_V2_IDENTITY_INCOMPLETE';
  end if;

  new.value_type := new.object_kind;

  if new.node_role_code = 'activity_leaf'
     and new.object_kind <> 'activity_pattern' then
    raise exception using
      errcode = '23514',
      message = 'VALUE_OBJECT_TREE_V2_LEAF_KIND_INVALID';
  end if;

  if new.instance_of_value_object_id = new.id then
    raise exception using
      errcode = '23514',
      message = 'VALUE_OBJECT_TREE_V2_INSTANCE_CANNOT_REFERENCE_SELF';
  end if;

  if new.parent_value_object_id is null then
    if new.node_role_code <> 'structural' then
      raise exception using
        errcode = '23514',
        message = 'VALUE_OBJECT_TREE_V2_ROOT_MUST_BE_STRUCTURAL';
    end if;

    if new.root_value_object_id is null then
      new.root_value_object_id := new.id;
    elsif new.root_value_object_id <> new.id then
      raise exception using
        errcode = '23514',
        message = 'VALUE_OBJECT_TREE_V2_ROOT_MUST_REFERENCE_SELF';
    end if;
  else
    if new.parent_value_object_id = new.id then
      raise exception using
        errcode = '23514',
        message = 'VALUE_OBJECT_TREE_V2_PARENT_CANNOT_REFERENCE_SELF';
    end if;

    select
      parent.id,
      parent.node_role_code,
      parent.branch_type_code,
      parent.root_value_object_id
    into v_parent
    from public.value_objects parent
    where parent.id = new.parent_value_object_id;

    if not found then
      raise exception using
        errcode = '23503',
        message = 'VALUE_OBJECT_TREE_V2_PARENT_NOT_FOUND';
    end if;

    if v_parent.node_role_code <> 'structural'
       or v_parent.branch_type_code is null
       or v_parent.root_value_object_id is null then
      raise exception using
        errcode = '23514',
        message = 'VALUE_OBJECT_TREE_V2_PARENT_MUST_BE_V2_STRUCTURAL';
    end if;

    if new.branch_type_code <> v_parent.branch_type_code then
      raise exception using
        errcode = '23514',
        message = 'VALUE_OBJECT_TREE_V2_BRANCH_MISMATCH';
    end if;

    if new.root_value_object_id is null then
      new.root_value_object_id := v_parent.root_value_object_id;
    elsif new.root_value_object_id <> v_parent.root_value_object_id then
      raise exception using
        errcode = '23514',
        message = 'VALUE_OBJECT_TREE_V2_ROOT_MISMATCH';
    end if;

    with recursive ancestors as (
      select
        candidate.id,
        candidate.parent_value_object_id
      from public.value_objects candidate
      where candidate.id = new.parent_value_object_id

      union

      select
        candidate.id,
        candidate.parent_value_object_id
      from public.value_objects candidate
      join ancestors previous
        on candidate.id = previous.parent_value_object_id
    )
    select exists (
      select 1
      from ancestors
      where id = new.id
    )
    into v_cycle_found;

    if v_cycle_found then
      raise exception using
        errcode = '23514',
        message = 'VALUE_OBJECT_TREE_V2_CYCLE_FORBIDDEN';
    end if;
  end if;

  if new.root_value_object_id <> new.id then
    select
      root.id,
      root.node_role_code,
      root.branch_type_code,
      root.root_value_object_id,
      root.parent_value_object_id
    into v_root
    from public.value_objects root
    where root.id = new.root_value_object_id;

    if not found
       or v_root.node_role_code <> 'structural'
       or v_root.parent_value_object_id is not null
       or v_root.root_value_object_id <> v_root.id
       or v_root.branch_type_code <> new.branch_type_code then
      raise exception using
        errcode = '23514',
        message = 'VALUE_OBJECT_TREE_V2_ROOT_INVALID';
    end if;
  end if;

  select exists (
    select 1
    from public.value_objects child
    where child.parent_value_object_id = new.id
      and child.id <> new.id
  )
  into v_has_children;

  if new.node_role_code = 'activity_leaf' and v_has_children then
    raise exception using
      errcode = '23514',
      message = 'VALUE_OBJECT_TREE_V2_LEAF_CANNOT_HAVE_CHILDREN';
  end if;

  if tg_op = 'UPDATE' then
    if v_has_children
       and (
         new.parent_value_object_id is distinct from old.parent_value_object_id
         or new.branch_type_code is distinct from old.branch_type_code
         or new.root_value_object_id is distinct from old.root_value_object_id
       ) then
      raise exception using
        errcode = '23514',
        message = 'VALUE_OBJECT_TREE_V2_SUBTREE_MOVE_REQUIRES_CONTROLLED_FLOW';
    end if;
  end if;

  return new;
end;
$function$;

comment on function public.enforce_value_object_tree_v2() is
  'Enforces Reality Model v2 tree identity while temporarily allowing legacy-shaped writes during the controlled P4-P6 route transition.';

drop trigger if exists value_objects_tree_v2_enforce_trg
  on public.value_objects;

create trigger value_objects_tree_v2_enforce_trg
before insert or update of
  id,
  value_type,
  object_kind,
  node_role_code,
  branch_type_code,
  root_value_object_id,
  parent_value_object_id,
  instance_of_value_object_id
on public.value_objects
for each row
execute function public.enforce_value_object_tree_v2();

revoke execute
  on function public.enforce_value_object_tree_v2()
  from public, anon, authenticated;

grant execute
  on function public.enforce_value_object_tree_v2()
  to service_role;

commit;
