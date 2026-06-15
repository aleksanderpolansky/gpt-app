# GPT-APP / AI-NAVIGATOR
# ACTIVITY_TO_VALUE_OBJECTS_CONTROLLED_FLOW
# Step 07 / 12 — Save Gate Contract

Status: implemented as TypeScript contract + deterministic request/response fixture.
Date: 2026-06-15
Mode: no DB writes, no SQL, no OpenAI calls, no API route, no commit/push.

## Purpose

Step 07 defines the explicit request/response contract for the future server-mediated save gate.

The future endpoint is planned as:

`/api/activity/facts/save-gate`

The route is intentionally NOT created in Step 07.

## Why a dedicated route

Step 06 found many existing activity/semantic/debug/first-write routes. To avoid mixing stable production save logic with historical/debug routes, the future implementation should use a dedicated stable route.

## Future write sequence

The future save gate should:

1. resolve authenticated user and actor;
2. create or reuse `activity_events`;
3. insert `activity_event_measures`;
4. create confirmed missing Value Objects only after user confirmation;
5. insert `activity_object_facts`;
6. create `activity_fact_review_items`;
7. enqueue `activity_fact_recalculation_queue`;
8. return saved IDs to UI.

## Files created

- `src/types/activity-facts-save-gate.ts`
- `src/data/activity-to-value-objects/save-gate-contract-preview.ts`

## Safety lock

- no DB writes;
- no SQL execution;
- no OpenAI calls;
- no API route created;
- no hidden persistence;
- no automatic Value Object creation.

## Next step

Step 08 / 12 should create a read-only UI page for this save-gate contract:

Recommended route:

`/activity-capture/save-gate-preview`

It should show:

- request body summary;
- user decisions;
- planned writes by table;
- skipped/deferred rows;
- no-write safety block.
