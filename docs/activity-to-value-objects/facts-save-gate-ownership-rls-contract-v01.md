# Ownership/RLS Contract Plan — Activity Facts Save Gate

General Plan: Phase 7 / 12 — Guarded Activity Facts save flow
General microstep: Step 47 / 76 — Ownership and RLS checks
Technical block: ACTIVITY_FACTS_SAVE_GATE_OWNERSHIP_RLS
Document version: v01
Status: planning contract, no-write, no-execution

## 1. Purpose

This document locks the ownership and RLS contract for the future Activity Facts save gate.

The save gate must eventually persist reviewed activity facts, but only through a server-mediated route. The browser may request a preview or a future confirm_save operation, but the browser must not write directly to Supabase.

Core rule:

> One user activity may create many semantic facts, but every persisted fact row remains private and user-owned.

## 2. Non-negotiable security principles

1. The save route is server-mediated.
2. The browser does not perform direct Supabase writes.
3. The request must not be trusted for ownership fields.
4. The server must derive ownership from the authenticated server context.
5. A shared/system Value Object reference does not make a fact public.
6. Facts linked to shared/system Value Objects remain private user-owned facts.
7. confirm_save remains blocked until the real persistence service is explicitly implemented and tested.
8. RLS and GRANT must be checked before enabling real writes.
9. No SQL execution is part of this planning step.
10. No OpenAI or external AI provider call is part of this planning step.
11. No DB writes are part of this planning step.
12. No commit is part of this planning step.
13. No push is part of this planning step.

Safety markers:

- No SQL execution
- No OpenAI
- No DB writes
- No commit
- No push

## 3. Ownership vocabulary

### user_id

`user_id` is the primary privacy boundary for private fact rows.

Rules:

- The server must derive `user_id` from the authenticated user/session.
- The client must not be allowed to choose another `user_id`.
- For any future write to `activity_object_facts`, `activity_fact_review_items`, or `activity_fact_recalculation_queue`, `user_id` must belong to the authenticated user.
- If `auth.uid()` is used in RLS, its relationship to the application-level `user_id` must be proven in the current schema before enabling direct authenticated role access.

### actor_id

`actor_id` / `performed_by_actor_id` / related actor fields describe who performed, owns, or is represented by an action.

Rules:

- The save gate must derive the person actor from the authenticated user context.
- The client may send reviewed semantic decisions, but must not decide final ownership actor.
- If activity facts store `performed_by_actor_id`, it must be derived from the authenticated user’s valid actor mapping.
- If the platform later supports acting for another person, that requires a separate permission contract.

### owner_actor_id

`owner_actor_id` is already used in Value Object routes and is relevant to personal/private Value Objects.

Rules:

- For facts, privacy is not inherited from Value Object visibility alone.
- If a fact links to a private Value Object, the server must ensure that the current user owns or is allowed to use that Value Object.
- If a fact links to a public/system Value Object, the fact row still remains private through `user_id` / actor ownership.

### organization_id

`organization_id` is not the default for private personal activity facts.

Rules:

- Personal activity facts should normally have `organization_id = null`.
- Commercial or organization-scoped facts require a separate explicit business-context permission check.
- The MVP save gate for personal activity facts should not silently attach facts to an organization.

## 4. Target tables

The future save gate may create or update rows related to:

1. `activity_events`
2. `activity_object_facts`
3. `activity_fact_review_items`
4. `activity_fact_recalculation_queue`

The current contract patch is still no-write. These target tables are discussed as future persistence targets only.

## 5. activity_events ownership contract

`activity_events` remains the chronological source of truth.

Rules:

- A saved event must belong to the authenticated user.
- The server must set user/actor ownership fields.
- The browser must not directly write the event row.
- Idempotency must prevent duplicate event creation for the same reviewed package.
- One chronological activity duration remains one duration even if many semantic facts are derived from it.

## 6. activity_object_facts ownership contract

`activity_object_facts` stores user-owned semantic facts derived from activity events.

Rules:

- Every row must contain a server-derived `user_id`.
- Every row must be linked to the source `activity_event_id` when the event is created.
- `value_object_id` may be nullable.
- `semantic_object_key` must remain stable even when `value_object_id` is missing.
- A row linked to a public/system/shared Value Object remains private.
- The server must verify any private Value Object link belongs to or is usable by the current user.
- The browser must not insert these rows directly.

## 7. activity_fact_review_items ownership contract

`activity_fact_review_items` stores review/audit decisions for proposed facts.

Rules:

- Review rows are private to the user.
- Review rows must be created by the server.
- Review rows must include server-derived ownership.
- Review rows may record client decisions, but not trust client ownership.
- Review rows must preserve auditability of accepted, deferred, skipped, and edited facts.

## 8. activity_fact_recalculation_queue ownership contract

`activity_fact_recalculation_queue` schedules future analytics recalculation.

Rules:

- Queue rows must be private or service-internal.
- Queue rows must be created server-side.
- Queue rows must include `user_id` or a proven ownership link.
- Queue rows must not expose private activity analytics to other users.
- Queue rows may target a Value Object, but the recalculation context must still be user-scoped.

## 9. RLS / GRANT contract

Before enabling real writes, each target table must be verified for:

1. `enable row level security`
2. explicit `GRANT`
3. policy scope for `anon`
4. policy scope for `authenticated`
5. policy scope for `service_role`
6. whether writes are direct-authenticated or service-only
7. whether `auth.uid()` maps correctly to application-level `user_id`
8. whether service-side route checks are sufficient if table grants are service-only

Recommended MVP posture:

- `anon`: no private fact access
- `authenticated`: no direct private fact writes unless policy is proven safe
- `service_role`: server-mediated write path only
- application route: validates authenticated user, derives app user and actor, writes with service context

## 10. Request contract

The save-gate request may contain:

- reviewed processing package
- fact decisions
- edited fact decisions
- Value Object candidate decisions
- idempotency key
- futurePersistenceMode: `preview` or `confirm_save`

The request must not be trusted for:

- `user_id`
- final `actor_id`
- `owner_actor_id`
- `organization_id`
- direct table names
- direct DB ids that are not validated server-side

## 11. confirm_save contract

`confirm_save` remains contract vocabulary only until persistence is implemented.

Current required behavior:

- `preview` may return 200 with planned writes.
- `confirm_save` must remain blocked.
- blocked confirm_save must return the existing safety code:
  `ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED`
- `productionWriteEnabled` remains false.
- no DB writes occur.

Future required behavior before unblocking:

1. authenticated context resolved
2. app user resolved
3. person actor resolved
4. request package validated
5. idempotency checked
6. Value Object references validated
7. event write prepared
8. facts write prepared
9. review rows write prepared
10. recalculation queue write prepared
11. transaction boundary defined
12. RLS/GRANT posture verified
13. rollback/error handling defined
14. runtime smoke and production safety test added

## 12. Implementation implications

The next implementation should not jump directly into writes.

Recommended sequence:

1. inspect exact table columns from migration/source
2. map current authenticated-user helpers
3. map current actor-resolution helpers
4. create a no-write ownership context builder
5. expose ownership context in preview response
6. prove that context derives from server and not from client
7. only after that consider a guarded persistence service

## 13. Acceptance criteria for Step 47

Step 47 can be considered ready to close only when:

- ownership context is documented
- RLS/GRANT posture is documented
- no direct browser write path is introduced
- confirm_save remains blocked
- no SQL execution occurs during planning
- no OpenAI call occurs during planning
- all source changes, if any, are no-write and linted
- local smoke confirms the route still blocks confirm_save

## 14. Hard rule

A shared/system Value Object reference does not make a fact public.

The privacy boundary is the user-owned fact row, not the visibility of the referenced Value Object.

## Exact marker addendum

- no direct browser Supabase write
