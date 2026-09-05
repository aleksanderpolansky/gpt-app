# ARCTOR — системные ОН только в конструкторе системной типовой активности

Дата: 2026-09-05
Релиз: `ARCTOR_CURATOR_SYSTEM_OBJECTS_ONLY_V1_0_4`
Baseline: `38b9d41bc66b1393ad5709c2e2142a7a5d81b016`

## Контекст

Во время реального прохода сигнала `подтянулся 10 раз` в шаге выбора измеримого ОН
конструктор системной типовой активности показал приватные ОН текущего профиля
(`Medium-grip pull-up`, `Narrow-grip pull-up` и другие).

Это нарушает границу модели: приватные ОН пользователя могут быть контекстом/сигналом,
но не должны быть selectable target для системной типовой активности.

## Причина

`object-bootstrap/route.ts`:
- отдельно загружал `privateLeaves` и `systemLeaves`;
- объединял их в `existingLeaves`;
- backend-разрешение существующего leaf принимало как System leaf, так и actor-owned private leaf;
- создание недостающего пути поддерживало `scope=private` и `scope=system`.

UI отражал ту же двухконтурную модель и позволял выбрать/создать Private объект.

## Решение

Для этого curator workflow вводится жёсткий контракт:

**System typical activity → System observation objects only.**

- existing leaf list: только `scope_code=global`, ownerless, `origin_type_code=system_model`,
  `status=active`, `ontology_node_role_code=leaf`;
- private leaves и private parents не загружаются;
- POST `record_object_decision` повторно валидирует выбранный UUID на backend и отклоняет
  private/actor/non-System leaf;
- POST `create_observation_object` принимает только `scope=system`;
- родители нового пути — только System root/intermediate (`draft` или `active`);
- private creation branch удалён из этого endpoint;
- UI не показывает переключатель Private/System;
- новый путь создаётся только как ownerless hidden System draft;
- приватные ОН не удаляются и не меняются.

## Не изменяется

- очередь сигналов остаётся контрактом `missing_typical_activity`;
- БД/SQL schema не меняется;
- существующие private ОН не мутируются;
- коммерческий контур не меняется;
- OpenAI не вызывается;
- уже записанные processing logs не переписываются.

## История release-runner

### V1 — FAIL до любых операций с репозиторием

Первая попытка `ARCTOR_CURATOR_SYSTEM_OBJECTS_ONLY_V1` завершилась сразу после записи
заголовка REPORT с ошибкой:

`The script failed due to call depth overflow.`

Причина установлена по самому release-runner. В нём была объявлена PowerShell-функция
`Git`, а внутри неё выполнялась команда `& git @Args`.

PowerShell разрешает имена команд без учёта регистра, поэтому `git` внутри функции
резолвился обратно в функцию `Git`, а не в native `git.exe`. Возникла рекурсия до
переполнения глубины вызовов.

Доказательства безопасного состояния V1:
- `CODE_COMMIT_CREATED: NO`;
- `DATABASE_MUTATION_APPLIED: NO`;
- source patch не начинался;
- push не выполнялся;
- baseline/remote не менялись.

V1.0.1:
- wrapper переименован в `Invoke-GitText`;
- внутри wrapper вызывается явно `git.exe`;
- preflight требует `git.exe`;
- функциональный System-only patch не меняется.

### V1.0.1 — FAIL на первом Git wrapper call

V1.0.1 устранил рекурсию имени функции `Git`, но остановился до `BRANCH_BEFORE`,
то есть на первом вызове wrapper для `git rev-parse --show-toplevel`.

REPORT содержал бессмысленный текст:

`git failed (0): 1 / STDOUT: 2 / STDERR: 3`

Это выявило второй дефект runner-generator: PowerShell format placeholders `{0}...{4}`
были интерполированы Python f-string ещё при создании `.ps1` и превратились в буквальные
`0`, `1`, `2`, `3`, поэтому REPORT потерял реальные diagnostics.

Дополнительно wrapper использовал имя параметра `$Args`. В PowerShell `$args` является
automatic variable для неприписанных аргументов функции. Для исключения конфликта и
неоднозначного splatting V1.0.2 больше нигде не использует `$Args` как пользовательский
параметр:
- `Native(..., $CommandArgs, ...)`;
- `Invoke-GitText(..., $GitArgs, ...)`.

V1.0.2 также:
- исправляет все восемь повреждённых `-f` format strings;
- использует `git.exe` явно во всех Native Git calls;
- выполняет direct `git.exe --version` и `git.exe rev-parse --show-toplevel` smoke tests
  до wrapper;
- запрещает пустой `$GitArgs`;
- не меняет functional System-only patch.

Безопасное состояние после V1.0.1 подтверждено:
- `CODE_COMMIT_CREATED: NO`;
- `DATABASE_MUTATION_APPLIED: NO`;
- push не выполнялся;
- GitHub `main` остался на baseline.

### V1.0.2 — FAIL на TypeScript pre-ESLint gate

V1.0.2 успешно подтвердил native Git, baseline/remote, source blobs, patcher self-test,
source patch, `git diff --check` и dedicated System-only validator.

TypeScript затем обнаружил 13 ошибок в patched `route.ts`.

Причины установлены точно:

1. Replacement `readParent()` завершался на `async function resolveSemanticShape(`.
   В baseline между ними находится отдельная функция `chooseGenericKind()`, поэтому она
   случайно удалялась, а `resolveSemanticShape()` продолжал её вызывать.

2. Baseline заранее объявляет `let created`, `let resultSummaryRu`,
   `let resultSummaryEn`. Новый System-only branch повторно объявлял те же имена через
   `const`, что давало redeclaration и последующие definite-assignment ошибки.

V1.0.3:
- завершает replacement `readParent()` на `async function chooseGenericKind(`;
- сохраняет `chooseGenericKind()`;
- присваивает значения уже объявленным `created/resultSummary*`;
- добавляет patch-time invariants, self-test и dedicated validator для этих условий.

Безопасность V1.0.2:
- `CODE_COMMIT_CREATED: NO`;
- `DATABASE_MUTATION_APPLIED: NO`;
- push не выполнялся;
- `ROLLBACK_WORKTREE_CLEAN: YES`;
- baseline остался неизменным.

### V1.0.3 — FAIL только на touched ESLint (`prefer-const`)

V1.0.3 прошёл native Git, baseline/origin/remote, source blobs, patcher self-test,
`git diff --check`, dedicated System-only validator и TypeScript pre-ESLint.

Touched ESLint нашёл ровно три ошибки:
- `created` is never reassigned;
- `resultSummaryRu` is never reassigned;
- `resultSummaryEn` is never reassigned.

После удаления Private/System branching каждая из этих переменных имеет ровно одно
присваивание, поэтому предварительные `let` стали лишними.

V1.0.4:
- удаляет три obsolete predeclarations;
- объявляет `created`, `resultSummaryRu`, `resultSummaryEn` через `const` в единственном
  System-only блоке;
- self-test и dedicated validator требуют отсутствие старых `let` и ровно одно `const`;
- System-only функциональный контракт не меняется.

Безопасность V1.0.3:
- `CODE_COMMIT_CREATED: NO`;
- `DATABASE_MUTATION_APPLIED: NO`;
- push не выполнялся;
- `ROLLBACK_WORKTREE_CLEAN: YES`;
- baseline остался неизменным.

## Live acceptance

1. На шаге `Подходящий листовой ОН найден` отсутствуют все строки `· Приватний/Приватный`.
2. В списке только активные System leaf.
3. Если подходящего System leaf нет, куратор выбирает `Нужен новый листовой ОН`.
4. В создании отсутствует вариант Private; создаётся только System draft.
5. Подмена запроса с private UUID или `scope=private` блокируется backend.
6. После создания System draft он остаётся ownerless и не публикуется автоматически.

## Recovery discipline

Этап закрывается только после code gates, recovery commit, push/remote verification,
clean worktree и live acceptance на production.

Code commit: `5b4dc1b6b11d8624ad8125aee9241becc35c5f34`
