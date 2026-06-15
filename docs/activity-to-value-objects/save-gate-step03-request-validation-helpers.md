# GPT-APP / AI-NAVIGATOR
# ACTIVITY_FACTS_SAVE_GATE_CONTROLLED_IMPLEMENTATION
# Step 03 / 12 — Save Gate Request Validation Helpers

Status: validation helper created and route wired to it.
Date: 2026-06-15
Mode: no DB writes, no SQL, no external AI calls, no commit/push.

## Files

- `src/lib/activity/facts/saveGate/requestValidation.ts`
- `src/app/api/activity/facts/save-gate/route.ts`

## Purpose

Step 03 moves request validation out of the route into a dedicated helper.

The helper validates:

- `routeMode`;
- `sourcePackageId`;
- `idempotencyKey`;
- `factDecisions`;
- `editedFactDecisions`;
- `valueObjectCandidateDecisions`;
- `clientSafetyConfirmation`;
- write-intent detection.

## Route behavior after Step 03

The route remains no-write.

Expected behavior:

- `GET` returns the contract preview.
- `POST` invalid JSON returns `400`.
- `POST` invalid body returns `400`.
- `POST` preview request returns `200`.
- `POST` explicit write-intent returns `409`.

## Safety lock

Still forbidden:

- no Supabase import;
- no `.from()` / `.select()` runtime calls;
- no `.insert()` / `.upsert()` / `.update()` / `.delete()`;
- no SQL execution;
- no external AI calls;
- no actual Value Object creation;
- no actual `activity_events` creation;
- no actual `activity_event_measures` creation;
- no actual `activity_object_facts` creation;
- no actual `activity_fact_review_items` creation;
- no actual `activity_fact_recalculation_queue` creation.

## Next step

Step 04 / 12 should run expanded route smoke checks:

- GET 200;
- valid preview POST 200;
- explicit write-intent POST 409;
- invalid JSON POST 400;
- invalid body POST 400;
- no-write flags preserved in every response.
