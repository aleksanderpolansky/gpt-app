# Ownership Context Patch Plan - Activity Facts Save Gate

General Plan: Phase 7 / 12 - Guarded Activity Facts save flow
General microstep: Step 47 / 76 - Ownership and RLS checks
Technical block: ACTIVITY_FACTS_SAVE_GATE_OWNERSHIP_RLS
Patch plan version: v01
Status: planning only, no-write, no-execution

## 1. Purpose

This plan defines the next no-write patch for the Activity Facts save gate.

The patch should expose an ownershipContext object in the save-gate preview response.
This object will make the ownership/RLS contract visible in API and UI before any real persistence is enabled.

The patch must not perform writes.

## 2. Core safety rule

- no direct browser Supabase write
- shared/system Value Object reference does not make a fact public
- confirm_save remains blocked
- ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED remains the blocking code
- No SQL execution
- No OpenAI
- No DB writes
- No commit
- No push

## 3. Target behavior after patch

GET /api/activity/facts/save-gate:
- returns preview response
- productionWriteEnabled remains false
- no DB write
- includes ownershipContext

POST /api/activity/facts/save-gate with preview mode:
- returns preview response
- futurePersistenceMode = preview
- no DB write
- includes ownershipContext

POST /api/activity/facts/save-gate with futurePersistenceMode = confirm_save:
- remains blocked
- returns ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED
- no DB write
- includes or preserves the ownership safety contract

## 4. Proposed ownershipContext shape

Type name: ActivityFactsSaveGateOwnershipContext

Required fields:
- mode: no_write_preview
- serverDerivedOwnership: true
- userIdSource: future_authenticated_server_context
- actorIdSource: future_authenticated_actor_mapping
- ownerActorIdSource: future_authenticated_actor_mapping
- organizationIdSource: not_used_for_personal_activity_facts
- clientOwnershipFieldsTrusted: false
- directBrowserSupabaseWriteAllowed: false
- sharedOrSystemValueObjectReferenceMakesFactPublic: false
- factRowsRemainPrivateUserOwned: true
- rlsPosture: service_mediated_write_required
- serviceRoleWriteRequired: true
- authUidMappingMustBeProvenBeforeDirectAuthenticatedAccess: true
- confirmSaveEnabled: false
- confirmSaveBlockedBy: ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED

Required exact vocabulary markers:
- ownershipContext
- serverDerivedOwnership
- user_id
- actor_id
- owner_actor_id
- service_role
- RLS
- no direct browser Supabase write
- shared/system Value Object reference does not make a fact public

## 5. Source patch targets

New helper file:
src/lib/activity/facts/saveGate/ownershipContext.ts

Purpose:
- define the ownership context type
- export a deterministic no-write builder
- avoid Supabase imports
- avoid OpenAI imports
- avoid DB access
- avoid SQL execution

Expected function name:
buildNoWriteOwnershipContext

Route target file:
src/app/api/activity/facts/save-gate/route.ts

Route patch:
- import buildNoWriteOwnershipContext
- add ownershipContext to the response
- keep productionWriteEnabled: false
- keep confirmSaveEnabled: false
- keep ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED

UI target file:
src/components/activity-to-value-objects/save-gate-plan-preview.tsx

UI patch:
- extend response type with ownershipContext
- render ownershipContext.mode
- render serverDerivedOwnership
- render directBrowserSupabaseWriteAllowed
- render factRowsRemainPrivateUserOwned
- render confirmSaveBlockedBy

Existing contract document:
docs/activity-to-value-objects/facts-save-gate-ownership-rls-contract-v01.md

Do not rewrite the contract document during the code patch unless a marker is missing.

## 6. What must not be added

The next patch must not add:
- Supabase client import
- service role secret access
- insert/upsert/update/delete execution
- RPC execution
- SQL execution
- OpenAI call
- real authenticated-user lookup
- real actor lookup
- real persistence transaction

The patch is still no-write.

## 7. Why no real auth lookup yet

At this stage, Step 47 is ownership/RLS checking and contract exposure.
The next safe milestone is to expose the required ownership contract, not to start writing or trusting new auth paths too early.

## 8. RLS implications

The patch should clearly communicate:
- RLS is required before real writes.
- service_role write path is expected for MVP server-mediated persistence.
- direct authenticated table access must not be enabled unless auth.uid to application user_id mapping is proven.
- anon must not access private facts.
- authenticated must not directly write private facts unless policies are proven safe.
- service_role should be used only in server-side routes.

## 9. Acceptance criteria for next no-write patch

The next patch can be accepted only if:
1. source compiles/lints
2. ownershipContext appears in API response
3. UI displays ownership context
4. confirm_save still returns/contains ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED
5. productionWriteEnabled remains false
6. no DB writes
7. no SQL execution
8. no OpenAI call
9. no direct browser Supabase write
10. no unreviewed source files included
11. local smoke confirms GET preview, POST preview, POST confirm_save block

## 10. Current conclusion

The next implementation should be a no-write ownership context exposure patch.
It should make the server-derived ownership and RLS rules visible without enabling persistence.
