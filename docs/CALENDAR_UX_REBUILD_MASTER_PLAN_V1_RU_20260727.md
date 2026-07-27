# ARCTor.app — Calendar UX Rebuild Master Plan v1

## CUX1 — Semantic Timing Correctness

Цель: устранить ошибки, уже найденные в Production smoke.

- убрать искусственные 08:00 и 30 минут из model prompt и fallback;
- распознавать начало и окончание временного интервала;
- exact-интервал должен иметь приоритет над deadline;
- распознавать даты с названиями месяцев на EN/PL/RU/UK/DE/ES/CS;
- правильно выбирать год относительно текущей даты и temporal direction;
- автоматически вычислять duration из start/end;
- автоматически вычислять end из start/duration;
- передавать структурированный timing draft от semantic API в UI;
- заменить скрытый select режима на видимые radio-cards.

CUX1 не меняет базу и PP1 write contract.

## CUX2 — Inline Calendar Composer

- кнопка «Добавить» раскрывает composer над календарём;
- текст/диктовка;
- ручные поля доступны сразу;
- radio-cards режима;
- выбор целей;
- ссылка «Правила и сокращения»;
- compact success state;
- отдельные `/calendar/add` и обязательный Activity Container выводятся из основного маршрута, но временно сохраняются как fallback/deep link;
- четыре KPI-карточки заменяются компактной toolbar-строкой.

## CUX3 — Editable AI Analysis Rules

Новый controlled DB contract:

- системный текст по умолчанию для каждой локали;
- actor/user-owned редактируемая копия;
- reset к system default;
- version history;
- активная версия;
- mini-help и примеры;
- test rule без создания активности.

Приоритет интерпретации:

1. явные данные текущего сообщения;
2. персональные правила пользователя;
3. стандартные правила ARCTor;
4. уточнение пользователя.

## CUX4 — Async Capture and Optional Container

- quick capture сначала создаёт canonical activity anchor;
- UI сразу подтверждает добавление;
- анализ получает статус pending/processed/needs_clarification/failed;
- schedule и targets дополняются controlled background write;
- exact после анализа получает одну calendar projection;
- Activity Container доступен через «Подробнее»;
- undo/revert после автоматического изменения.

## CUX5 — Scalable Value Object Selector

- фильтр branch policy;
- фильтр root/intermediate/leaf;
- actor/profile scope;
- autocomplete по подстроке;
- поиск по title, aliases и path;
- полный breadcrumbs path;
- recent/favorite;
- AI suggestions;
- multiple selected chips;
- controlled create-new flow.

## CUX6 — Task Shelf

Над календарём:

- Без даты;
- Срок скоро;
- Нужно уточнение.

Каждая группа показывает 2–3 элемента и «Подробнее».

Read API получает planned `activity_events`, а не только `calendar_events`.

## CUX7 — Multiday and Timeline/Gantt

Calendar modes:

- Day;
- Week;
- Month;
- Timeline;
- List.

Multiday bars отображаются над hourly grid. Timeline/Gantt поддерживает:

- группы по проекту;
- группы по Value Object;
- сворачивание;
- milestones;
- future dependency layer;
- overflow `+ ещё N`.

Project permissions, dependency engine и automated rescheduling не включаются до отдельного contract lock.

## CUX8 — Visual and Mobile Completion

- все токены из High-Fidelity Dashboard Design;
- компактная toolbar;
- сворачиваемая правая AI-панель;
- drag/drop;
- resize exact event;
- keyboard navigation;
- mobile list-first view;
- accessibility checks;
- финальный Production UI acceptance.
