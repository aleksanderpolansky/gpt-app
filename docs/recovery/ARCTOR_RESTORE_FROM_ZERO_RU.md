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

## P5C durable validator portability
После восстановления на Windows validator scripts/validate-ai-a3-p5c-durable-rule-executor-v1.mjs обязан быть EOL-независимым: read() нормализует CRLF/CR в LF. Контрольный product commit — e4e01adea1be0398e62d2d9c143b819737d9490c, затем validator hotfix commit.

## P5C review controls restore
После восстановления проверить /activity-review -> Open review. На /activity-ai-lab?reviewActivityEventId=... должны сразу быть видны ✓, ✕, ✎, ?, а ниже «+ Добавить связь с ЦО». TracePanel обязан получать analysisOperationId и в review mode. Для существующей activity_event ручной + должен вызвать /api/ai/reality/manual-link-materialize. Не переводить quickCaptureReviewStatus в resolved этим шагом.

## P5C review refinements restore
Проверить наличие quickCaptureIntent.ts, quickCaptureSourceText.ts и aiLabUiCopy.ts. В /admin/ai-instructions должны быть видны guards activity_infinitive_intent_future и activity_source_text_preservation. Live controls: поиск «семья» позволяет staged multi-select до Confirm; «выгулять собаку 18.00» на RU создаёт planned activity в ближайшие 18:00 и сохраняет полный source/title; URL locale=en/es не должен заменяться message locale review snapshot.

## Localized content foundation restore
Проверить src/lib/localization/contentLocalization.ts и contentLocalization.server.ts, guard user_content_all_locale_versions в /admin/ai-instructions и validator scripts/validate-localized-content-foundation-activity-v1.mjs. Для новой activity после Quick Capture metadata_json.localizedContent должен содержать original и семь variants. /activity-review?locale=pl должен показывать польскую версию, а тот же activityEventId при locale=ru — русскую. /api/value-objects/selector?q=...&locale=pl&includeGlobal=1 должен возвращать те же canonical IDs, но польские system titles.

## P5C explicit temporal mode + durable recovery restore
Проверить src/lib/activity/quickCaptureTemporalMode.ts, quickCaptureTemporalModeCopy.ts, /api/activity/quick-capture, aiLabQuickCaptureDurable.server.ts и validator scripts/validate-ai-a3-p5c-temporal-intent-recovery-v1.mjs. POST /api/activity/quick-capture для новых UI-вызовов обязан содержать temporalDirection=past|future. В metadata activity_event должны присутствовать quickCaptureRequestedTemporalDirection и quickCaptureTemporalIntentSource=explicit_user_control. При открытии /activity-review выполняется demand-driven recovery pending/received/stale-processing raw_activity_signals. Guards activity_explicit_temporal_mode_authoritative и activity_durable_recovery_watchdog видимы на /admin/ai-instructions как read-only.

## Checkpoint: VALUE_OBJECT_AUTHORING_ONTOLOGY_BRIDGE_HOTFIX_V1_5

Если контекст потерян: P5C закрыт предыдущим checkpoint. Затем обнаружен дефект ручного создания ЦО: legacy root_draft_v3 создавал structural row без P1C ontology identity, из-за чего full card показывала P1C/P2D NOT_ONTOLOGY_READY и дочерний authoring исчезал. Исправление этого checkpoint переводит root/intermediate/leaf creation на create_value_object_ontology_v1 и удаляет только подтверждённые несвязанные private/manual/pre-ontology тестовые строки текущего владельца. После live acceptance продолжить с полным Runtime Context Compiler.

## AI_A1_RUNTIME_CONTEXT_COMPILER_V1 — восстановление

Проверить наличие src/lib/ai/runtimeContextCompiler.server.ts и scripts/validate-ai-a1-runtime-context-compiler-v1.mjs. Выполнить node scripts/validate-ai-a1-runtime-context-compiler-v1.mjs и node scripts/validate-ai-a1-context-manifest-v1.mjs. В lib/reality/globalObservationPilot.ts budget estimate, createAiContextManifest и runAiJsonWithUsageMetadata должны использовать один compiledContext. Таблица public.ai_context_manifests остаётся исходной AI-A1 таблицей; отдельное хранилище Runtime Context не создавать.

## AI_A1_1_EXECUTION_BOUNDARY_HOTFIX_V1_3 — восстановление

Проверить scripts/validate-ai-a1-1-localization-execution-boundary-v1.mjs и supabase/diagnostics/20260816_ai_a1_1_localization_execution_boundary_postcheck_READONLY.sql. contentLocalization.server.ts должен создавать surface_code=content_localization / operation_kind=content_localization, связывать usage только со своим localizationExecutionId и хранить parentSemanticExecutionId только в metadata/context lineage. После одного нового Quick Capture postcheck обязан показать semantic: exactly 2 manifests + 2 usage; localization: exactly 1 manifest + 1 usage; обе операции completed, store=false, retries=0.

## AI-A1 final restore point — 2026-08-16

AI-A1 и AI-A1.1 закрыты production evidence.

Обязательно присутствуют:

- lib/ai/contextManifest.ts;
- src/lib/ai/runtimeContextCompiler.server.ts;
- scripts/validate-ai-a1-context-manifest-v1.mjs;
- scripts/validate-ai-a1-runtime-context-compiler-v1.mjs;
- scripts/validate-ai-a1-1-localization-execution-boundary-v1.mjs;
- supabase/manual-applied/20260812_ai_a1_context_manifest_foundation_v1.sql;
- supabase/manual-applied/20260816_ai_a1_1_usage_operation_kind_schema_hotfix_v2.sql;
- supabase/diagnostics/20260816_ai_a1_1_localization_execution_boundary_postcheck_READONLY.sql.

Live schema invariant:

ai_usage_events_operation_kind_allowed разрешает как минимум chat_message, activity_preview, semantic_intake, admin_test, other и content_localization.

Финальный runtime invariant:

- activity_semantic_intake -> 2 validated manifests + 2 linked usage events;
- content_localization -> отдельный completed execution -> 1 validated manifest + 1 linked usage event;
- parent semantic execution = lineage only;
- localization actor guidance disabled;
- store=false, retries=0.

Не откатывать schema hotfix после появления content_localization usage rows: rollback SQL специально блокируется при наличии таких строк.

После восстановления следующий AI-архитектурный блок — AI-A3 Data Capital full contract.

## AI-A3.1 review-first semantic fact restore point

Required manual schema:
supabase/manual-applied/20260817_ai_a3_1_review_first_semantic_fact_pipeline_v2.sql

Quick capture:
src/app/api/activity/quick-capture/route.ts

Review:
src/lib/ai/activitySemanticReviewA31.server.ts
src/app/api/activity/review-analysis/route.ts
src/app/api/activity/review-commit/route.ts
src/components/activity/activity-semantic-review-a31.tsx

Coefficient rules:
src/app/api/activity-fact-coefficient-rules/route.ts
src/components/workspace/value-objects/activity-fact-coefficient-rule-manager.tsx

Safety:
- no deep AI/facts at capture;
- one AI call per fresh semantic draft;
- exact existing leaf IDs only for AI proposals;
- minimum eight proposals, exactly one primary;
- no parameter compatibility whitelist;
- fact commit transactional and idempotent;
- primary wording learning actor-scoped only;
- Global recognition profile auto mutation=false.


## Public organization featured media

Для BUSINESS FEATURED BLOCK V1 отдельная SQL migration не нужна. Endpoint POST /api/organizations/[id]/featured-media при первой загрузке проверяет Supabase Storage bucket arctor-public-media и при отсутствии создает его как public с JPEG/PNG/WebP и лимитом 5 MB. Восстановление приложения должно сохранять SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY: тот же server client используется для создания bucket и загрузки.

## AI RIGHT RAIL MULTIMODAL ACTIVITY V1 — восстановление/проверка

При восстановлении после commit этого блока проверить:

1. `src/components/app-shell/ai-navigator-provider.tsx` содержит marker `ARCTOR_AI_RIGHT_RAIL_MULTIMODAL_ACTIVITY_V1` и три режима `past|future|chat`.
2. `past/future` вызывают `/api/activity/quick-capture` с `temporalDirection` и `clientRequestId`; никакого второго activity write endpoint нет.
3. `src/components/app-shell/global-ai-navigator.tsx` содержит messenger UX: bottom sentinel, scroll tracking, `new messages`, retry, voice/photo controls и desktop segmented mode switcher.
4. `src/components/app-shell/global-app-shell.tsx` содержит три mobile corporate buttons и drawer не перекрывает заголовок rail.
5. `src/app/api/test/route.ts` принимает только JPG/PNG/WebP <= 3 MiB, сохраняет `store:false`, использует image token preflight allowance и FX compatibility fallback.
6. `lib/ai/openaiClient.ts` передаёт image в Responses API как `input_image` + data URL, `detail=low`.
7. `src/app/api/ai-billing/balance/route.ts` использует тот же FX compatibility rule для отображения model pricing availability.
8. Выполнить `node scripts/validate-ai-right-rail-multimodal-activity-v1.mjs`, `npm run build`, `git diff --check`.
9. Live acceptance: free chat text, free chat photo, voice dictation, past activity, future activity, retry network simulation, manual scroll-up/new-message behavior, mobile 3-button geometry, desktop segmented switch, ru/pl/en/es/uk/de/cs labels.
10. DB postcheck после past write: capture пишет activity/review marker, facts at capture = 0; после future write событие присутствует в calendar path и не дублируется при retry.

#### AI RIGHT RAIL V4 ESLint gate
При восстановлении/повторном релизе сначала выполнить changed-file ESLint. Для `global-ai-navigator.tsx` не должно быть `react-hooks/set-state-in-effect`, `react-hooks/exhaustive-deps` и unused-symbol warnings, которые были зафиксированы V3. V3 не изменил production: rollback PASS, исходный baseline — `f0595a0d...`.


#### AI RIGHT RAIL V5 — activity image evidence / review price recovery
1. Baseline до V5: `2edd9026bd0d4e7764993d92c28ae30384fce01f`.
2. Фото должно быть доступно в `past`, `future`, `chat`; MIME JPEG/PNG/WebP, max 3 MiB.
3. `POST /api/activity/quick-capture` поддерживает JSON без фото и multipart/form-data с полем `image`.
4. Activity photo binary хранится только в private bucket `activity-evidence-media-v1`; metadata содержит reference + SHA256, не data URL/public URL.
5. Semantic review повторно проверяет ownership path, MIME, size и SHA256 перед `input_image`. Image-derived numeric measurements остаются запрещены.
6. Если budget RPC возвращает `PRICE_SNAPSHOT_STALE`, разрешён только exact standard/gpt-5.4-mini refresh в пределах server verification lease. После `2026-08-26T23:59:59.999Z` он обязан fail-closed до обновления catalog verification.
7. Live acceptance: past+photo блюда; future+photo графика; image-only past; retry idempotency; private bucket not public; semantic review sees image; no facts at capture; stale price path создаёт не более одного актуального newest price row на retry operation; `npm run lint -- --max-warnings=0` и `npm run build` PASS.

### AI RIGHT RAIL V6 — восстановление
1. Требуемый baseline для применения V6 patch: `062b22afe2c7250e8ec69383394b994763524e99`, clean `main`, `HEAD == origin/main`.
2. Проверить `POST /api/activity/quick-capture`: raw activity создаётся сразу, response содержит `backgroundSemanticReview=scheduled`, factsWrittenAtCapture=0; background worker запускается через Next.js `after()`.
3. Открыть ту же запись сразу после capture. Если draft уже готов, `/api/activity/review-analysis` должен вернуть cached draft; если ещё нет — пользователь видит progress/skeleton, а не пустой экран. Параллельный insert `23505` должен reuse winning draft.
4. Проверить right rail: narrow desktop — 3 icon-only mode buttons с title/aria-label; mobile drawer — icon+label; mobile floating buttons остаются прежними корпоративными иконками.
5. Проверить `/api/ai/model-catalog`: Luna/Terra/Sol, pro reasoning=max. Первый chat call каждого tier может versioned-upgrade price snapshot/default model в пределах verification lease. После expiry missing catalog обязан fail-closed.
6. Прогнать `npm run lint -- --max-warnings=0` по изменённым TS/TSX, затем полный `npm run build`, `git diff --check`, staged allowlist, commit/push verification.
7. Canonical leaf/candidate routing не проверять как acceptance V6: этот слой сознательно не изменён.

### AI RIGHT RAIL V7 — TypeScript hotfix / восстановление
1. Baseline: `062b22afe2c7250e8ec69383394b994763524e99`, clean `main`, `HEAD == origin/main`.
2. Исторический V6 release attempt с `2026-08-19T15:48+02:00` считать FAIL-before-commit: build TypeScript остановился на неизвестном JSON-поле `activityEventIds`; rollback PASS.
3. В `src/app/api/activity/quick-capture/route.ts` `readReviewFirstReceipt()` обязан возвращать `primaryActivityEventId: string | null`, вычисленный после `Array.isArray(result.activityEventIds)`. Duplicate branch не должен индексировать `existing.result.activityEventIds`.
4. После применения прогнать validator V7, ESLint `--max-warnings=0`, полный `npm run build`, `git diff --check`, staged allowlist и только затем commit/push.
5. Live acceptance остаётся V6: immediate raw save + background review, staged progress, icon-only narrow desktop modes, Luna/Terra/Sol selector. Canonical leaf routing не менять.

### AI RIGHT RAIL V8 — model selector hotfix / восстановление
1. Baseline: clean `main == origin/main == 062b22afe2c7250e8ec69383394b994763524e99`.
2. V7 attempt at 2026-08-19 16:16+02:00 is FAIL-before-commit: Next TypeScript rejected `tier.code`; rollback PASS.
3. Apply cumulative V8 patch. The model selector must use only `tier.tierCode`; `tier.code` is forbidden by validator.
4. Run V8 validator, ESLint `--max-warnings=0`, full `npm run build`, `git diff --check`, staged allowlist and only then commit/push.
5. Functional live acceptance remains V6: immediate raw save + background review, staged progress, icon-only narrow desktop modes, Luna/Terra/Sol selector. Canonical leaf routing remains deferred.


## HELP + FILES SYSTEM V1 — восстановление

1. Восстановить Git checkpoint, содержащий `supabase/manual-applied/20260820_help_files_system_v1.sql`.
2. Проверить migration history и наличие `platform_help_content_current`, `platform_help_content_history`, `upsert_platform_help_content_v1(...)`.
3. Проверить RLS, отсутствие прямых прав anon/authenticated и service-role server boundary.
4. Запустить `node scripts/generate-help-registry-v1.mjs`; повторная генерация должна быть deterministic.
5. Проверить `/api/admin/navigation`: normal user не получает admin navigation; owner/admin/viewer получает visibility.
6. Проверить `/uploaded-files`: private activity image не раскрывает storage path; `/api/uploaded-files/open?signalId=...` работает только для владельца и сверяет SHA-256.
7. Проверить `/admin/help-system`: viewer read-only, owner/admin edit.
8. Сохранить один WHAT/WHY блок: current revision должна содержать ВСЕ ru/pl/en/es/uk/de/cs, а source locale должна совпасть с введенным текстом дословно.
9. Отредактировать тот же блок в другой locale: revision увеличивается, ВСЕ 7 translations создаются заново. Это ожидаемое поведение.
10. Проверить user page: `i` существует только при WHAT, `?` только при WHY; desktop popover/mobile bottom sheet используют текущую locale.


### 11. HELP V1 additional acceptance
- Открыть хотя бы одну dynamic user route (например route с `[id]`) и проверить, что заполненные `i/?` markers находятся возле правильных элементов.
- Вставка несвязанного heading перед существующим не должна менять persisted helpKey существующего heading после повторной генерации registry.
- Два последовательных сохранения одного блока из разных locale должны дать revision N и N+1; второе сохранение заново заменяет все 7 translations.
- Имя private uploaded file с Unicode должно открываться/скачиваться через owner-guarded endpoint без раскрытия bucket/path.
### HELP + FILES V1 — manual SQL + read-only code release
1. Не использовать `supabase db push` для HELP/FILES на текущем checkout: V2 dry-run доказал, что remote migration history не совпадает с большим историческим набором локальных migrations.
2. Выполнить `supabase/manual-applied/20260820_help_files_system_v1.sql` вручную в Supabase SQL Editor. Скрипт additive/idempotent и завершает выполнение собственным postcheck.
3. После SQL запустить code release V3. До source mutation он обязан выполнить read-only DB contract preflight через существующие `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.
4. Preflight проверяет чтение обеих help tables и существование RPC безопасным invalid-input вызовом, который должен вернуть `HELP_KEY_REQUIRED` и не создавать строк.
5. Если DB contract не подтверждён — code release останавливается до patch. Если подтверждён — validator, ESLint, full build, diff gates, commit/push.
6. Не добавлять HELP/FILES SQL обратно в `supabase/migrations`, пока отдельная migration-history reconciliation не будет спроектирована и принята.


### HELP + FILES V1 — восстановление после V3 lint rollback
1. Проверить code baseline `10d6bab82cecd2abcfcebd8ead3279d79a2f799a`, если V4 ещё не released.
2. НЕ повторять HELP SQL автоматически: сначала read-only проверить `platform_help_content_current`, `platform_help_content_history` и `upsert_platform_help_content_v1`; 20.08.2026 manual SQL уже дал PASS.
3. V3 code attempt считать не released: ESLint остановил его до build/commit/push, `ROLLBACK=PASS`.
4. V4 сохраняет `eslint --max-warnings=0` и должен проходить changed-file lint без legacy navigation warnings.


### HELP + FILES V1 — восстановление после V4 build rollback
1. Code baseline до V5 release: `10d6bab82cecd2abcfcebd8ead3279d79a2f799a`; HELP DB schema уже применена вручную и повторного SQL не требует.
2. V4 считать FAIL-before-commit: DB preflight/validator/ESLint прошли, `next build` остановился на relative import depth двух uploaded-files API routes, rollback PASS.
3. В `src/app/api/uploaded-files/route.ts` root-lib imports должны быть `../../../../lib/...`.
4. В `src/app/api/uploaded-files/open/route.ts` root-lib imports должны быть `../../../../../lib/...`.
5. V5 обязан пройти import-depth validator, ESLint `--max-warnings=0`, полный `npm run build`, `git diff --check`, staged allowlist и только затем commit/push.
