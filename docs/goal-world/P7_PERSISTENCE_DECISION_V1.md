# ARCTor.app — P7 Persistence Decision v1

Stage: P7
Decision date: 2026-08-11

## Evidence used

The read-only local/source preflight and the live Supabase metadata preflight
showed:

- no existing `goal_world*`, `goal_definition*` or equivalent goal-persistence
  tables in `public`;
- `public.actors` exists, uses UUID identity, and has RLS enabled;
- `public.value_objects` exists, uses UUID identity, has RLS enabled, and is the
  shared Reality Graph object store;
- the project already uses `owner_actor_id -> actors(id)` as the canonical
  actor-owner pattern in many new private tables;
- version/history tables in the current project are normally append-only /
  immutable;
- new sensitive/private runtime tables normally enable RLS, revoke direct
  `anon`/`authenticated` access, and expose only deliberately granted
  `service_role` privileges.

## P7 reuse / create decision

### Reuse

P7 reuses:

- `public.actors` as the owner identity;
- `public.value_objects` as the shared Reality Graph objects referenced by a
  Goal World.

P7 does **not** add Goal World columns to `value_objects`.

A Goal World is a projection over Reality Graph objects, not another kind of
Value Object.

### Create

P7 creates eight dedicated persistence tables:

1. `goal_worlds`
2. `goal_world_goal_statements`
3. `goal_world_goal_definitions`
4. `goal_world_revisions`
5. `goal_world_objectives`
6. `goal_world_object_memberships`
7. `goal_world_target_criteria`
8. `goal_world_goal_hypotheses`

## Why eight tables instead of one JSON blob

The model must enforce independently:

- stable Goal World identity;
- immutable intention revisions;
- exact source statements;
- normalized Goal Definition provenance;
- exactly one actor-declared terminal objective per revision;
- arbitrary-depth intermediate/supporting objectives;
- references to shared Value Objects;
- world-specific target criteria;
- proposal-only hidden/alternative-goal hypotheses.

Putting all of that into one mutable JSON column would make database guards,
version history and referential integrity materially weaker.

## Write boundary in this substep

This P7 persistence foundation intentionally creates **no public runtime write
API yet**.

All eight tables are private:

- RLS enabled;
- no direct `anon` / `authenticated` access;
- `service_role` receives SELECT only;
- immutable revision/history tables reject UPDATE and DELETE even for privileged
  writers.

The first database acceptance fixture will be executed manually inside a
transaction and rolled back.

A later controlled P7 write contract may append a world/revision only after the
server has resolved the trusted active actor. This avoids inventing an
authentication shortcut inside the database.

## Important semantic locks

- One revision has exactly one terminal objective.
- The terminal objective must be actor-declared.
- Intermediate/supporting objectives can form deeper trees.
- A target change such as 100 kg -> 95 kg is another revision of the same world.
- New observations in Reality Graph do not by themselves create a Goal World
  revision.
- Desired target criteria never overwrite current Reality.
- `primary_target_value_object_id` is a routing anchor, not a claim that only
  one object matters causally.
- hidden/alternative goal interpretations remain `proposal_only`.
