# GPT-APP / AI-NAVIGATOR
# Activity Facts Save Gate - Contract Patch Plan v0.1

Date: 2026-06-16
General plan phase: 7 / 12 - Guarded Activity Facts save flow
General microstep: Step 46 / 76 - Create server-mediated save route
Current technical block: ACTIVITY_FACTS_SAVE_GATE_CONTRACT_PATCH
Block step: 02 / 06
Status: planning only; no runtime code modified by this step

## 1. Purpose

This document defines the minimal no-write contract patch for the existing Activity Facts Save Gate route.

The goal is not to enable persistence yet.
The goal is to make the route contract clearer before future server-mediated persistence work.

## 2. Current baseline from source audit

Current source audit confirmed:

1. HEAD is aad450a Document activity facts save gate persistence design.
2. origin/main is synced with local HEAD.
3. The save-gate route already exists.
4. The route already blocks write intent with ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED.
5. requestValidation.ts already has routeMode validation.
6. Existing route modes are contract_preview_only and future_server_mediated_write.
7. idempotencyKey is already validated.
8. executionPlan.ts already builds plannedWrites and noWriteExecutionPlan.
9. The preview UI already has GET_PREVIEW, POST_PREVIEW and POST_WRITE_INTENT.
10. Forbidden executable write / AI / SQL scan found zero hits.

## 3. Why patch is still needed

The General Plan wants a controlled flow: preview -> review -> save.

The current implementation is safe, but naming is still transitional:

1. routeMode uses contract_preview_only and future_server_mediated_write.
2. the design contract uses preview and confirm_save as the clearer future API language.
3. the UI uses POST_WRITE_INTENT instead of a final confirm_save wording.
4. the route already blocks write intent, but the response can expose a clearer futurePersistenceMode field.

## 4. Minimal patch scope

The patch should be no-write and should not introduce Supabase, SQL, OpenAI, DB writes, or real persistence.

Allowed code changes:

1. Add a normalized futurePersistenceMode field derived from routeMode.
2. Keep existing routeMode values for backward compatibility.
3. Add explicit strings preview and confirm_save only as contract vocabulary.
4. Add response metadata explaining that confirm_save is currently blocked.
5. Optionally rename UI label from POST write-intent to POST confirm_save intent, without changing route behavior.
6. Keep ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED as the blocking error.

Not allowed in this patch:

1. no Supabase client import;
2. no createClient;
3. no .from / .insert / .update / .upsert / .delete / .rpc;
4. no SQL files;
5. no service_role;
6. no OpenAI call;
7. no activity event insert;
8. no activity_object_facts insert;
9. no Value Object creation;
10. no recalculation queue insert.

## 5. Proposed contract naming

Keep current routeMode:

1. contract_preview_only
2. future_server_mediated_write

Add normalized futurePersistenceMode:

1. preview
2. confirm_save

Mapping:

| routeMode | futurePersistenceMode | Current behavior |
|---|---|---|
| contract_preview_only | preview | allowed, no write |
| future_server_mediated_write | confirm_save | blocked with ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED |

## 6. Proposed files to patch later

Likely minimal code patch files:

1. src/lib/activity/facts/saveGate/requestValidation.ts
2. src/app/api/activity/facts/save-gate/route.ts
3. src/components/activity-to-value-objects/save-gate-plan-preview.tsx

Likely no change needed:

1. src/lib/activity/facts/saveGate/executionPlan.ts
2. src/app/activity-capture/save-gate-plan-preview/page.tsx

## 7. Acceptance criteria for the later code patch

The later code patch is accepted only if:

1. targeted ESLint passes for touched files;
2. forbidden executable write / AI / SQL scan returns zero hits;
3. GET preview still returns 200;
4. POST preview still returns 200;
5. POST confirm_save intent still returns 409 with ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED;
6. response exposes futurePersistenceMode;
7. route still reports productionWriteEnabled=false;
8. no DB rows are written;
9. no SQL is executed;
10. no external AI call is executed.

## 8. Next step

Step 03 / 06 should apply the minimal no-write contract patch.

It should modify only the smallest required source files.

It must not commit or push.

It must produce a report with:

1. changed files;
2. targeted ESLint result;
3. forbidden pattern scan;
4. local GET/POST smoke test if possible;
5. git diff summary;
6. confirmation that confirm_save is still blocked.

## Safety marker addendum

- No SQL execution is allowed in this no-write contract patch.
- No OpenAI or external AI provider call is allowed in this no-write contract patch.
