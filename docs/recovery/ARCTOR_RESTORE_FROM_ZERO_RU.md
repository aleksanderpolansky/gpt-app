# ARCTor.app — восстановление с нуля

Цель: восстановить текущее состояние проекта на новом компьютере без необходимости перечитывать старые чаты.

## 1. Скачать репозиторий

Репозиторий:

`aleksanderpolansky/gpt-app`

После клонирования получить все ветки и переключиться на:

`feat/gsr1-global-system-reality-machine-contract-v1-20260811`

Контрольный commit этого recovery snapshot:

`843d1ea6bdf0ee822416d5ccfa9d8d445718c7c4`

До применения новых изменений проверить:

```powershell
git branch --show-current
git rev-parse HEAD
git status --short
```

Ожидается правильная ветка, нужный commit и чистая рабочая папка.

## 2. Установить зависимости

В корне проекта установить зависимости способом, соответствующим lockfile репозитория.

После этого проверить production build:

```powershell
npm run build
```

Не использовать `npm audit fix --force`.

## 3. Прочитать recovery docs

Порядок:

1. `docs/recovery/ARCTOR_CURRENT_STATE_RU.md`
2. `docs/recovery/ARCTOR_DECISIONS_AND_FAILURES_RU.md`
3. `docs/recovery/CHECKPOINT_MANIFEST.json`
4. `docs/recovery/evidence/`

Этого должно быть достаточно, чтобы понять откуда продолжать.

## 4. Supabase

Manual SQL считается отдельным audit ledger.

На текущей контрольной точке уже применены как минимум:

- `20260811_gsr1c_global_aliases_recognition_v3.sql`
- `20260811_gsr1d_global_runtime_bridge_ai_budget_v1.sql`
- `20260811_gsr1e_openai_pilot_price_refresh_budget_hardening_v1.sql`

Не запускать их повторно вслепую.

Сначала выполнить read-only preflight и сравнить живую БД с ожидаемым состоянием.

Ожидаемая Global System Reality seed:

- global objects = 150;
- roots = 12;
- intermediate = 35;
- leaves = 103.

## 5. Переменные среды

Секреты в recovery docs и Git не сохраняются.

Для работы pilot нужны существующие локальные/hosting environment variables, включая OpenAI, Supabase и Auth0/Vercel конфигурацию.

Если секреты утрачены, их нужно перевыпустить у соответствующего провайдера, а не искать в Git.

## 6. Проверки Global System Reality

Перед новым patch выполнить существующие validators:

```powershell
node scripts/validate-gsr1f-global-observation-preview-v1.mjs
node scripts/validate-global-system-reality-seed-v1.mjs
npm run build
```

## 7. OpenAI budget rule

Нельзя запускать новый тест, если его документированный максимум может превысить USD 0.10 на одну operation без нового явного подтверждения.

Текущий обычный двухступенчатый Nano pilot имеет документированный максимум USD 0.00975 на одну operation.

Не запускать весь 24-fixture corpus одним пакетом без отдельного расчёта бюджета.

## 8. С чего продолжать после этого checkpoint

Текущий незавершённый вопрос:

G24:

`Ужинал вчера около девяти вечера.`

К GSR1I V3 уже подтверждено:

- leaf = `process.nutrition.meal`;
- локальное время вчера около 21:00 восстановлено;
- `temporalPrecision=approximate`.

Последняя попытка нормализовать `meal_label` в `dinner` (GSR1I V4) дала HTTP 500 и была автоматически откатана.

Поэтому следующий шаг:

1. открыть последний GSR1I V4 REPORT / raw response в `docs/recovery/evidence/`, если он доступен;
2. найти точную причину HTTP 500;
3. исправить только эту причину;
4. повторить только G24;
5. при PASS — commit code + validator + recovery update + evidence.

## 9. Что остаётся заблокированным

P8 Goal World Compiler остаётся заблокированным до завершения Global System Reality one-week pilot gates.

## AI Architecture restore point — 2026-08-12

После восстановления проекта проверить наличие:
- `docs/reality-core/ARCTOR_AI_ARCHITECTURE_LOCK_V1_RU.md`;
- `lib/ai/contextManifest.ts`;
- `supabase/manual-applied/20260812_ai_a1_context_manifest_foundation_v1.sql`;
- `supabase/diagnostics/20260812_ai_a1_context_manifest_runtime_postcheck_READONLY.sql`;
- `scripts/validate-ai-a1-context-manifest-v1.mjs`.

Обязательные проверки:
```powershell
node scripts/validate-ai-a1-context-manifest-v1.mjs
node scripts/validate-gsr1f-global-observation-preview-v1.mjs
node scripts/validate-global-system-reality-seed-v1.mjs
npm run build
```

AI-A1 production acceptance после deploy: выполнить один обычный `/activity-ai-lab` Global Reality preview и затем read-only `20260812_ai_a1_context_manifest_runtime_postcheck_READONLY.sql`. Ожидается один completed execution, два validated manifests и два linked usage events; `store=false`, retries=0 и все hashes присутствуют.

Следующий архитектурный блок: AI-A2 Recognition Profiles.

## AI-A2 P1 restore point - 2026-08-13

После checkout authoritative checkpoint восстановить/проверить следующие слои:

1. AI-A1: public.ai_analysis_executions, public.ai_context_manifests и public.ai_usage_events.analysis_execution_id. Production runtime evidence: 6/6 PASS.
2. AI-A2-P1 manual-applied SQL: supabase/manual-applied/20260813_ai_a2_p1_recognition_foundation_v1.sql. Live acceptance: 14/14 PASS.
3. Recognition table: public.value_object_recognition_profiles; active pilot profiles=11; direct table SELECT blocked for anon/authenticated/service_role.
4. Read RPCs: public.get_global_value_object_recognition_profile_v1(uuid) and public.get_global_value_object_recognition_candidates_v1(text,text,jsonb,integer), service_role-only.
5. Existing concept_aliases/exact recognizer are reused and preserved. Do not create a duplicate aliases table.
6. Stokrotka regression: purchase must be candidate; process.home.household_task must be absent. Generic sleep without day/night remains unresolved.
7. Runtime integration is NOT yet part of P1. /activity-ai-lab remains on the previous candidate path until AI-A2-P2. Reality Graph writes remain disabled for preview.

If live DB already contains the AI-A2-P1 table/functions, do not rerun the migration blindly; run its read-only/live postchecks or compare schema first.

## AI-A2 P2 restore point - 2026-08-13

Authoritative parent checkpoint: 23e1e44ed36e8e01c501f2ddf618d0563c48e630.
AI-A2-P1 DB migration: supabase/manual-applied/20260813_ai_a2_p1_recognition_foundation_v1.sql, SHA256 ab9c851d3be1f7a1763c535afe585d41ddcc721e5a23eabaefb2aa8d8a732a2d, live acceptance 14/14 PASS.

P2 runtime files:
- lib/reality/globalObservationPilot.ts SHA256 ef75dc73e8f1a0eb3acaa9f4f7f195c062a1353540151a75375f062d9f97728f
- lib/reality/recognitionCandidatePolicy.ts SHA256 8006eb0aa805deb4655fa259e0de6c4371fbdbe40355e6fb4943dc164445bea4
- scripts/validate-ai-a2-p2-runtime-integration-v1.mjs SHA256 804d94542955219fff520afa734b556666176ae774d5ccbb08a4906ed1ffc3d7
- scripts/validate-gsr1f-global-observation-preview-v1.mjs SHA256 1d73e0bc1e061c7a499452c0bb310840cd45f01f6fdd0a0473d080b78cceaf11

Restore behavior:
- Global preview candidate retrieval calls public.get_global_value_object_recognition_candidates_v1(text,text,jsonb,integer).
- Query evidence is segment.sourceFragment.
- limit=5, semantic_tags=[] until neutral-frame stage is implemented.
- supporting-only candidates are visible for trace/disambiguation but never selectable.
- unresolved/no-match groups force __NONE__ and server validates the guard.
- AI-A1 manifests, budget, 2-call maximum, store=false, retries=0 and preview-only no-write boundary remain active.

Do not rerun AI-A2-P1 migration merely to restore P2 source. Validate the live DB first. Production runtime acceptance for P2 is intentionally pending until a real preview regression is run.
