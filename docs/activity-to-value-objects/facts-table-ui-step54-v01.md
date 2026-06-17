# GPT-APP / AI-NAVIGATOR — Step 54 / 76: Activity Facts table UI

Дата: 2026-06-17
Блок: `ACTIVITY_FACTS_TABLE_UI_STEP54`
Фаза генерального плана: 8 / 12
Микрошаг: 54 / 76

## Route

`/activity-facts`

## Read API

`GET /api/activity/facts`

## Цель Step 54

Подключить UI-таблицу фактов активности к read-only endpoint, созданному в Step 53.

## Файлы Step 54B

- `src/components/workspace/activity-facts/activity-facts-table.tsx`
- `src/app/activity-facts/page.tsx`
- `docs/activity-to-value-objects/facts-table-ui-step54-v01.md`

## UI contract

Таблица показывает плановые колонки:

- `fact_id`
- `activity_id`
- `VO`
- `semantic_key`
- `measure`
- `status`
- `source`
- `created_at`

## Data contract

Client component делает только:

`GET /api/activity/facts`

Начальные фильтры UI:

- `limit`
- `semanticObjectKey`
- `valueObjectId`
- `activityEventId`
- `factStatus`

## Empty state

Если endpoint возвращает:

`ok: true`, `facts: []`, `count: 0`

UI должен объяснять, что endpoint работает, но saved facts для текущего пользователя пока отсутствуют.

## Error state

Если endpoint возвращает 401/403/500 или `ok: false`, UI показывает ошибку без падения страницы.

## Safety

Step 54B не включает:

- DB writes;
- SQL execution;
- OpenAI calls;
- correction actions;
- commit;
- push.

## Deferred to later steps

- Step 55: user-facing filters refinement.
- Step 56: correction actions.
- Step 57: links to Activity Event and Value Object pages.
## Step 54B1 ESLint repair

Step 54B created the table component, but ESLint blocked the patch with:


eact-hooks/set-state-in-effect

Reason: the first implementation called loadFacts() directly inside useEffect, and that function synchronously called setLoadState({ status: "loading" }).

Step 54B1 keeps the same read-only UI contract but splits the initial effect load from the manual refresh handler:

- initial effect calls an internal async loader;
- state is updated only after the awaited fetch result or after caught error;
- manual refresh may still set loading state from a button click;
- no DB writes, SQL execution, or OpenAI calls are added.
## Step 54B1 ESLint repair marker

Exact marker: Step 54B1
Exact ESLint marker: react-hooks/set-state-in-effect

Repair summary:

- Step 54B1 fixed the `react-hooks/set-state-in-effect` warning in `ActivityFactsTable`.
- The initial `useEffect` now calls an internal async `loadInitialFacts` function.
- Manual refresh still uses the button handler and `GET /api/activity/facts`.
- This repair adds no DB writes, no SQL execution, no OpenAI calls, no commit, and no push.
