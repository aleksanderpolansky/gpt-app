# ARCTor.app — CUX2: встроенный composer активности над календарём

Дата: 2026-07-28
Baseline: `main @ 8e9c019ec4e2b35a0b6e21327712f47bf3cb5b65`

## Цель

Убрать обязательный переход на отдельную страницу `/calendar/add` из основного сценария планирования. Кнопка «Добавить» на `/calendar` разворачивает рабочий блок непосредственно над календарём.

## Реализованный сценарий

1. Пользователь нажимает «Добавить» и остаётся на `/calendar`.
2. Вводит активность обычными словами.
3. Локальный CUX1 parser сразу предлагает режим, дату, время и длительность.
4. Через короткую паузу вызывается semantic preview; AI может уточнить название и timing draft.
5. Все поля остаются редактируемыми до сохранения.
6. План можно связать с несколькими Value Objects через существующий PP1B selector.
7. Сохранение выполняется через `/api/activity/events` и canonical PP1B write path.
8. Exact-план создаёт одну calendar projection; остальные режимы projection не создают.
9. После успеха календарь обновляется без обязательного перехода в Activity Container.
10. Подробный контейнер остаётся доступен отдельной ссылкой.

## Элементы composer

- текстовое поле с объясняющим placeholder;
- future-ready кнопка диктовки;
- автоматический и ручной запуск semantic preview;
- редактируемое название активности;
- пять видимых radio-карточек режима расписания;
- дата, начало, окончание и длительность в одном блоке;
- existing planned-target selector;
- компактная мини-справка о приоритете правил;
- ссылка «Подробный разбор»;
- состояния analysis / clarification / save success / save error;
- сворачивание без потери draft в текущей browser session.

## Приоритет интерпретации, показанный в UI

1. Явные данные текущего сообщения.
2. Персональные правила пользователя.
3. Стандартные правила ARCTor.
4. Уточнение у пользователя при неоднозначности.

Полноценный редактируемый и сохраняемый script правил входит в CUX3.

## Изменённые пути

- `src/app/calendar-rebuild/CalendarRebuildClient.tsx`
- `src/components/calendar/cux2-inline-activity-composer.tsx`
- `docs/CUX2_INLINE_CALENDAR_COMPOSER_RU_20260728.md`
- `scripts/cux2-inline-composer-contract-check.mjs`

## Вне scope CUX2

- persistent AI rules;
- voice transcription backend;
- расширенный autocomplete Value Objects;
- task shelf;
- drag-and-drop;
- multiday bars;
- Timeline/Gantt.

## Защитные границы

- SQL отсутствует;
- миграций Supabase нет;
- PP1B RPC и таблицы не меняются;
- CUX1 timing contract переиспользуется без изменения;
- старые страницы `/calendar/add` и `/calendar/activity-review` сохранены как fallback и detailed flow.
