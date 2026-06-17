# GPT-APP / AI-NAVIGATOR — Step 56 / 76: Activity Facts correction-ready UI

Дата: 2026-06-17
Блок: `ACTIVITY_FACTS_CORRECTION_UI_STEP56`
Фаза генерального плана: 8 / 12
Микрошаг: 56 / 76

## Route

`/activity-facts`

## Цель Step 56

Подготовить Activity Facts table к будущим correction actions, не включая пока write/mutation route.

## Step 56A audit result

Audit confirmed:

- Activity Facts table already renders rows.
- Correction UI was not present yet.
- Read API is still GET-only.
- Existing activity event correction mechanisms exist elsewhere, but Activity Facts correction contract must not be mixed with them without a separate write gate.
- Step 55 documentation explicitly deferred correction actions to Step 56.

## Step 56B patch

Patched file:

- `src/components/workspace/activity-facts/activity-facts-table.tsx`

New documentation file:

- `docs/activity-to-value-objects/facts-correction-ui-step56-v01.md`

## UI contract

Step 56B adds correction-ready UI only:

- selected fact preview panel;
- actions/status column;
- no-write preview actions:
  - `Подтвердить` → intended `confirmed`;
  - `Отклонить` → intended `rejected`;
  - `Исправить` → intended `pending_review`;
  - `Supersede` → intended `superseded`;
- visible no-write payload preview;
- status transition hints;
- unchanged GET-only table read behavior;
- visible sideEffects markers.

## Safety

Step 56B does not include:

- backend mutation route;
- DB writes;
- SQL execution;
- OpenAI calls;
- correction persistence;
- commit;
- push.

## Deferred

The future write contract must be designed separately before any real fact correction can be persisted. It must define ownership, allowed status transitions, audit rows, idempotency, and rollback behavior for Activity Facts.
