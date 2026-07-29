# ARCTor.app — CUX7C1 Full List View

**Дата:** 29.07.2026
**Baseline:** `main @ 62ddfb6ae8f55d3a9f8db7aad42cffd08ecd1ad9`

## Цель

Заменить ограниченный список из первых восьми точных календарных событий полноценным представлением всех записей выбранного периода.

## Контракт

Список использует уже загруженные read models:

- `visibleEvents` — точные календарные события;
- `visibleAllDayItems` — `date_only`, `date_range`, `deadline`.

Новых API, таблиц, SQL и canonical writes не добавляется.

## Поведение

1. Список показывает все записи выбранного дня, недели или месяца без лимита `8`.
2. Точные и неточные записи объединяются и группируются по календарным датам.
3. Внутри даты записи сортируются хронологически.
4. `date_only`, `date_range`, `deadline` открывают существующий CUX6 Activity Container.
5. `exact` открывает существующий modal календарного события.
6. При переключении Day / Week / Month выбранный режим `List` сохраняется и не сбрасывается автоматически в Grid.
7. Диапазон дат показывается в списке один раз — в первой видимой дате выбранного периода.
8. Сетка Day / Week / Month, CUX7B all-day/multiday layer и Task Shelf не меняются.

## Локализация

Подписи Full List добавлены для:

- English;
- Polish;
- Russian;
- Ukrainian;
- German;
- Spanish;
- Czech.

## Не входит

- Timeline;
- группировка по Value Object или project root;
- milestones;
- dependency engine;
- recurrence generation;
- drag/drop и resize;
- background AI;
- изменения API;
- SQL.

## Allowlist

1. `src/app/calendar-rebuild/CalendarRebuildClient.tsx`
2. `scripts/cux7c1-full-list-contract-check.mjs`
3. `docs/CUX7C1_FULL_LIST_VIEW_RU_20260729.md`

## Следующий блок

После Production smoke CUX7C1:

- CUX7C2 — Timeline view;
- затем решение о grouping/milestones после появления необходимых read-model полей.
