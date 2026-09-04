# ARCTor — Recovery checkpoint: Reality Model Curator Dual Scope Bootstrap V1.4

Дата подготовки: 2026-09-04
Ожидаемый baseline: `35c4d818e9160b4fb123289d6e7d146bf5c73525`
Релиз: `ARCTOR_REALITY_MODEL_CURATOR_DUAL_SCOPE_BOOTSTRAP_V1_4`

## 1. Точка продолжения

Рабочий пилот куратора идёт по сигналу пользователя «шёл пешком на работу 15 минут». До этого этапа уже реализованы входящая очередь куратора, принятие сигнала в работу, проверка типовой активности, проверка параметров и append-only журнал решений. Ошибочные неоднозначные параметры были удалены/retired, а универсальный системный параметр `Количество / Count` с canonical code `count` был создан вручную через UI и проверен в RU/EN/ES.

## 2. Архитектурная поправка после V1/V1.1/V1.2

Четыре предыдущие попытки релиза были безопасно остановлены до commit/push и без мутаций БД:

1. V1 — CRLF-чувствительный patch-anchor.
2. V1.1 — слишком хрупкая текстовая проверка вызова lifecycle RPC.
3. V1.2 — read-only preflight `GLOBAL_SYSTEM_GRAPH_EMPTY`.
4. V1.3 — changed-files ESLint остановил релиз: `react-hooks/set-state-in-effect` в первичной загрузке конструктора и `react-hooks/exhaustive-deps` для вычисляемого списка родителей.

V1.2 выявил не проблему данных, а ошибочную предпосылку реализации: наличие System/Private было смешано со структурной ролью ОН.

Правильный контракт:

- структурная роль ОН: `root | intermediate | leaf`;
- уровней `intermediate` может быть сколько угодно;
- отдельно каждый ОН имеет область/свойство доступа:
  - Private: `scope_code='actor'`, владелец — текущий пользователь и его активный actor/profile, доступ только владельцу;
  - System: `scope_code='global'`, ownerless, `origin_type_code='system_model'`, создаётся только администратором/куратором и после отдельного выпуска может использоваться всеми пользователями.

System/Private не является четвёртым типом узла и не меняет `root/intermediate/leaf`.

## 3. Исправление после V1.3

V1.3 корректно остановился на новом ESLint gate до commit/push. Rollback вернул baseline и чистое рабочее дерево.

V1.4 исправляет только клиентскую реализацию конструктора без изменения архитектурного контракта:

- первичная загрузка теперь запускается из `useEffect` как внешняя `fetch`-синхронизация с `AbortController`; синхронный вызов функции, которая сразу делает `setState`, удалён;
- вычисление `allParents`, `parents` и `canCreate` сделано обычным derived-state без лишних `useMemo`, поэтому нестабильная dependency `allParents` исчезла;
- API, Private/System семантика, write paths, DB contract и release gates не меняются.

## 4. Что делает V1.4

На следующем шаге куратора после решения «Нужен новый листовой ОН» появляется рабочий конструктор пути.

Для КАЖДОГО создаваемого ОН куратор обязан явно выбрать два независимых признака:

1. `Приватный / Системный` — без значения по умолчанию;
2. `Корневой / Промежуточный / Листовой` — без значения по умолчанию.

Правила дерева:

- root не имеет родителя;
- intermediate может иметь родителем root либо intermediate;
- intermediate уровней может быть сколько угодно;
- leaf может иметь родителем только intermediate;
- leaf завершает текущий участок построения измеримого объекта.

Если создаётся непосредственный потомок root, куратор явно выбирает semantic facet. Более глубокий узел наследует facet родителя.

## 5. Private write-path

Private создаётся через существующие P1C RPC:

- `create_value_object_ontology_v1`;
- `set_value_object_ontology_lifecycle_v1`.

Владелец всегда вычисляется сервером из текущей admin-сессии и active profile через `resolveActiveActorContext`.

Клиент не передаёт `owner_user_id` или `owner_actor_id`.

Запрещено создавать Private ОН от имени пользователя, чей сигнал разбирает куратор.

Private после успешной P1C-проверки активируется и доступен только текущему владельцу.

## 6. System write-path

System создаётся только после `requirePlatformAdmin()`.

Системные строки имеют существующий канонический контракт Global/System:

- `scope_code='global'`;
- `owner_user_id IS NULL`;
- `owner_actor_id IS NULL`;
- `created_by_actor_id IS NULL`;
- `visibility_code='public'`;
- `privacy_class_code='public_ontology'`;
- `origin_type_code='system_model'`.

Первый System ОН МОЖЕТ быть root. Поэтому пустой global graph является допустимым bootstrap-состоянием и больше не является ошибкой preflight.

System-ОН, созданный этим этапом, остаётся `status='draft'`, получает `system_hidden_from_observation_ui=true` и не публикуется автоматически. Идентичность куратора хранится в append-only processing log и metadata draft, а не в owner-полях системного объекта.

## 7. Идемпотентность и журнал

Каждый созданный root/intermediate/leaf получает отдельное append-only событие `observation_object_created` с уникальным deterministic log id от `signalId + valueObjectId`.

Это позволяет в рамках одного сигнала построить:

`root → intermediate → intermediate → ... → leaf`

без искусственного ограничения «один объект на сигнал».

Только создание target leaf завершает текущий шаг. Создание root/intermediate оставляет конструктор открытым.

## 8. Release-time safety

Сам release не выполняет миграций и не мутирует БД. Runtime-мутирование возможно только после явного действия куратора в production UI.

Runner обязан до commit/push выполнить:

- exact baseline/blob gates;
- clean worktree;
- payload SHA256;
- read-only Supabase preflight;
- проверку существующего параметра `count`;
- проверку P1C RPC/OpenAPI;
- проверку root kind `domain_root` и generic kind contracts;
- проверку Global/System ownership invariants, при этом 0 global rows допустимо;
- ESLint no-regression;
- changed-files ESLint;
- TypeScript noEmit;
- production build;
- `git diff --check`;
- allowlist changed files;
- commit/push/remote-main verification.

## 9. Следующая ручная проверка после PASS

1. Открыть текущий сигнал куратора.
2. Убедиться, что решение «Нужен новый листовой ОН» сохранено.
3. Проверить, что `Приватный/Системный` не выбран заранее.
4. Проверить, что `Корневой/Промежуточный/Листовой` не выбран заранее.
5. Для пустого System-графа создать System root как первый объект либо выбрать Private и проверить обычный user-owned путь.
6. После root создать intermediate; при необходимости повторить intermediate.
7. Создать leaf и убедиться, что только после leaf шаг закрывается.
8. Проверить ownership/scope/status в БД и append-only журнал.
9. После evidence обновить `docs/recovery/` фактическим commit, результатами UI/DB postcheck и точкой продолжения.

Этап не считать закрытым без актуального recovery-checkpoint.
