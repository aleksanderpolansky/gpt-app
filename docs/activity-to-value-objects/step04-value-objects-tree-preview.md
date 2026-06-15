# GPT-APP / AI-NAVIGATOR
# ACTIVITY_TO_VALUE_OBJECTS_CONTROLLED_FLOW
# Step 04 / 12 — Read-only Value Objects Tree Preview

Status: implemented as read-only fixture UI page.
Date: 2026-06-15
Mode: no DB writes, no SQL, no OpenAI calls, no commit/push.

## Route

`/value-objects/tree-preview`

## Purpose

This page shows the target Value Objects tree structure before implementing real matching and write gates.

It includes:

1. `Организм`;
2. `Семья`;
3. `Интеллектуальная деятельность`;
4. `Работа и бизнес`;
5. `Отдых и восстановление`;
6. `Социальные связи`;
7. `Финансы`;
8. activity-derived candidates from “Играл с ребёнком в футбол 30 минут”.

## Important decision

The physiology tree is only one system branch, not the entire Value Objects tree.

The platform needs multiple branches:

- organism / physiology;
- family;
- intellectual activity;
- work and business;
- rest and recovery;
- social connections;
- finance;
- later other systems.

## Source-of-truth rule

In fixture preview, the tree is built from local nodes.

In real DB/runtime, the source of truth must be:

`value_objects.parent_value_object_id`

Do not store children as a separate `child_ids` array.

## Safety lock

This page must remain read-only in Step 04:

- no DB writes;
- no SQL;
- no OpenAI calls;
- no hidden persistence;
- no automatic Value Object creation;
- no system seed import;
- no medical diagnosis.

## Files created

- `src/types/value-object-tree-preview.ts`
- `src/data/activity-to-value-objects/value-object-tree-preview.ts`
- `src/components/activity-to-value-objects/value-object-tree-preview.tsx`
- `src/app/value-objects/tree-preview/page.tsx`

## Next step

Step 05 / 12 should connect both preview pages conceptually:

- Activity Facts Preview shows future facts.
- Value Objects Tree Preview shows where matched/existing/candidate VO nodes live.
- Next useful step: add a combined read-only control page or add cross-links/summary explaining how fact previews map to the tree.
