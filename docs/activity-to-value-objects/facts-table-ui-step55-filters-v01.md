# GPT-APP / AI-NAVIGATOR — Step 55 / 76: Activity Facts user-facing filters

Дата: 2026-06-17
Блок: `ACTIVITY_FACTS_FILTERS_STEP55`
Фаза генерального плана: 8 / 12
Микрошаг: 55 / 76

## Route

`/activity-facts`

## Read API

`GET /api/activity/facts`

## Цель Step 55

Улучшить пользовательские фильтры таблицы Activity Facts без изменения backend/API.

## Step 55A audit result

Audit confirmed that the Step 53 read API already supports these filters:

- `limit`
- `semanticObjectKey`
- `valueObjectId`
- `activityEventId`
- `factStatus`

Audit also confirmed that the Step 54 UI did not yet have:

- Apply filters button;
- Clear filters button;
- active filters summary;
- user-facing status select.

## Step 55B patch

Patched file:

- `src/components/workspace/activity-facts/activity-facts-table.tsx`

New documentation file:

- `docs/activity-to-value-objects/facts-table-ui-step55-filters-v01.md`

## User-facing filter contract

Step 55B keeps the same API filters but changes the UI behavior:

- editing filter inputs does not fetch on every keypress;
- user explicitly clicks `Применить фильтры`;
- user can click `Сбросить`;
- `factStatus` is a select with stable starting options;
- active filters are shown as badges;
- current request URL remains visible;
- sideEffects markers remain visible.

## Safety

Step 55B does not include:

- backend route changes;
- DB writes;
- SQL execution;
- OpenAI calls;
- correction actions;
- commit;
- push.

## Deferred to later steps

- Step 56: correction actions.
- Step 57: links to Activity Event and Value Object pages.
- Later improvement: URL state sync can be added if needed after the basic filters are stable.
