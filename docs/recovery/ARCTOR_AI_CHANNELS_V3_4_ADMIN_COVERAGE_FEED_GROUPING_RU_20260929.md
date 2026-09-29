# ARCTOR_AI_CHANNELS_V3_4 — admin runtime controls, coverage, category filter, feed grouping

Дата: 2026-09-29
Baseline: `main @ 3c8e2494785317725287f743bcaa28e7cce3fc52`

## Цель

1. Перенести изменяемые runtime-настройки каждого ИИ-канала в административный UI `/admin/ai-instructions`.
2. Добавить управляемую модель, reasoning, web-search budget/context, output budget, coverage policy, category policy и feed preview count.
3. Не позволять одному поставщику занимать всю выдачу при `diverse/exhaustive`: server-side round-robin + `maxPerProvider`.
4. Добавить строгую тематическую категорию. Для продуктового канала администратор может выбрать `food_grocery` и `non_alcoholic_beverage` без правки кода.
5. Группировать публикации одного ИИ-канала в ленте; по умолчанию показывать первую и кнопку «Показать ещё N».
6. Разрешить управляющему публичного канала (owner/admin) глобально скрыть отдельную публикацию канала без физического удаления.

## Системные границы

- `maxItems <= 30`.
- `maxToolCalls <= 20`.
- `maxOutputTokens <= 20000`.
- `maxPerProvider <= 10`.
- Непривилегированный пользователь не может повысить provider-cost knobs через handcrafted API: server применяет безопасный baseline для model/reasoning/tool budget/context/output budget.
- Источник каждой находки по-прежнему должен присутствовать в provider web-search sources.
- Скрытие публикации меняет `message_objects.lifecycle_status` на `withdrawn`, сохраняет исходную запись и provenance в `metadata_json`.

## Проверка после публикации

1. `/admin/ai-instructions?locale=ru` — блок `4 · Каналы ИИ` виден и открывает расширенные настройки.
2. Для канала Щецина через административный UI установить/проверить: `detailed`, `current`, `maxItems=20`, `coverageMode=exhaustive`, `maxPerProvider=3`, `minDistinctProviders=5`, strict categories.
3. Тестовый сбор должен вернуть несколько сетей при наличии подтверждённых результатов; Biedronka Home / smartwatch и другие non-food позиции не должны пройти strict category filter.
4. `/feed` — одна карточка на канал + «Показать ещё N».
5. Admin может нажать «Скрыть» на AI-публикации; после обновления она отсутствует у всех читателей канала.


## Model and launcher hardening
- Package control scripts use ASCII-only `.cmd` / `.mjs`; no package `.ps1` parser dependency remains.
- Model field in admin UI is a select backed by `CHANNEL_MODEL_OPTIONS` / `CHANNEL_ALLOWED_MODELS`, not arbitrary free text.
- Allowed set: `gpt-5.4-nano`, `gpt-5.4-mini`, `gpt-5.6-luna`, `gpt-5.6-terra`, `gpt-5.6-sol`.


## V3.4 release safety

- Runtime provider-cost controls are accepted only for platform admins; non-admin saves are normalized to the code defaults.
- No sandbox/worktree is used by the installer. The package first verifies the exact baseline, target cleanliness, package hashes, encodings and local dependencies without modifying target files.
- A baseline backup is created before the first write.
- The patch is then applied directly to the primary repository and validated there with `git diff --check`, the V3 validator, TypeScript, ESLint and a real Next production build using the repository's own `node_modules` and environment.
- Any failure after the first target-file write triggers automatic target-only rollback to the exact baseline. Unrelated files are never reset, cleaned or stashed.
- Publication has an explicit resume path for the commit-created/push-failed state.
- No production SQL is required for V3.4; existing channel specs remain valid through runtime defaults and can be edited from the admin UI after deployment.

## V3.4 dirty-worktree safety

- Unrelated pre-existing working-tree and staged changes are allowed.
- Every V3 target path must be clean and equal to the exact baseline before installation.
- Apply/rollback touches only the V3 allow-list.
- Publish uses a temporary Git index, so unrelated staged changes are not included in the V3 commit and remain staged afterwards.
- Commit/push resume and committed-not-pushed rollback preserve unrelated working-tree and index state.
