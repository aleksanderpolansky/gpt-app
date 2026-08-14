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

## AI-A2 P3 restore point - 2026-08-13

Parent production checkpoint: eadead1b91fb216156ecd1a330f5e956066a292d.
P2 production runtime acceptance: PASS (Stokrotka purchase routing + generic sleep unresolved).

P3 source contract:
- lib/reality/globalObservationPilot.ts normalized SHA256 4c27579bc52e65a347da0c67ed72ecac808ad58bbdcf81bdb6e363f6a61f8063
- lib/reality/semanticProjectionPolicy.ts normalized SHA256 71b073a1ab176fd7f21962e2c330aa4f78d83a5f9bbdfad3f094369816fd13f1
- src/app/activity-ai-lab/page.tsx normalized SHA256 14aca5088717591579fad9b6ac53fb9de613d6153856bf113c09c954f670fd66
- scripts/validate-ai-a2-p3-semantic-projections-v1.mjs normalized SHA256 4e3589c9aefc8c46bb44a9cb87e68040a86a974408f83d20df87438d603311ff
- docs/reality-core/ARCTOR_AI_A2_P3_SEMANTIC_PROJECTION_CONTRACT_V1_RU.md normalized SHA256 6d9c545ea1ed80d877c9950615285cbeb5e402637c42d48e5367aac09cb5f996

Restore invariants:
- AI-A2-P2 recognition candidate RPC and limit=5 remain authoritative for primary leaf selection.
- semantic projections are deterministic preview only; no graph write and no extra provider calls.
- plain Stokrotka may show food/nutrition/possible household, but not family without explicit family cue.
- unresolved sleep has zero P3 semantic projections.
- target canonical keys are allowlisted and validated against active Global ontology.
- do not rerun AI-A2-P1 migration to restore P3 source.

## AI-A3 P2 restore point - 2026-08-13

Parent production checkpoint: df260c2a5b928350b2a02c8f1b55a06b21d3aecb.
Database external state before source release: AI-A3-P1 Data Capital Foundation V2 already applied manually, live acceptance 20/20 PASS. Do not rerun the migration.

Source invariants:
- feedback is append-only and execution/ownership bound;
- ? is no-write;
- selector includeGlobal is opt-in;
- only leaf manual link intents materialize after canonical activity_event exists;
- materialization uses semantic_exposure/manual/user_confirmed and does not overwrite an existing semantic_exposure row;
- P3 automatic projections remain preview-only;
- no new OpenAI call is introduced.

Rollback of source commit does not roll back the additive AI-A3-P1 database migration. Restore DB state by forward migration only if schema evolution later requires it.

## AI-A3 P3 direct-save restore point - 2026-08-13

Parent production checkpoint: 442af9b04248a66cf06d82d305b6246df0d09107.
Database external state: AI-A3-P1 Data Capital Foundation V2 уже применён 20/20 PASS; новых DB migrations в P3 direct-save нет.

Source invariants:
- /activity-ai-lab direct-saves through /api/activity/events;
- text/locale must still match the completed Global Reality analysis;
- manual leaf intent materializes only after activity_event create;
- retry after partial create must reuse checkpoint/idempotency and must not duplicate activity;
- future planned targets remain separate from semantic_exposure;
- automatic facts/P3 projections remain no-write;
- legacy /calendar/activity-review remains present for non-AI-Lab callers until separate migration.

Rollback of source commit does not roll back AI-A3-P1 additive DB tables. Restore DB by forward migration only if later schema evolution requires it.

## AI-A3 P4 fact-contract resilience restore point - 2026-08-13

Baseline before this release: 5f86c97830423ee2e6b9992bb9443d213942f74d. New files: lib/reality/factContractPolicy.ts, P4 validator/test, contract and local evidence. Modified runtime: lib/reality/globalObservationPilot.ts. Revert only this P4 layer if production acceptance fails; do not remove AI-A3-P3 direct-save behavior.

## AI-A3 P5A activity fact materialization restore point - 2026-08-13

Baseline before this release: ede332c7bda6f00cafe9836b3b6ca0e80f4a60fb. Modified: /activity-ai-lab direct-save page and aiLabDirectSave metadata. New: fact materialization helper, server route, tests, validator, contract and evidence. The existing database writer/schema is reused; this release executes no SQL migration. Revert this commit only if direct-save fact persistence fails; P4 analysis resilience remains independent.

## AI-A3 P5B restore point — 2026-08-13

Restore requires: P5A code baseline plus live writer rowtype hotfix V3 (`supabase/manual-applied/20260813_ai_a3_p5a_global_fact_writer_rowtype_hotfix_v3.sql`), then P5B mutual links UI/API. Verify P5A evidence 12/12 and writer V3 8/8. Canonical fact semantics: one neutral measure may have 1..N leaf projections sharing measure_id. Do not reconstruct semantic prefixes into activity titles.


## AI-A3 P5B GLOBAL detail hotfix restore point — 2026-08-13

Baseline: P5B commit `1061958ef8a43b375b82f70eb7342acb8afc47e6`. The hotfix changes only source/recovery; no SQL/schema migration. Required invariant: `/value-objects/[id]` may read an object when it is either owned by the active app user/actor OR is `scope_code=global` + `origin_type_code=system_model`. GLOBAL System objects are read-only and use GLOBAL tree/path resolution. Reverting this hotfix restores the P5B 404 for GLOBAL leaf links but does not alter P5A/P5B stored data.


## Restore point — AI-A3 P5B Mobile GLOBAL Localization v2

После восстановления commit этого hotfix проверить:

1. `node scripts/validate-ai-a3-p5b-mobile-global-localization-v2.mjs`;
2. P5B global-detail и mutual-links validators;
3. `npm run build`;
4. `/value-objects?locale=pl` и `/value-objects?locale=es` показывают локализованные GLOBAL title/description/path;
5. GLOBAL leaf открывается, но edit/restructure остаются недоступны;
6. на мобильной ширине карточки не расширяют viewport.

Следующий шаг после live acceptance: P5C quick capture + review buffer.


## Restore point — AI-A3 P5B GLOBAL full-card read-scope v1

Baseline: `b3147d26f7e89382994c323b0f2a6ecaf8ec6914`.

После восстановления:

1. `node scripts/validate-ai-a3-p5b-global-full-card-read-scope-v1.mjs`;
2. старые P5B global-detail + mutual-links validators;
3. mobile GLOBAL localization validator;
4. `npm run build`;
5. открыть GLOBAL root/leaf минимум в PL и EN;
6. убедиться, что жёлтый ACCESS_DENIED full-card блок исчез;
7. убедиться, что GLOBAL edit/restructure/PATCH/POST по-прежнему недоступны.

После live PASS закрыть P5B и перейти к P5C quick capture + review buffer.


## Restore point — AI-A3 P5B GLOBAL leaf detail consistency v1

Baseline: `f661ea575d6864092782b2143ddd2f32a2f7d0b0`.

После восстановления:

1. `node scripts/validate-ai-a3-p5b-leaf-detail-consistency-v1.mjs`;
2. full-card read-scope + mobile localization + старые P5B/P5A validators;
3. `npm run build`;
4. открыть GLOBAL leaf «Ходьба»;
5. проверить: leaf в заголовке и основных данных, параметрический блок не пишет «это не лист», Linked activities соответствует P5B mutual links, «Связанная реальность» содержит активность и 31 minute, GLOBAL edit/restructure недоступны.

После live PASS: P5B CLOSED, следующий блок P5C quick capture + review buffer.

<!-- AI_ADMIN_CONTROL_CATALOG_V1 -->
## Единый каталог управления AI — восстановление

1. Открой /admin/ai-instructions под platform owner/admin (viewer имеет read-only доступ).
2. Раздел «Инструкции AI»: код/default definitions находятся в src/lib/ai/processingInstructions.server.ts; DB overrides и история — public.ai_processing_instruction_sets / public.ai_processing_instruction_revisions.
3. Раздел «Правила обработки»: безопасный контракт matcher/action и code defaults — src/lib/ai/processingRuleContract.ts; чтение/версионирование — src/lib/ai/processingRules.server.ts; DB записи имеют prefix processing_rule__.
4. Раздел «Системные ограничения»: для каждой карточки указаны sourcePath, sourceSymbol и evidenceNeedle. Эти правила меняются только code release с regression/build.
5. Порядок диагностики конфликта: hard guards -> deterministic processing rules -> AI instructions -> history/examples.
6. Если нужен новый rule instance и matcher/action уже есть — создай его в админке. Если нужен новый matcher/action — добавь безопасный executor в код, validator/fixtures и выпусти релизом.
7. Следующий P5C Durable шаг должен подключить universal processing-rule executor к activity_quick_capture; пока каталог показывает это как pending runtime wiring.

## P5C durable rule executor restore
Проверить наличие src/app/api/activity/quick-capture/route.ts, src/lib/activity/aiLabQuickCaptureDurable.server.ts, src/lib/ai/processingRuleExecutor.ts и processingRuleExecutor.server.ts. В /admin/ai-instructions правила activity_quick_capture должны показываться runtime_wired. Контроль: «завтра в 18:00 тренировка 40 минут» -> одна planned activity; уход со страницы сразу после клика не останавливает обработку.
