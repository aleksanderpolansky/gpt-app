# ARCTor.app — CUX7B All-Day / Multiday Layer

**Дата:** 29.07.2026
**Baseline:** `main @ 5d7a62f43cdec3d12cccb5101613fea2e77f0cc0`
**Scope:** read-only projection of non-exact planned activities into calendar views

## 1. Цель

CUX7B добавляет над почасовой сеткой отдельный слой записей, у которых есть дата,
диапазон дат или крайний срок, но нет точного календарного интервала.

Источником истины остаётся `activity_events`.

```text
activity_events
  schedule_mode_code = date_only | date_range | deadline
        ↓ read-only projection
calendar API response: allDayItems
        ↓
Day / Week / Month representations
```

Новая `calendar_events` запись для этих режимов не создаётся.

## 2. Что реализовано

### API

`GET /api/calendar-rebuild/events` дополнительно:

- разрешает active actor через `getActivityUserContext`;
- читает planned `activity_events` текущего пользователя и активного профиля;
- выбирает только `date_only`, `date_range`, `deadline`;
- исключает отменённые и завершённые записи через список активных planned-статусов;
- возвращает отдельный массив `allDayItems`;
- фильтрует его по date-key диапазону текущего Day / Week / Month;
- не меняет существующие `calendar_events`, `time_blocks`, log, PATCH и DELETE.

### Day

Над почасовой сеткой появляется блок «Запланированные даты»:

- дата;
- диапазон дат;
- крайний срок;
- максимум четыре видимых записи и `+N` при переполнении;
- клик открывает существующий popup Activity Container.

### Week

Над почасовой сеткой появляется отдельная семидневная дорожка:

- date-only занимает один день;
- date-range показывается одной полосой через несколько колонок;
- deadline показывается отдельным маркером;
- пересекающиеся полосы распределяются по детерминированным дорожкам;
- отображаются до четырёх дорожек и `+N` при переполнении;
- клик открывает существующий popup активности.

### Month

В ячейке дня совместно показываются:

1. date-only / date-range / deadline;
2. точные календарные события.

Общий лимит ячейки остаётся три записи, затем показывается `+N`.
Ячейка больше не является вложенной кнопкой: дата и каждая запись имеют собственную
корректную кнопку.

## 3. Что не входит

CUX7B сознательно не включает:

- unscheduled в календарную сетку — они остаются на Task Shelf;
- Timeline;
- окончательную переработку List;
- milestones;
- Value Object / project grouping;
- dependency engine;
- critical path;
- recurrence generation;
- drag/drop или resize;
- автоматическое перепланирование;
- background AI;
- SQL и изменение схемы.

## 4. Доменные ограничения

1. `activity_events` остаётся canonical source.
2. `calendar_events` остаётся projection только для exact.
3. Non-exact activity не создаёт календарную копию.
4. Одно и то же значение показывается в разных views без новой доменной записи.
5. Ownership ограничен `user_id + acting_as_actor_id`.
6. Popup использует существующий CUX6 edit/cancel route.
7. Изменение активности вызывает обычный refresh календаря и полки.

## 5. Изменяемые пути

```text
src/app/api/calendar-rebuild/events/route.ts
src/app/calendar-rebuild/CalendarRebuildClient.tsx
src/features/calendar-core/types.ts
scripts/cux7b-all-day-multiday-contract-check.mjs
docs/CUX7B_ALL_DAY_MULTIDAY_LAYER_RU_20260729.md
```

## 6. Проверка после применения

```text
fresh baseline and exact allowlist
→ CUX7B static contract
→ npm ci
→ npm ls --all
→ production dependency audit
→ typecheck
→ Production build
→ runtime acceptance
→ controlled commit/push
```

Runtime acceptance должно проверить:

- date_only в Day / Week / Month;
- date_range через границу недели;
- deadline с отображением времени в popup;
- переполнение больше четырёх полос;
- отсутствие duplicate `calendar_events`;
- edit/cancel через один Activity Container popup;
- active profile isolation;
- exact event остаётся в hourly grid;
- unscheduled остаётся только на Task Shelf.
