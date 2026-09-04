# ARCTor — Recovery checkpoint: Basic Intake Live Acceptance Cleanup V1

Дата: 2026-09-04
Baseline до релиза: `757d33c4e7491b25ee81f4c8a10c1037670dd826`
Implementation commit: `beb30aa4b25017f8a7c81ac268c50cd72d9fac82`
Релиз: `ARCTOR_BASIC_INTAKE_LIVE_ACCEPTANCE_CLEANUP_V1`

## Причина шага

После `ARCTOR_BASIC_INTAKE_MODEL_INVOCATION_RECOVERY_V1` production acceptance подтвердил восстановление полноценного basic-intake вызова `nano -> gpt-5.6-luna` и корректный controlled retry старых `safe_server_fallback` активностей.

Фактический live acceptance перед этим cleanup:
- новая активность `20 болгарских приседаний` завершила basic intake в режиме `nano_model` и при реальном `NO_MATCH` попала в очередь куратора;
- старая fallback-активность `подтянулся 10 раз` после ручного `Повторить AI-анализ` получила полноценный результат модели;
- счётчик `Не обработано` уменьшился `5 -> 4`;
- очередь куратора увеличилась `3 -> 4`, потому что повторный завершённый поиск действительно дал `NO_MATCH`;
- счётчик `модель была недоступна` остался `0`;
- у повторно обработанного сигнала режим анализа — `nano_model`.

Live acceptance также выявил два cleanup-дефекта, не затрагивающих сам AI pipeline:
1. unit от модели мог сохраняться как `repetitions`, тогда как UI локализует канонический `repetition`; из-за этого часть экранов показывала `20 repetitions` или `10 repetition`.
2. processing log объединял `activity_event_saved`, завершение AI-анализа и `curator_queue_registered` в один блок `Добавление активности`. Поэтому timestamp блока становился временем последнего события (например, retry в 15:22), хотя сама активность была создана раньше (например, 13:26).

## Что изменено

### 1. Каноническая единица повторений

- server-side validation basic intake нормализует model unit aliases `repetition / repetitions / rep / reps -> repetition`;
- новые и повторно проанализированные измерения сохраняются с каноническим unit `repetition`;
- Activity Analysis UI дополнительно понимает старые сохранённые aliases без backfill;
- Reality Curator UI локализует `repetition / repetitions / rep / reps` по locale:
  - RU `повт.`;
  - PL `powt.`;
  - EN `reps`;
  - UK `повт.`;
  - DE `Wdh.`;
  - ES `rep.`;
  - CS `opak.`.

Таким образом, исторические записи исправляются на чтении, а новые — ещё и нормализуются при записи.

### 2. Provenance retry

- `analyzeBasicActivityIntakeV1` получил явный `analysisTrigger: initial | retry`;
- обычный background capture использует default `initial`;
- authenticated POST retry передаёт `analysisTrigger="retry"`;
- trigger сохраняется в `basicIntakeAnalysisV1` и затем в metadata journey-событий;
- для будущего успешного retry событие `background_analysis_completed` получает явные подписи:
  - RU `Повторный AI-анализ завершён`;
  - EN `AI re-analysis completed`.

Старые journey rows, созданные до этого release и не содержащие `analysisTrigger`, намеренно НЕ угадываются как retry. Они отображаются нейтрально как `AI-анализ активности`, чтобы не создавать ложный provenance.

### 3. Processing log больше не смешивает разные события

Старый блок `activity_intake` разделён на три фактических блока:
- `activity_capture` — исходная регистрация сигнала и сохранение активности; timestamp остаётся временем исходного capture;
- `background_analysis` — завершение AI-анализа и квалификация `NO_MATCH`; timestamp — время анализа/retry;
- `curator_queue` — передача подтверждённого сигнала в очередь куратора; timestamp — время передачи.

Блок `Добавление активности` больше не получает время повторного AI-анализа только потому, что более позднее событие находилось в той же группе.

## Ошибки и уроки release-runner

- Первая попытка `ARCTOR_BASIC_INTAKE_LIVE_ACCEPTANCE_CLEANUP_V1` не начала выполнение вообще: Windows PowerShell 5.1 остановился на parse stage с `Missing closing ')' in expression` в функции `Rollback-Local`.
- Причина — в строке `ROLLBACK_WORKTREE_CLEAN` отсутствовала одна закрывающая скобка у выражения `Log (... -f (YesNo (...)))`.
- Поскольку это ParserError до начала исполнения скрипта, source mutation, commit/push, DB mutation и OpenAI call не выполнялись.
- Исправление V1.0.1 относится только к release-runner и recovery evidence; functional cleanup payload не изменён.
- Перед выдачей V1.0.1 дополнительно проходит собственную bracket/string/here-string static parser check, чтобы подобная синтаксическая ошибка не повторилась.

## Данные / миграции / безопасность

- SQL migrations: 0.
- Новые таблицы / RLS / RPC: 0.
- Release-time DB writes: 0.
- OpenAI calls by release runner: 0.
- Backfill исторических строк: 0.
- Runtime использует только существующие JSON/metadata поля и существующие `activity_processing_logs`.
- Новое поле `analysisTrigger` является additive JSON metadata и не меняет SQL contract.
- Пользовательский budget/hard cap и provider pipeline этим cleanup не меняются.

## Проверки / evidence

Release runner обязан до commit/push пройти:
- exact clean `main` baseline и `origin/main`;
- canonical Git blob contracts для всех шести изменяемых существующих файлов;
- EOL-safe component patch self-test для LF и CRLF;
- dedicated source/fixture validator `ARCTOR_BASIC_INTAKE_LIVE_ACCEPTANCE_CLEANUP_V1_VALIDATION`;
- touched/new-file ESLint;
- full ESLint no-regression относительно baseline;
- TypeScript `--noEmit`;
- production `npm run build`;
- `git diff --check`;
- exact changed-file allowlist;
- отдельный implementation commit;
- этот recovery checkpoint отдельным docs commit;
- push + remote `main` verification;
- clean worktree after release.

## Точка продолжения

После production deploy выполнить короткий visual acceptance:
1. открыть уже существующую `20 болгарских приседаний` и убедиться, что `20 repetitions` теперь отображается локализованно (`20 повт.` в RU) без повторного AI-вызова;
2. открыть сигнал `подтянулся 10 раз` у куратора и убедиться, что unit отображается `10 повт.`;
3. в processing log убедиться, что `Добавление активности` показывает исходное время создания, а AI-анализ и передача в очередь вынесены в отдельные блоки;
4. для следующего реального retry проверить явную запись `Повторный AI-анализ завершён`;
5. если эти проверки PASS — закрыть Basic Intake Model Invocation Recovery + Live Acceptance Cleanup как завершённый этап и перейти к следующему пункту дорожной карты куратора.
