# GPT-APP / AI-NAVIGATOR — Step 57 / 76: Activity Facts links to Activity Event and Value Object pages

Дата: 2026-06-17
Блок: `ACTIVITY_FACTS_LINKS_STEP57`
Фаза генерального плана: 8 / 12
Микрошаг: 57 / 76

## Route

`/activity-facts`

## Цель Step 57

Добавить безопасные ссылки из Activity Facts table к связанным Activity Event и Value Object страницам.

## Step 57A audit result

Audit confirmed:

- Activity Facts table already has rows with `activityEventId` and `valueObjectId`.
- Component did not yet use `next/link`.
- Existing direct route `/activities/[id]` was not present.
- Existing route `/activity-today` was present.
- Existing route `/value-objects/[id]` was present.
- Read API already returns `activityEventId` and `valueObjectId`.
- No backend/API patch is required for this step.

## Step 57B patch

Patched file:

- `src/components/workspace/activity-facts/activity-facts-table.tsx`

New documentation file:

- `docs/activity-to-value-objects/facts-links-step57-v01.md`

## Link contract

Activity link:

- source field: `activityEventId`;
- target route: `/activity-today?activityEventId={activityEventId}`;
- fallback: compact text ID when `activityEventId` is null.

Value Object link:

- source field: `valueObjectId`;
- target route: `/value-objects/{valueObjectId}`;
- fallback: compact text ID when `valueObjectId` is null.

## UI contract

Step 57B adds:

- `Link` import from `next/link`;
- link helpers for Activity Event and Value Object targets;
- linked activity_id and VO cells in the table;
- linked Activity Event and Value Object IDs in the selected fact preview panel;
- no changes to filters;
- no changes to correction-ready no-write UI.

## Safety

Step 57B does not include:

- backend/API patch;
- DB writes;
- SQL execution;
- OpenAI calls;
- correction persistence;
- commit;
- push.
