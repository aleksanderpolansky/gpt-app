# ARCTor.app — CUX4A1 Semantic Enrichment DB Foundation

Дата: 28.07.2026
Базовая точка: `main @ 653dad3183bef6bb8c065a4c32a85a10e0de6fd9`

## Назначение

CUX4A1 добавляет только служебный контур асинхронного семантического анализа уже созданной канонической активности.

Каноническая активность остаётся в:

```text
public.activity_events
```

Календарная запись остаётся только проекцией exact-плана:

```text
public.calendar_events.related_activity_event_id
```

Новая таблица:

```text
public.activity_semantic_enrichment_runs_cux4
```

не является второй таблицей активностей. Она хранит только:

- статус AI-обработки;
- номер попытки;
- исходный снимок запроса;
- защищённые поля;
- результат модели;
- список применённых и пропущенных полей;
- предыдущие значения для будущего revert;
- ошибку.

## Пользовательские данные

Все существующие пользовательские активности и календарные записи на текущем этапе считаются тестовыми. Их сохранение, backfill и compatibility-слой не требуются.

Эта migration, однако, остаётся полностью additive:

```text
DELETE=false
TRUNCATE=false
DROP_EXISTING_TABLES=false
BACKFILL=false
```

Очистка тестового пользовательского контента, если она понадобится, выполняется отдельным контролируемым SQL после проверки новой схемы.

## Добавляемые RPC

### create_activity_semantic_enrichment_run_cux4_v1

Создаёт один idempotent AI-run для существующего planned `activity_event`.

Повтор с тем же `request_key` и тем же payload возвращает `idempotent_replay`.

Повтор с тем же ключом и другим payload отклоняется:

```text
CUX4A1_RUN_IDEMPOTENCY_CONFLICT
```

### claim_activity_semantic_enrichment_run_cux4_v1

Переводит:

```text
pending → processing
failed → processing
needs_clarification → processing
```

Повторный claim уже выполняемого или завершённого run не создаёт новую запись.

### finish_activity_semantic_enrichment_run_cux4_v1

Завершает run одним из состояний:

```text
processed
needs_clarification
failed
```

CUX4A1 ещё не изменяет поля `activity_events` и не создаёт календарную проекцию после AI. Controlled apply будет следующим отдельным микрошагом CUX4A2.

## Статусы

```text
pending
processing
processed
needs_clarification
failed
cancelled
```

## Защищаемые поля

```text
title
schedule_mode_code
scheduled_date
schedule_start_date
schedule_end_date
deadline_at
started_at
ended_at
duration_minutes
planned_target_links
```

## Безопасность

- owner user и actor проверяются по `actor_public_profiles`;
- run может относиться только к owned planned `activity_event`;
- identity-поля run неизменяемы;
- переходы статусов ограничены;
- JSON-поля проверяются;
- direct-доступ `anon/authenticated` запрещён;
- RPC доступны только `service_role`;
- существующие таблицы и пользовательские строки не изменяются.

## Порядок выполнения

1. Применить static package в репозиторий.
2. Запустить local verification.
3. В Supabase выполнить preflight READONLY.
4. Выполнить migration.
5. Выполнить postcheck READONLY.
6. Выполнить runtime acceptance.
7. Выполнить helper cleanup.
8. Выполнить cleanup postcheck READONLY.
9. Только после этого переходить к CUX4A2 server wiring.

## Scope lock

CUX4A1 не включает:

- изменение composer;
- вызов `after()`;
- delayed update `activity_events`;
- создание/обновление `calendar_events` после AI;
- retry/revert API;
- CUX5 selector;
- CUX6 task shelf;
- recurrence;
- Gantt;
- facts/measures;
- analytics.
