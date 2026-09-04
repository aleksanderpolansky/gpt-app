# ARCTor — Recovery checkpoint: Basic Intake Model Invocation Recovery V1

Дата: 2026-09-04
Baseline до релиза: `afb365d4adca3139952d5dce9d576faf6b600b68`
Implementation commit: `bc993986b069dab88598242b72dd27903fb1954e`
Релиз: `ARCTOR_BASIC_INTAKE_MODEL_INVOCATION_RECOVERY_V1`

## Причина продолжения

После `ARCTOR_REALITY_CURATOR_MODEL_UNAVAILABILITY_HOTFIX_V1` live acceptance подтвердил корректное разделение очереди куратора: `safe_server_fallback` больше не становится ложным `NO_MATCH`, детерминированные параметры сохраняются, а деградированные активности остаются `retryable`.

Одновременно live production показал следующий отдельный блокер: новые активности сохранялись, но базовый analyzer завершался `safe_server_fallback` без полноценного результата модели. На этом этапе pipeline имел несколько pre-provider gates (`ai_analysis_execution` → budget preflight → usage event → context manifest) до фактического `runAiJsonWithUsageMetadata(...)`, а fallback трактовал любой сбой до `providerCallCompleted=true` как «model unavailable». Поэтому `providerCalls=0` не отличался от реальной сетевой/Provider ошибки.

Дополнительный известный риск — budget RPC требует свежий `ai_model_price_snapshots`; прежний bounded verification lease для runtime stale-price recovery закончился 2026-08-26. Каталог цен OpenAI повторно проверен 2026-09-04 по официальной документации.

## Проверенный каталог OpenAI 2026-09-04

Источник:
- https://developers.openai.com/api/docs/models/gpt-5.6-luna
- https://developers.openai.com/api/docs/models/gpt-5.6-terra
- https://developers.openai.com/api/docs/models/gpt-5.6-sol

Зафиксированные цены USD / 1M text tokens:
- `gpt-5.6-luna`: input 0.20 / cached input 0.02 / output 1.20.
- `gpt-5.6-terra`: input 2.00 / cached input 0.20 / output 12.00.
- `gpt-5.6-sol`: input 4.00 / cached input 0.40 / output 20.00.

`NAVIGATOR_MODEL_CATALOG_VERIFIED_AT` обновлён на 2026-09-04; bounded auto-seed / runtime refresh lease заканчивается 2026-09-11T23:59:59.999Z. После lease система снова fail-closed до новой проверки цен.

## Что изменено

- Basic intake при `PRICE_SNAPSHOT_STALE` и известных вариантах отсутствующего active snapshot выполняет один bounded self-heal только для exact mapping `nano -> gpt-5.6-luna`.
- Self-heal использует цены только из server-shipped verified model catalog, сохраняет versioned `ai_model_price_snapshots`, закрывает старые active rows того же exact tier/model и затем ровно один раз повторяет budget preflight.
- Если существующий active snapshot `nano/gpt-5.6-luna` имеет другие цены, refresh fail-closed (`BASIC_INTAKE_PRICE_REFRESH_BASELINE_MISMATCH_FAIL_CLOSED`); неизвестные budget причины не обходятся.
- Бюджет пользователя / hard cap не обходятся. Runtime price recovery исправляет только stale/missing price evidence.
- До provider-вызова теперь отдельно фиксируются стадии `model_catalog`, `analysis_execution`, `budget_preflight`, `usage_event`, `context_manifest`, `provider_config`.
- `providerAttempted=true` появляется только непосредственно перед `runAiJsonWithUsageMetadata(...)`; `AI_ENABLED=false` остаётся pre-provider blocker.
- `modelUnavailable=true` ставится только если provider был действительно attempted и полноценный response не был получен. Ошибка до provider = `analysis_blocked_before_provider`; ошибка после уже полученного provider response = `analysis_post_provider_failed`.
- Пустой/невалидный JSON response от OpenAI не считается «модель недоступна»: provider помечается как `responded_invalid`, analysis остаётся retryable.
- Успешный result содержит `providerAttempted=true`, `providerCompleted=true`, `providerState=completed`, `modelUnavailable=false`.
- `/api/activity/intake-analysis` получил authenticated POST retry для одной принадлежащей пользователю retryable activity. Повторный analyzer использует исходные `signalId`, `activityEventId`, actor, locale/timeZone.
- Карточка анализа больше не пишет «Подходящая типовая активность не найдена», если поиск реально не завершён. Для такого случая показано «Поиск типовой активности не завершён. Активность ожидает повторного AI-анализа.»
- Для retryable анализа добавлена явная кнопка «Повторить AI-анализ». Повторный вызов не выполняется бесконтрольно на каждом GET/refresh страницы.
- `gpt-5.6-sol` price values в server catalog обновлены с устаревших 5/0.5/30 на проверенные 4/0.4/20.

## Ошибки и уроки release-runner

- Третья production-попытка `ARCTOR_BASIC_INTAKE_MODEL_INVOCATION_RECOVERY_V1_0_2` остановилась на `COMPONENT_PATCH_MISSING:analysis_type` после записи трёх прямых payload-файлов, но до component mutation/validation/commit. Причина — patcher сравнивал многострочные anchors только в LF-формате; после предыдущего `git reset --hard` Windows checkout восстановил компонент с CRLF, поэтому семантически неизменный baseline не совпал побайтно с LF-anchor. Runner снова выполнил `reset --hard` к `afb365d4adca3139952d5dce9d576faf6b600b68` и подтвердил `ROLLBACK_WORKTREE_CLEAN: YES`; remote не изменился.
- Исправление V1.0.3: component patcher при чтении нормализует CRLF/CR к LF только во внутренней строке сопоставления, выполняет те же exact/unique anchors и при записи восстанавливает исходный EOL файла. Функциональный результат component patch остаётся тем же; изменён только EOL-safe механизм применения.

- Вторая production-попытка `ARCTOR_BASIC_INTAKE_MODEL_INVOCATION_RECOVERY_V1_0_1` прошла functional validator, touched/full ESLint no-regression, TypeScript `--noEmit`, production Next build, changed-file allowlist и создала локальный code commit `58e11c0f486bc6112925309637ef2386d83146b5`. Затем она остановилась до push на `git diff --cached --check` для recovery-файла. Причина — три строки встроенного Markdown template содержали по два trailing spaces (Markdown hard-break), которые Git корректно классифицировал как trailing whitespace. Runner выполнил `reset --hard` до baseline и подтвердил `ROLLBACK_WORKTREE_CLEAN: YES`; remote не изменился.
- Исправление V1.0.2: recovery Markdown нормализуется по строкам через `TrimEnd()` до staging, сам embedded template также очищен от trailing whitespace, а recovery diff-check теперь пишет диагностический вывод и отдельный PASS-marker в REPORT.

- Первая production-попытка `ARCTOR_BASIC_INTAKE_MODEL_INVOCATION_RECOVERY_V1` остановилась до `[APPLY]`, сразу после baseline/source/toolchain preflight. Windows PowerShell 5.1 сохранил top-level JSON array из `ConvertFrom-Json` как `System.Object[]`; дополнительная обёртка `@(...)` создала nested array, поэтому `$item.errorCount`/`warningCount` стали `System.Object[]` и runner получил `Cannot convert ... to System.Int32`.
- Исправление V1.0.1 относится только к release-runner: ESLint JSON перебирается напрямую через `foreach ($item in $parsed)` без nested-array wrapper, scalar count shape проверяется явно.
- Functional payload hotfix не изменён относительно первой попытки.
- Для последующих FAIL REPORT дополнительно содержит `SCRIPT_STACK` и `ERROR_POSITION`.
- Неудачная попытка подтвердила baseline `afb365d4adca3139952d5dce9d576faf6b600b68`, clean worktree, canonical source blobs и локальный toolchain; commit/push, DB mutation и OpenAI call не выполнялись.

## Данные / миграции / безопасность

- SQL migrations: 0.
- Release-time DB writes: 0.
- OpenAI calls by release runner: 0.
- Runtime DB writes: существующие `raw_activity_signals`, `activity_processing_logs`, `ai_analysis_executions`, `ai_context_manifests`, `ai_usage_events`; при recoverable stale/missing price snapshot разрешена одна versioned запись в существующую `ai_model_price_snapshots`.
- Новые таблицы, RLS policy и schema contracts не создаются.
- Provider retry в SDK остаётся `MAX_RETRIES=0`: один analyzer attempt = максимум один вызов provider; budget preflight retry после price self-heal не является повторным OpenAI call.

## Проверки / evidence

Release runner обязан до commit/push пройти:
- exact clean `main` baseline и `origin/main`;
- canonical Git tree blob contracts по всем четырём существующим изменяемым source files;
- embedded payload SHA-256;
- dedicated validator `ARCTOR_BASIC_INTAKE_MODEL_INVOCATION_RECOVERY_V1_VALIDATION`;
- touched/new-file ESLint;
- full ESLint no-regression относительно baseline;
- TypeScript `--noEmit`;
- production `npm run build`;
- `git diff --check`;
- exact changed-file allowlist;
- отдельный implementation commit;
- этот `docs/recovery/` checkpoint отдельным docs commit;
- push и remote `main` verification;
- clean worktree after release.

## Точка продолжения

Live acceptance после deploy:

1. Создать новую простую активность, например `подтянулся 10 раз`.
2. Открыть анализ и убедиться, что результат больше не `safe_server_fallback` при доступном provider: ожидается `analysisMode=nano_model`, `providerAttempted=true`, `providerCompleted=true`, `providerState=completed`.
3. Если подходящей ТА нет после полноценного поиска — только тогда разрешено `noSuitableTypicalActivity=true` и попадание в очередь куратора.
4. Для одной старой fallback-активности нажать «Повторить AI-анализ» и убедиться, что retry заменяет fallback полноценным анализом.
5. Проверить banner куратора: pre-provider budget/config blockers не увеличивают «модель была недоступна N раз»; реальный provider failure увеличивает.
6. Если retry снова fallback, смотреть `failureStage`, `providerState`, `providerFailureCode`: теперь причина должна быть диагностически однозначной без смешивания с model availability.
