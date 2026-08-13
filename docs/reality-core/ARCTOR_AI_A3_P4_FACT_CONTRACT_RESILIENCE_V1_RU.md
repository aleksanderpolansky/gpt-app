# ARCTor AI-A3-P4 — устойчивость фактов к контракту параметров

Дата: 2026-08-13

## Проблема

После AI-A3-P3 прямое сохранение из `/activity-ai-lab` оказалось недоступно для обычных фраз вроде покупки воды/яблок и прогулки 40 минут. Полный Global Reality анализ падал на необязательном факте с ошибкой `AI fact value failed the system parameter contract`, после чего UI переходил в резервный разбор и блокировал сохранение.

Причина: JSON schema разрешает модели заполнить одновременно несколько value-полей (`valueNumeric`, `valueText`, `valueBoolean`) или объявить `valueType`, не совпадающий с серверным типом параметра. Старый validator считал это ошибкой всего анализа, хотя семантический leaf мог быть выбран корректно.

## Решение

1. Серверный parameter contract остаётся единственным авторитетом для типа значения и допустимой единицы.
2. Если ожидаемое сервером typed value присутствует и source evidence является точным фрагментом исходного segment, сервер нормализует запись: оставляет только ожидаемое value-поле и зануляет лишние.
3. Если ожидаемого typed value нет, unit/parameter/evidence не разрешены или строка факта повреждена, этот необязательный факт отбрасывается.
4. Отброшенный необязательный факт НЕ переводит корректный semantic selection в fallback.
5. Попытка выбрать leaf вне server candidate set, обойти unresolved group или нарушить selection row contract по-прежнему является ошибкой полного анализа.
6. Все принятые факты остаются `proposed`; Reality Graph и факты автоматически не записываются.
7. Provider budget не меняется: максимум 2 вызова, 0 автоматических повторов.

## Failure boundary

Смысловой выбор и необязательное извлечение фактов разделены. Ошибка формы необязательного факта должна fail-closed для этого факта, а не fail-open и не fail-entire-analysis.

## Acceptance

- покупка с суммой, где модель дублирует numeric value в text field, остаётся Global Reality, а numeric fact нормализуется;
- прогулка `40 минут` не падает из-за лишнего text value вокруг numeric duration;
- факт с неподдерживаемым parameter/unit/evidence отбрасывается;
- `__NONE__` не принимает факты;
- bounded candidate / unresolved / provider / no-write guards сохранены;
- feature/main build и существующие AI-A1/A2/A3 validators проходят.

## Исправление release-runner V2

Первая попытка repository release не дошла до commit: Next.js успешно скомпилировал приложение, но TypeScript остановил build на TS2677 в `globalObservationPilot.ts`. Причиной был неверный type predicate `.filter((fact): fact is ProposedFact => fact !== null)`: фактический тип элемента после `map` содержал обязательные поля provenance/status, поэтому более широкий `ProposedFact` не мог использоваться как type-predicate target. Исправление использует `NonNullable<typeof fact>`, то есть сужает ровно фактический тип элемента и не меняет runtime-данные.
