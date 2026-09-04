# ARCTor — Recovery checkpoint: Model Unavailability / Curator Queue Hotfix V1

Дата: 2026-09-04
Baseline до релиза: 3d07341847d10597e1b1008a2db812430532d5a4
Implementation commit: 74f2e7c8c1ee9ebe51e20342f36f1cf7fb091a48
Релиз: `ARCTOR_REALITY_CURATOR_MODEL_UNAVAILABILITY_HOTFIX_V1`

## Что исправлено

- `safe_server_fallback` больше не является доказательством `NO_MATCH` типовой активности.
- Серверный fallback сохраняет детерминированно извлечённые параметры, но `typicalActivitySearchStatus` остаётся `not_run` или `failed`; `fullAiAnalysisCompleted=false`, `retryable=true`.
- `noSuitableTypicalActivity=true` допускается в кураторский контур только после полноценного `nano_model` поиска, `providerAvailable=true`, отсутствия `candidateLoadWarning` и завершённого `typicalActivitySearchStatus=completed`.
- Единый eligibility guard применяется к списку, рабочему API, templates, template-parameters, object-bootstrap, journey self-heal и backfill.
- `model_unavailable` пишется append-only в существующий `activity_processing_logs` только если полноценный provider response не был получен; внутренний сбой после успешного ответа модели не увеличивает этот счётчик. Повторные реальные случаи недоступности учитываются как отдельные события.
- Верхняя панель `/admin/reality-curator/signals` показывает: «С последнего визита куратора модель была недоступна N раз. Не обработано N активностей.»
- Второй N считается по уникальным activity_event_id, текущее состояние которых всё ещё `safe_server_fallback`; успешный последующий AI-разбор автоматически исключает активность из этого счётчика.
- Визит куратора хранится append-only в существующем `activity_processing_logs`. Клиент создаёт один стабильный UUID на browser visit; сервер исключает текущий UUID из поиска предыдущего marker, сначала читает предыдущий visit marker и считает статистику, только затем записывает новый marker. Ручное обновление переиспользует тот же UUID и не обнуляет окно; это также защищает от двойного initial GET.

## Совместимость и legacy

- Старые `safe_server_fallback` записи, где top-level `status` исторически равен `completed`, не попадают в очередь: eligibility определяется новым подстатусом/режимом, а не одним top-level status.
- При повторном вызове analyzer такие записи не short-circuitятся как полноценный анализ и могут быть разобраны моделью заново.
- Первый visit marker после выпуска не может восстановить неизвестное историческое время открытия страницы; поэтому «недоступна N раз с прошлого визита» начинает быть точным с момента первого marker. Второй счётчик сразу включает текущие legacy fallback-активности.

## Ошибки и уроки release-runner

- Первая попытка `HOTFIX_V1` остановилась до mutation на `git fetch origin main`: Windows PowerShell 5.1 превратил обычный informational STDERR Git (`From https://github.com/...`) в terminating error при глобальном `$ErrorActionPreference="Stop"`. Исправление: все native-команды выполняются с локальным `Continue`, а результат определяется по `$LASTEXITCODE`.
- Вторая попытка `HOTFIX_V1_0_1` также остановилась до mutation на source-contract gate для `lib/activity/activityProcessingLogs.ts`. Причина — сравнение с hash, рассчитанным по raw working-tree bytes из intake-копии; в файле присутствовало EOL-различие CRLF/LF, тогда как canonical Git blob на baseline был корректен. Исправление: source-contract теперь сверяется по canonical Git tree blobs `ExpectedBaseline:path` и `HEAD:path`, а не по сырым checkout-байтам.
- Третья попытка `HOTFIX_V1_0_2` успешно прошла весь содержательный validation-контур: dedicated fixtures/source gates, touched/new/full ESLint no-regression, TypeScript `--noEmit` и production Next build. Затем release-runner ложно остановился на changed-file allowlist, потому что `git diff --name-only` вернул корректные имена в STDOUT, но Windows Git одновременно выдал LF→CRLF warnings в STDERR; старый `GitText` смешал оба потока и warnings были приняты за filenames. Runner выполнил `reset --hard` и подтвердил clean rollback.
- Исправление V1.0.3: machine-readable Git calls (`GitText`) физически разделяют STDOUT/STDERR; парсеры используют только STDOUT, а informational STDERR сохраняется отдельно в `RUN/git_machine_stderr.log` для диагностики.
- Все три неудачные попытки подтвердили baseline `3d07341847d10597e1b1008a2db812430532d5a4`; ни одна не выполнила DB migration/write или OpenAI call. V1 и V1.0.1 остановились до source mutation; V1.0.2 применил payload только локально для проверок и затем подтвердил clean rollback до baseline.
- Recovery checkpoint является обязательной частью закрытия этапа: этот файл создаётся, коммитится отдельным docs-коммитом и проверяется вместе с final remote state.

## Safety / release gates

- migrations: 0
- release-time DB mutations: 0
- OpenAI calls by release runner: 0
- runtime writes: только существующий `activity_processing_logs` и существующий `raw_activity_signals.normalized_preview_json` в уже работающем analyzer path
- обязательные gates: exact baseline + canonical Git-tree source contracts, full ESLint no-regression, touched/new ESLint, custom fixtures, TypeScript --noEmit, Next build, git diff --check, changed-file allowlist, commit/push/remote verification.

## Точка продолжения

После production deploy проверить один реальный model-unavailable case и один реальный `nano_model NO_MATCH`: fallback не должен появиться в очереди; настоящий NO_MATCH должен появиться; banner должен считать events и unique outstanding activities согласно контракту.