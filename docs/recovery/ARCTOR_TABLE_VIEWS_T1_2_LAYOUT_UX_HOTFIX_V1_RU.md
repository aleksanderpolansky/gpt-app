# ARCTOR_TABLE_VIEWS_T1_2_LAYOUT_UX_HOTFIX_V1 — recovery checkpoint

Дата: 2026-08-28
Baseline: `main @ 5e99924af14df853036cc9b4d4c01cb2afa6ba64`
Release commit message: `table-views-t1-2-layout-ux-hotfix-v1`

## 1. Почему понадобился hotfix

После успешного `ARCTOR_TABLE_VIEWS_T1_TABULATOR_V1_1` production visual postcheck подтвердил, что Tabulator корректно работает на `/value-objects`, `/activity-today` и `/activity-facts`, но выявил UX-дефекты первого прохода:

- общий adapter использовал `layout: fitDataStretch`, поэтому суммарная минимальная ширина колонок превышала доступную область между left navigation и AI right rail;
- `/activity-today` показывал малоинформативную колонку actor/User и одновременно выталкивал Analysis/Status/Source за правую границу;
- `/activity-facts` имел слишком широкие Activity/Value Object/Type колонки и также уводил Status/Source/Confidence вправо;
- `/value-objects` пытался одновременно держать Description и Parent вместе с иерархией и счётчиками, хотя эти поля вторичны в компактном tree-grid;
- технические фильтры Facts (`semantic key`, `value object UUID`, `activity UUID`) занимали основной пользовательский filter surface.

Данные/API/DB при visual postcheck не были признаны причиной проблемы. Это layout/UX defect presentation layer.

## 2. Общее решение Tabulator

Общий `ArctorTabulator` переводится на:

- `layout: "fitColumns"`;
- `responsiveLayout: "hide"`;
- существующий `resizableColumnFit: true` сохраняется;
- column contract расширяется `responsive`, `visible`, `tooltip`;
- таблица и holder получают `width/max-width: 100%`;
- длинный cell/header text использует ellipsis вместо расширения grid;
- на ширине <= 1100 px уменьшаются font/padding без превращения строк в карточки.

Правило responsive priority: `responsive: 0` означает критическую колонку, которую Tabulator не должен скрывать; большие значения скрываются раньше.

## 3. `/value-objects`

Сохраняются все данные row model, включая description и parent. Изменяется только layout priority:

- Observation object — всегда видим, основной `widthGrow`;
- Role и Status — высокий приоритет;
- Direct / Descendants / Leaves — компактные числовые колонки;
- Description и Parent остаются доступными на широком viewport, но получают низший responsive priority и скрываются первыми при недостатке ширины.

Data Tree, `_children`, filters, Map/Cards/Tree, row navigation и authoring controls не меняются.

## 4. `/activity-today`

Основной Table View теперь показывает приоритетно:

- When;
- Activity;
- Activity time;
- Duration;
- Analysis;
- Status;
- Source как вторичную колонку.

`User/actor` удалён только из набора отображаемых table columns, потому что в персональном журнале он почти всегда повторял `User` и занимал ширину. Поле остаётся в существующей row/detail model и ничего не удаляется из данных/API.

Карточки, modal/detail, Edit/Delete/Restore и activity APIs не меняются.

## 5. `/activity-facts`

Основные приоритеты:

- Activity и Value Object — всегда видимы;
- Value и Unit — всегда видимы;
- Status — высокий приоритет;
- Date/Type/Confidence/Source скрываются последовательно при недостатке ширины.

Для названия ОН действует прежний безопасный порядок: сначала `valueObjects[].title`, затем legacy fallback `semanticObjectKey`. Hotfix не придумывает перевод, если API не прислал title.

Основной Filters block упрощён до `Limit + Status`. Технические фильтры `Semantic key / Value object ID / Activity ID` сохранены без изменения query contract, но перенесены в сворачиваемый блок `Technical filters` / локализованный эквивалент во всех 7 locale. Reset/Apply semantics не меняются.

## 6. Что НЕ меняется

- SQL/migrations: нет;
- DB writes: нет;
- Storage writes: нет;
- OpenAI calls: нет;
- Tabulator dependency остаётся exact `6.5.2`, MIT;
- inline editing: нет;
- drag/reparent: нет;
- XLSX/Google Sheets: нет;
- facts tagging/detail/cards: сохранены;
- VO Tree/Cards/Map: сохранены;
- Activity Journal cards/detail/actions: сохранены.

## 7. Acceptance gates

Release runner обязан подтвердить:

1. `main`, clean worktree, exact baseline HEAD и `origin/main`;
2. exact Git blob guards для шести изменяемых tracked files;
3. отсутствие collision для нового validator/recovery checkpoint;
4. payload manifest + secret scan;
5. pre-mutation isolated TypeScript delta для изменяемых TS/TSX;
6. `npm ls tabulator-tables` = `6.5.2` без переустановки dependency;
7. hotfix validator PASS;
8. changed-files ESLint `--max-warnings=0`;
9. full `tsc --noEmit`;
10. full `next build`;
11. `git diff --check`;
12. full ESLint baseline/post без новой регрессии;
13. exact dirty/staged allowlist;
14. commit, push, remote verification, final clean worktree.

При FAIL до commit — `git reset --hard` к baseline и удаление только new paths hotfix. При push failure после commit — commit сохраняется, используется `--resume-push`.

## 8. Точка продолжения

После production visual postcheck проверить desktop с AI right rail, уменьшенную ширину viewport и mobile. Если grid помещается и responsive priorities работают, T1 можно считать закрытым как read-only presentation foundation. Следующий отдельный design gate — T2 editable grid / clipboard / user column preferences; spreadsheet documents/XLSX/Google Sheets остаются отдельным последующим контуром.
