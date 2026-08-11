# ARCTor.app — P7 Controlled Goal World API Contract v1

Stage: P7
Version: 1
Date: 2026-08-11

## Purpose

This is the final controlled persistence/read boundary for P7.

P7 already has:

- GOAL_WORLD_CARD v1 source contract;
- eight Goal World persistence tables;
- immutable revision/history guards;
- RLS/private-table boundary;
- structural Supabase acceptance 20/20;
- rollback runtime acceptance 16/16.

This API adds the server-controlled way to:

1. list Goal Worlds for the trusted active actor;
2. read one Goal World persistence projection;
3. create the initial revision of a Goal World;
4. append a new immutable revision to the same Goal World.

It does not compile a goal into a world. P8 owns compilation.

## Trusted actor boundary

The HTTP routes never accept `owner_actor_id` from the request body.

They resolve:

- the Auth0 server session;
- the active ARCTor actor/profile through the existing `resolveActiveActorContext(...)`
  project boundary.

Only that trusted actor id is sent to the database RPC.

The client may supply a Goal World id in the route URL, but ownership is always
rechecked server-side/database-side.

## Database write boundary

The eight P7 tables remain:

- RLS enabled;
- unavailable directly to `anon` and `authenticated`;
- SELECT-only for `service_role`.

Writes occur only through two SECURITY DEFINER RPCs:

- `create_goal_world_v1(uuid,jsonb)`;
- `revise_goal_world_v1(uuid,uuid,integer,jsonb)`.

Both RPCs:

- have locked `search_path=public,pg_temp`;
- are executable only by `service_role`;
- enforce actor ownership;
- reuse `public.value_objects` references rather than copying them;
- validate revision-chain expectations;
- rely on existing immutable P7 table guards.

## Revision concurrency

A revision request contains `expectedCurrentRevisionNumber`.

If another revision has already advanced the world, the write is rejected with
`P7_GOAL_WORLD_EXPECTED_REVISION_MISMATCH`.

This prevents two stale clients from silently overwriting one another's intent
history.

## P7 write input

The server accepts a revision draft containing:

- exact `sourceGoalText`;
- normalized `goalDefinitionJson`;
- optional methodology trace;
- completeness percentage;
- optional lifecycle status;
- revision reason for later revisions;
- objectives using temporary client ids;
- object memberships;
- target criteria;
- proposal-only goal hypotheses;
- unknown codes;
- protocol references.

Temporary client ids exist only in the HTTP request. The server replaces them
with fresh UUIDs before calling the database RPC.

## Objective rules

A revision draft must contain exactly one:

- `objectiveRoleCode=terminal`;
- `originCode=actor_declared_terminal`;
- `parentClientId=null`.

Non-terminal objectives require a parent objective in the same revision.

Cycles are rejected before SQL.

Supporting/intermediate depth is unrestricted by a fixed level count.

## Shared Reality Graph references

Goal World payloads may reference Value Objects only by id.

The database RPC verifies that every referenced Value Object is either:

- owned by the active actor; or
- explicitly global (`scope_code='global'`).

The API never modifies the referenced Value Object.

## Stored revision completeness

P7 persistence v2 adds to `goal_world_revisions`:

- `unknown_codes text[]`;
- `protocol_refs_json jsonb`.

This closes the persistence gap between the P7 source card contract and the
database revision record.

## Read projection

The detail API returns a persistence projection assembled from the eight P7
tables.

It deliberately does **not** claim that an empty current Reality state means no
current Reality exists.

The response includes:

`currentRealityProjectionIncluded=false`.

A task-scoped, time-aware current Reality snapshot is assembled separately by
the Reality Context layer. P8+ may combine the persistence projection and the
current Reality projection into a runtime GOAL_WORLD_CARD.

## Routes

### `GET /api/goal-worlds`

Returns the active actor's Goal Worlds, newest first.

### `POST /api/goal-worlds`

Creates a stable Goal World plus revision 1.

Revision reason is forced to `initial_definition`.

### `GET /api/goal-worlds/[id]`

Returns one owned Goal World persistence projection.

### `PATCH /api/goal-worlds/[id]`

Appends the next immutable revision.

The request must provide:

- `expectedCurrentRevisionNumber`;
- a non-initial revision reason.

It never edits an old revision.

## P7/P8 boundary

P7 owns storage, guards, controlled API and read projection.

P8 will own the static Goal World Compiler that turns Goal Intake + Reality
Context into a validated revision draft suitable for this API.
