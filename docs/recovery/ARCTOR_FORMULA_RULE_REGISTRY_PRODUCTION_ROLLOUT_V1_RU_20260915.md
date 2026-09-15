# ARCTOR Formula Rule Registry — production rollout V1

Дата: 2026-09-15
Baseline перед фиксацией: `cc3be578195e0eb3bbc0842746f6cb1acec2801e`

## Что было применено в production Supabase вручную

Через Supabase SQL Editor последовательно и успешно выполнены:

1. `supabase/migrations/20260914190000_formula_rule_registry_v1.sql`
2. `supabase/migrations/20260915102000_formula_rule_registry_v1_0_2_owner_guard.sql`

Обе транзакции завершились `Success. No rows returned`.

## Проверка до установки

Read-only preflight подтвердил:

- базовые таблицы `activity_templates`, `activity_template_impact_profiles_v1`, `value_objects`, `value_object_parameter_definitions`, `value_object_parameter_assignments`, `app_users`, `actors`, `organizations`, `actor_public_profiles` существуют;
- Formula Rule Registry до rollout отсутствовал;
- необходимые колонки ontology/scope/actor ownership присутствуют.

## Проверка после V1

После первой миграции подтверждены:

- `activity_fact_calculation_rule_series_v1`;
- `activity_fact_calculation_rule_versions_v1`;
- `activity_fact_calculation_rules_published_v1`;
- `enforce_activity_fact_calculation_rule_series_v1()`;
- `enforce_activity_fact_calculation_rule_version_v1()`;
- `series_rows = 0`;
- `version_rows = 0`.

## Проверка после V1.0.2

Подтверждены:

- `enforce_activity_fact_calculation_rule_user_owner_v1_0_2()`;
- trigger `afcrs_v1_user_owner_guard_v1_0_2_trg`;
- `series_rows = 0`;
- `version_rows = 0`.

## Итоговая production verification

Итоговый read-only запрос вернул `true` для всех проверок:

- обе таблицы реестра существуют;
- published view существует;
- три guard function существуют;
- три guard trigger существуют;
- RLS включён на обеих таблицах;
- deny-policy для прямого доступа существует на обеих таблицах.

Счётчики:

- `series_rows = 0`;
- `version_rows = 0`;
- `published_rows = 0`.

Следовательно, production foundation установлен, но ни одного реального расчётного правила ещё не создано и ни один факт не изменён.

## Supabase migration history

Попытка прочитать `supabase_migrations.schema_migrations` вернула:

`ERROR 42P01: relation "supabase_migrations.schema_migrations" does not exist`.

Локально каталог `supabase/migrations` содержит много исторических migration-файлов.

Принятое решение:

- НЕ создавать `supabase_migrations.schema_migrations` вручную;
- НЕ отмечать только две новые миграции как applied;
- НЕ запускать `db push` до отдельного bootstrap/reconciliation migration-history этапа;
- текущий rollout считать ручным SQL rollout с доказательством через post-install verification и recovery log.

Причина: частичная remote history только для двух новых миграций может привести к ошибочной попытке повторно применить более старые локальные migration-файлы.

## Ошибки checkpoint launcher и уроки

`CHECKPOINT_V1` был остановлен staged `git diff --check` из-за trailing whitespace в recovery-тексте. Commit не создавался.

`CHECKPOINT_V1_0_1` был остановлен до изменения файлов с `Argument types do not match`: Windows PowerShell 5.1 не принял generic List/PSCustomObject конструкцию в parser-е `git status`.

`CHECKPOINT_V1_0_2` прошёл baseline, clean worktree и проверку generated text, затем остановился с `The regular expression pattern \ is not valid`. Причина — применение regex `-replace` к одиночному обратному слешу при нормализации пути. Rollback завершился `PASS`.

`CHECKPOINT_V1_0_3`:
- не использует generic List;
- не использует regex для нормализации путей;
- использует literal `.Replace('\', '/')`;
- требует clean worktree;
- проверяет exact staged-file set;
- сохраняет native exit-code + remote-main verification.

## Текущий архитектурный статус

Formula Rule Registry foundation физически существует в production и поддерживает:

- `system`, `user`, `organization` scope;
- versioned calculation-rule contracts;
- controlled `arctor_formula_v1`;
- published projection;
- RLS и server-only access;
- user/actor ownership guard;
- системные и пользовательские/private semantic addresses.

Формулы пока НЕ исполняются.

## Точка продолжения

Следующий этап разработки:

1. server CRUD для rule series/version;
2. подключение draft rule к «Конструктору последствий»;
3. curator flow выбора target parameter и построения formula contract;
4. затем deterministic executor;
5. затем запись `result/snapshot`, lineage и подключение существующей recalculation queue.

Bootstrap Supabase CLI migration history — отдельная инфраструктурная задача и не должна блокировать дальнейшую разработку Formula Runtime.
