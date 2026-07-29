# ARCTor.app — CUX7C2 Timeline View

**Дата:** 29.07.2026
**Baseline:** `main @ 8588bc671e9e2e0e4b45a6b1a1f5ba49b8fa56c9`
**Scope:** read-only horizontal Timeline over the existing calendar read models

## 1. Цель

Добавить третье представление календаря рядом с `Grid` и `List`:

```text
Grid | List | Timeline
```

Timeline показывает все записи выбранного Day / Week / Month на горизонтальной
временной оси, не создавая новые доменные записи и не меняя API.

## 2. Источники данных

Timeline использует уже загруженные read models:

- `visibleEvents` — точные интервалы из `calendar_events`;
- `visibleAllDayItems` — `date_only`, `date_range`, `deadline`, прочитанные из
  canonical `activity_events`;
- текущий `range` выбранного Day / Week / Month.

Новых API, таблиц, SQL, Supabase writes и canonical writes не добавляется.

## 3. Поведение представления

### Общая модель

1. Timeline является третьим значением `CalendarPresentationMode`:
   `grid | list | timeline`.
2. Выбранное представление сохраняется при переключении Day / Week / Month.
3. Каждая каноническая запись показывается одной строкой.
4. Слева находится фиксированная подпись записи, справа — горизонтальная ось.
5. Ось прокручивается горизонтально, левая колонка остаётся видимой.
6. Клик по `date_only`, `date_range` или `deadline` открывает существующий
   CUX6 Activity Container.
7. Клик по `exact` открывает существующий modal календарного события.
8. Timeline не имеет собственного write path.

### Day

- ось состоит из 24 часовых колонок;
- `exact` занимает интервал согласно start/end;
- `date_only` и видимая часть `date_range` занимают день;
- `deadline` показывается точечным янтарным маркером с учётом времени.

### Week

- ось состоит из семи дневных колонок;
- `date_range` клипуется по границам выбранной недели;
- точные события сохраняют позицию внутри соответствующего дня;
- deadline остаётся точкой, а не занятым временным интервалом.

### Month

- ось использует те же 42 даты month grid, что и текущий read range;
- длинные диапазоны показываются одной полосой и клипуются по краям;
- горизонтальный scroll предотвращает сжатие дней до нечитаемой ширины.

## 4. Визуальный контракт

Использованы существующие High-Fidelity Dashboard Design tokens и текущий стиль
Production-календаря:

- background `#f0f2f7` / white cards;
- primary `#3b6ef8`;
- border `rgba(0,0,0,0.06)` и `#e8ebf3`;
- radius около `0.75rem`;
- компактная типографика 10–14 px;
- rounded cards, subtle shadow, blue selected state;
- горизонтальный scroll вместо разрушения responsive layout;
- sticky left label column для сохранения контекста.

Демонстрационный проект из дизайн-архива не импортируется как зависимость и не
заменяет существующие компоненты ARCTor.

## 5. Локализация

Подпись Timeline и служебные тексты добавлены для:

- English;
- Polish;
- Russian;
- Ukrainian;
- German;
- Spanish;
- Czech.

## 6. Доменные ограничения

1. `activity_events` остаётся canonical source для planned activity.
2. `calendar_events` остаётся единственной projection для exact.
3. Timeline — только read/display model.
4. Одна запись не дублируется в новой таблице или сущности.
5. `unscheduled` остаётся на Task Shelf и не попадает на ось.
6. Текущие actor ownership и API filtering не меняются.
7. Grid, List, Task Shelf и оба существующих popup сохраняются.

## 7. Не входит

- SQL или изменение схемы;
- новый API;
- новая сущность Timeline/Gantt task;
- Value Object или project-root grouping;
- milestones;
- dependencies и critical path;
- automatic rescheduling;
- resource leveling;
- recurrence generation;
- drag/drop или resize;
- zoom controls;
- virtualization;
- background AI;
- derived summary bars.

## 8. Allowlist

```text
src/app/calendar-rebuild/CalendarRebuildClient.tsx
scripts/cux7c2-timeline-contract-check.mjs
docs/CUX7C2_TIMELINE_VIEW_RU_20260729.md
```

## 9. Runtime acceptance

Проверить в Production:

1. Переключатель содержит Grid / List / Timeline.
2. Timeline сохраняется при Day → Week → Month.
3. Day показывает 24-часовую ось.
4. Week показывает семь дней.
5. Month прокручивается горизонтально и использует month-grid range.
6. `exact`, `date_only`, `date_range`, `deadline` видны одновременно.
7. `date_range` показан одной полосой и корректно клипуется.
8. deadline показан точечным маркером.
9. exact открывает event modal.
10. non-exact открывает Activity Container.
11. Grid и List работают без регрессий.
12. После refresh записи не дублируются.

## 10. Следующий блок

После CUX7C2 Production smoke отдельно решить готовность read model для:

- CUX7C3 grouping / milestones;
- затем CUX8 visual, mobile and accessibility completion.
