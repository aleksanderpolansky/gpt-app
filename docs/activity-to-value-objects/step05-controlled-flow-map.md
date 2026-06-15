# GPT-APP / AI-NAVIGATOR
# ACTIVITY_TO_VALUE_OBJECTS_CONTROLLED_FLOW
# Step 05 / 12 — Controlled Flow Map

Status: implemented as read-only fixture UI page.
Date: 2026-06-15
Mode: no DB writes, no SQL, no OpenAI calls, no commit/push.

## Route

`/activity-capture/controlled-flow-map`

## Purpose

This page connects:

- Step 03 Activity Facts Preview: `/activity-capture/facts-preview`
- Step 04 Value Objects Tree Preview: `/value-objects/tree-preview`

It shows how a future `activity_object_facts` row maps to an existing or candidate Value Object in the tree.

## Current example

Input:

`Играл с ребёнком в футбол 30 минут.`

Preview fact rows:

- `family_time` → existing demo node `Семейное время` under `Семья`
- `physical_activity` → existing demo node `Физическая активность` under `Организм`
- `football` → candidate node `Футбол` under `Физическая активность`
- `play_with_child` → candidate node `Игра с ребёнком` under `Семейное время`
- `outdoor_time` → needs confirmation under `Среда / свежий воздух`

## Safety lock

This page remains read-only:

- no DB writes;
- no SQL;
- no OpenAI calls;
- no hidden persistence;
- no automatic Value Object creation;
- no automatic activity_object_facts persistence.

## Important implementation decision

The UI may use the word “steps” for user-facing explanation, but the persisted data model should use facts:

- `activity_event_measures`
- `activity_object_facts`
- `activity_fact_review_items`
- `activity_fact_recalculation_queue`

Do not create a separate persisted `steps` table.

## Next step

Step 06 / 12 should add a no-write runtime preflight for the future save gate:

- inspect existing `/api/activity/*` and `/api/value-objects/*` contracts;
- identify which API route should own future server-mediated writes;
- do not write to DB yet;
- prepare the future server-mediated save plan for Activity Event + Measures + Object Facts + Review Items.
