# ARCTOR_FORMULA_RULE_REGISTRY_FOUNDATION_V1_0_2

Дата: 2026-09-15
Базовый commit до изменения: b0f5493792059a7cbff9324b31048eb190115e6e

## Цель

Закрыть прямую проверку пары пользователь/актор для пользовательских формул и исправить ложную классификацию успешного git push в Windows PowerShell 5.1.

## Фактическая причина V1.0.2

V1.0.1 уже проверяет владельца, когда пользовательская формула использует приватный ОН или приватный параметр. Но при формуле, которая использует только системную типовую активность, глобальные ОН и системные параметры, пара owner_user_id / owner_actor_id не имела отдельной прямой проверки.

Канонический actor-context приложения определяет принадлежность актора пользователю через actor_public_profiles:
- actor_public_profiles.owner_user_id = app user;
- actor_public_profiles.actor_id = actor;
- actor должен быть active;
- personal profile соответствует actor_type=person;
- avatar profile соответствует actor_type=avatar.

V1.0.2 зеркалирует именно этот уже действующий контракт на уровне DB guard.

## Изменения

- добавлена новая additive migration:
  `supabase/migrations/20260915102000_formula_rule_registry_v1_0_2_owner_guard.sql`;
- историческая migration V1 `20260914190000_formula_rule_registry_v1.sql` не переписывается;
- перед INSERT/UPDATE user-scoped rule DB требует существующий принадлежащий пользователю personal/avatar profile и активного совместимого actor;
- upgrade preflight также отклоняет уже существующую неверную user/actor пару;
- system и organization scope этим hotfix не меняются.

## Git push launcher

V1.0.1 создал commit и фактически успешно отправил его в GitHub, однако Windows PowerShell 5.1 при `$ErrorActionPreference=Stop` интерпретировал обычный stderr git push (`To https://...`) как NativeCommandError.

Launcher V1.0.2:
- временно переводит обработку native stderr в Continue;
- принимает решение об успехе только по `$LASTEXITCODE`;
- после push отдельно проверяет `refs/heads/main` через `git ls-remote`;
- не откатывает commit автоматически после его создания.

## Что НЕ меняется

- формулы ещё не исполняются;
- `activity_object_facts` не изменяется;
- `activity_fact_derivation_inputs_v1` не изменяется;
- `activity_fact_recalculation_queue` не изменяется;
- Target Standards V2 не изменяется;
- coefficient rules не возвращаются;
- production Supabase migration launcher автоматически не применяет.

## Проверки релиза

До commit выполняются:
- exact baseline + clean worktree;
- контроль неизменности blob исторической V1 migration;
- сверка actor ownership с текущим `lib/actor-context.ts`;
- статические SQL invariants;
- запрет DML в facts/recalculation queue;
- `npx tsc --noEmit`;
- production `npm run build`;
- `git diff --check`;
- exact changed-file allowlist.

После push:
- exit code git push должен быть 0;
- `git ls-remote origin refs/heads/main` должен вернуть новый commit.

## Точка продолжения

После V1.0.2 следующий отдельный gate:
1. контролируемое применение Formula Rule Registry migrations в production Supabase;
2. read-only post-migration verification;
3. затем server CRUD series/version и подключение draft rule к «Конструктору последствий»;
4. только после этого deterministic executor, result/snapshot и lineage.
