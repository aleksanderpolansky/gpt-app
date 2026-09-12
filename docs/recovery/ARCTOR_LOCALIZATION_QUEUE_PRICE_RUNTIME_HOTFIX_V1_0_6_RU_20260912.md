# ARCTor — Localization Queue + Price Runtime Hotfix V1

Дата: 2026-09-12
Baseline: main @ e4422808147b6f2b5b03f7413817d60431f22789
Release: ARCTOR_LOCALIZATION_QUEUE_PRICE_RUNTIME_HOTFIX_V1_0_6

## Причина
- Runner V1 от 2026-09-12 07:56 прошёл source transforms и validator, но остановился на targeted ESLint до build/commit/push; первый REPORT не сохранял полный native stderr.
- Runner V1_0_1 от 2026-09-12 08:19 подтвердил PASS 15/15, но targeted ESLint остановил релиз на react-hooks/set-state-in-effect.
- Runner V1_0_2 от 2026-09-12 08:24 прошёл validator 15/15 и targeted ESLint, но production build остановился на strict TypeScript check.
- Runner V1_0_3 от 2026-09-12 08:37 прошёл validator 15/15, targeted ESLint, TypeScript и production build, но harness ошибочно трактовал native STDERR warning как failure.
- Runner V1_0_4 от 2026-09-12 08:48 прошёл validator 15/15, targeted ESLint, TypeScript и production build. git diff --check правильно обнаружил реальную порчу recovery-вывода: double-quoted PowerShell here-strings интерпретировали Markdown backticks как escape-последовательности, а Add-Content на Windows PowerShell 5.1 изменял текстовый контур recovery-файлов. Commit/push не выполнялись; failure path запустил rollback.
- Runner V1_0_5 от 2026-09-12 09:03 прошёл recovery integrity, validator 15/15, targeted ESLint, TypeScript, production build и git diff --check. Он остановился до commit на allowlist gate с `UNEXPECTED_CHANGED_PATH:src/app/admin/localization-jobs/`. Причина не в лишнем файле: обычный `git status --porcelain=v1` сворачивает полностью новый untracked-каталог в одну запись `src/app/admin/localization-jobs/`, тогда как allowlist содержит точный файл `src/app/admin/localization-jobs/page.tsx`. V1_0_6 использует `--untracked-files=all`, чтобы gate сравнивал реальные файлы, а не агрегированную директорию.
- Создание системного ОН блокировалось ошибкой CONTENT_LOCALIZATION_BUDGET_BLOCKED:PRICE_SNAPSHOT_STALE до записи самого ОН.
- Локализация читала имя Nano из ai_model_tiers, тогда как актуальный серверный каталог уже использует GPT-5.6 Luna.
- Неполный перевод не имел гарантированной самостоятельной очереди; backfill зависел от повторного открытия куратора.
- Старые model/config env-переменные могли удерживать устаревшее имя модели.

## Решение
- System ОН сначала сохраняется с человеческими EN + языком куратора и localizationState=pending; ошибка перевода больше не отменяет создание ОН.
- После insert выполняется немедленная попытка локализации; ошибки переводятся в retrying, постоянные проблемы контекста — в blocked.
- Состояние очереди хранится в value_objects.metadata_json.curator_system_draft_v1: attempts / last error / next attempt / missing locales.
- Добавлена admin-страница /admin/localization-jobs и ссылка «Переводы · N» сразу под «Куратор модели».
- Добавлен ежедневный maintenance cron: освежает price snapshots из versioned Navigator model catalog и повторяет ожидающие переводы.
- Nano/Standard runtime маршруты используют navigatorModelCatalog; budget preflight предваряется ensureNavigatorPriceSnapshotV1.
- OPENAI_SEMANTIC_MODEL, OPENAI_DEFAULT_MODEL, OPENAI_MAX_OUTPUT_TOKENS, OPENAI_TEMPERATURE больше не являются env-источниками runtime; локальные строки удаляются этим runner.
- Recovery-файлы записываются UTF-8 без BOM, CRLF, без PowerShell-interpolation Markdown backticks; старое содержимое проверяется byte-for-byte как неизменённый prefix.

## Safety / invariants
- SQL schema не меняется.
- Неполный перевод не удаляется из очереди из-за числа попыток.
- blocked остаётся видимым администратору и может быть повторён вручную.
- При несовпадении active DB price snapshot с versioned catalog runtime fail-closed и не перезаписывает цену молча.
- Raw EN/RU curator evidence сохраняется; AI не заменяет human locales.

## Acceptance
- validator PASS;
- targeted ESLint PASS;
- TypeScript tsc --noEmit PASS;
- production build PASS;
- recovery byte-prefix/UTF-8/trailing-whitespace integrity PASS;
- git diff --check PASS;
- source allowlist проверяет untracked-файлы поштучно (`--untracked-files=all`);
- clean commit + push;
- после deploy: создание ОН проходит даже если OpenAI/price budget временно недоступен; pending job виден в admin UI.
