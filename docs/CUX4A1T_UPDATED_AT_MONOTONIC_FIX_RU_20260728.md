# ARCTor.app — CUX4A1T: монотонный `updated_at`

Дата: 28.07.2026
Baseline: `main @ 653dad3183bef6bb8c065a4c32a85a10e0de6fd9`

## Причина корректировки

Runtime acceptance CUX4A1 прошёл 10/10, но показал временную аномалию:

- `created_at` semantic run создавался через `clock_timestamp()`;
- общий trigger `set_activity_recording_updated_at()` использует `now()`;
- внутри одной транзакции `now()` остаётся временем начала транзакции;
- поэтому после `claim` и `finish` значение `updated_at` могло стать раньше `created_at`.

Это не повредило activity data и не нарушило статусы, но делает аудит времени
некорректным.

## Решение

Для таблицы `activity_semantic_enrichment_runs_cux4` создаётся отдельная trigger
function:

`public.set_activity_semantic_enrichment_updated_at_cux4()`

Она устанавливает:

`updated_at = greatest(clock_timestamp(), created_at)`

Триггер CUX4A1 переводится с общей функции на новую специализированную функцию.

## Границы

Корректировка:

- не изменяет `activity_events`;
- не изменяет `calendar_events`;
- не удаляет существующие строки;
- не меняет общий `set_activity_recording_updated_at()`;
- не создаёт вторую сущность активности;
- не меняет CUX4A1 create/claim/finish RPC;
- не выполняет backfill.

Пользовательские данные остаются вне scope. Текущие записи проекта являются
тестовыми, но эта корректировка не нуждается в их очистке.

## Acceptance

1. Dedicated trigger function существует.
2. CUX4A1 updated-at trigger вызывает только dedicated function.
3. Dedicated function использует `clock_timestamp()`.
4. `created_at <= updated_at` после создания run.
5. `updated_at` возрастает после `claim`.
6. `updated_at` возрастает после `finish`.
7. Fixture rows очищаются до завершения runtime acceptance.
