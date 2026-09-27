# Recovery — ARCTOR_SNAPSHOT_ANY_STATE_LEAF_V1_PATCH_FIX1_20260927

Дата: 2026-09-26
Baseline: `main @ 3abc43ff1961acd0224b856e257afbfd5777ac3c`

## Решение

1. Snapshot — только для leaf ОН ветви States & Needs.
2. Ссылка создания snapshot доступна любому авторизованному пользователю.
3. Любой пользователь может выбрать любой active GLOBAL system-model state leaf.
4. Пользователь выбирает existing SYSTEM numeric parameter.
5. Если exact pair не имеет SYSTEM assignment, пользователь всё равно может
   сохранить личный snapshot.
6. Обычный пользователь не создаёт глобальный assignment.
7. Platform admin может материализовать missing SYSTEM assignment inline.

## Почему нужен DB migration

Текущий `enforce_activity_fact_actor_alignment_v2()` требует для любого
обычного GLOBAL fact одновременно `parameter_definition_id` и
`parameter_assignment_id`.

Без изменения DB guard API/UI alone недостаточны.

Новый migration вводит узкое исключение только для подтверждённых пользователем
personal snapshots в States & Needs.

## Files

Modified tracked:
- `src/app/activity-facts/snapshot/page.tsx`
- `src/app/api/activity/facts/snapshots/route.ts`

Added:
- `supabase/migrations/20260926215000_snapshot_personal_state_leaf_parameter_v1.sql`
- `scripts/validate-snapshot-any-state-leaf-v1.mjs`
- `docs/architecture/snapshot-any-state-leaf-v1.md`
- `docs/recovery/ARCTOR_SNAPSHOT_ANY_STATE_LEAF_V1_PATCH_FIX1_20260927.md`

## Installer gates

- exact branch/main + exact HEAD;
- clean staged/tracked preflight;
- preserve all pre-existing untracked;
- backup modified tracked;
- rollback on any failure;
- dedicated validator;
- scoped ESLint;
- TypeScript;
- git diff --check;
- production build;
- exact tracked/new-file allowlists.

## Installer side effects

DB_WRITES=0
SQL_EXECUTED=0
COMMIT=false
PUSH=false
DEPLOY=false

## Next controlled step after PASS

Apply `supabase/migrations/20260926215000_snapshot_personal_state_leaf_parameter_v1.sql` through the normal migration
procedure, verify the DB guard, then commit+push code+migration and smoke:

`Текущая масса сахара на чашку кофе` → `Масса` → `5 gram`.

## FIX1 — 2026-09-27

Предыдущий PATCH остановился на dedicated validator после 18 успешных
проверок. Причина была только в ошибочном контрольном выражении validator:
оно запрещало строку `calculation_rule_code:` во всём snapshots route, хотя
эта строка уже существует в штатной записи snapshot и устанавливает значение
`null`.

Фактический продуктовый patch на этом шаге не был признан ошибочным:
предыдущий installer выполнил rollback полностью.

FIX1 заменяет только ложноположительную проверку validator двумя точными:
- personal snapshot submit не вызывает admin materialization action;
- запись snapshot сохраняет `calculation_rule_code` и
  `calculation_rule_version` равными `null`.

Продуктовые изменения, миграция, baseline и safety gates не изменены.
