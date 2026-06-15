# GPT-APP / AI-NAVIGATOR
# ACTIVITY_TO_VALUE_OBJECTS_CONTROLLED_FLOW
# Step 03 / 12 — Read-only Activity Facts Preview UI

Status: implemented as read-only UI page.
Date: 2026-06-15
Mode: no DB writes, no SQL, no OpenAI calls, no commit/push.

## Route

`/activity-capture/facts-preview`

## Purpose

This page renders the deterministic Step 02 fixture and proves the target process:

1. free-text activity input;
2. activity recognition;
3. extracted measures;
4. semantic category candidates;
5. Value Object matching;
6. missing Value Object candidates;
7. future `activity_object_facts` preview rows;
8. safety/no-write boundary.

## Files created

- `src/components/activity-to-value-objects/activity-facts-preview.tsx`
- `src/app/activity-capture/facts-preview/page.tsx`

## Safety lock

This page must remain read-only in Step 03:

- no DB writes;
- no SQL;
- no OpenAI calls;
- no hidden persistence;
- no automatic Value Object creation;
- no medical diagnosis;
- no duplicate chronological time.

## Next step

Step 04 / 12 should add a read-only Value Objects Tree preview.

Recommended target:

- route: `/value-objects/tree-preview`
- source: fixture first, not DB write
- must show parent-child structure and support future physiology/system branches
- should not import/create system Value Objects yet
