# ARCTOR Formula Explicit Publish Gate API V1.0.1

Дата: 2026-09-16
Baseline: `aa7a8ea83cd73595736ba24ffa8573c974ffe4ce`

## Ошибка первого launcher и исправление V1.0.1

Первый `ARCTOR_FORMULA_EXPLICIT_PUBLISH_GATE_API_V1` был остановлен до ESLint,
TypeScript, build и commit.

Baseline/remote были корректны и worktree был чистым, но launcher завершился:

`ROUTE_ALLOWED_ACTIONS_PUBLISH_VERSION_MISSING`

Причина находилась только в управляющем PowerShell:

- для двух массивов `allowedActions` использовался `.Replace(...)`;
- шаблон был записан в single-quoted PowerShell string с `` `n ``;
- в single-quoted string `` `n `` не превращается в перевод строки;
- поэтому фактический TypeScript-текст не был найден и `publish_version`
  не добавился в `allowedActions`.

Rollback завершился `PASS`; commit и push не выполнялись.

V1.0.1 использует три отдельные exact-once patch:

1. `allowedActions` для retired `update_draft`;
2. `allowedActions` для invalid action;
3. response `publish_readiness`, чтобы динамический server `publishEnabled`
   больше не перезаписывался значением `false`.

Дополнительно launcher требует ровно три появления строки `"publish_version"`:
одно action-condition и два массива `allowedActions`.

## Цель

Добавить первый явный publish gate после configured formula, no-write test,
test evidence и publish readiness.

Executor и запись фактов остаются выключены.

## Action

`POST /api/admin/formula-rules`

`action=publish_version`

Обязательные поля:

- `ruleVersionId`;
- `confirmationCode=PUBLISH_FORMULA_RULE_V1`.

Без точного confirmation code публикация блокируется.

## Предусловия

Publish повторно вычисляет текущий readiness и требует:

- active series;
- version `draft` или `testing`;
- configured formula;
- valid test evidence;
- актуальный formula fingerprint;
- `testPassed=true`;
- `noWrite=true`;
- `evaluationStatus=evaluated`;
- `unitAlgebra=resolved`;
- отсутствие другой published version в той же series.

## Первая публикация

При успешном переходе одним UPDATE фиксируются:

- `status_code=published`;
- `published_at=now`;
- `valid_from=now`;
- publish audit metadata.

Update также требует неизменившийся `updated_at` и status `draft/testing`,
поэтому concurrent configuration/evidence mutation блокирует переход.

## Supersede

Formula Registry уже имеет unique index: одна published version на series.

Без атомарной DB transaction/RPC нельзя безопасно выполнять двумя независимыми
update:

1. old published -> superseded;
2. new version -> published.

Поэтому V1 НЕ выполняет автоматический supersede.

Если published sibling уже существует:

- readiness получает `published_version_requires_atomic_supersede`;
- `requiresAtomicSupersede=true`;
- publish блокируется.

Отдельный atomic supersede RPC будет следующим этапом версионирования.

## Audit

Metadata публикуемой версии получает:

`ARCTOR_FORMULA_PUBLISH_AUDIT_V1`

с formula fingerprint, evidence time, curator identity, publish time и
`supersedeMode=none_first_publication_only`.

После publication существующий DB trigger защищает content published version
от редактирования.

## Что НЕ включено

- automatic supersede;
- executor;
- result/snapshot fact write;
- derivation lineage;
- recalculation execution.

## SQL

Новой migration нет. Используется существующая production schema.

## Recovery

Этап продолжает безопасный launcher pattern:

- local/remote baseline и clean worktree проверяются до mutation;
- rollback до mutation ничего не удаляет;
- recovery-файл удаляется только если создан этим launcher.

## Следующая точка

После успешного API gate:

1. explicit Publish UI с подтверждением;
2. live acceptance первой безопасной публикации;
3. затем atomic supersede/versioning RPC;
4. executor — только отдельным последующим gate.
