# ARCTor Snapshot Any State Leaf V1 — DB Rollout

Дата: 2026-09-27
Code baseline before commit: `main @ 3abc43ff1961acd0224b856e257afbfd5777ac3c`

## Production migration

Migration:

`supabase/migrations/20260926215000_snapshot_personal_state_leaf_parameter_v1.sql`

была вручную выполнена в production Supabase через SQL Editor.

## Post-install verification

Read-only postcheck подтвердил:

- `guard_exists = true`;
- comment функции содержит marker
  `ARCTOR_SNAPSHOT_PERSONAL_STATE_LEAF_PARAMETER_V1`.

Фактический comment:

`Fact ownership/leaf/parameter guard. ARCTOR_SNAPSHOT_PERSONAL_STATE_LEAF_PARAMETER_V1 additionally permits user-confirmed point-in-time snapshots on GLOBAL States & Needs leaves with an active SYSTEM numeric parameter and no global assignment.`

## Статус

`MigrationState=APPLIED_VERIFIED`

Этот postcheck:
- не создавал snapshot;
- не создавал system parameter assignment;
- не менял facts;
- не запускал formula executor.

## Архитектурная граница

Direct personal snapshot разрешён только для user-confirmed point-in-time
snapshot на active GLOBAL system-model leaf корня States & Needs с active
SYSTEM numeric parameter. Exact global ON ↔ parameter assignment может
отсутствовать.

Все остальные обычные GLOBAL facts продолжают требовать SYSTEM assignment.

## Следующий smoke после code publish

`Текущая масса сахара на чашку кофе`
→ `Масса`
→ `5 gram`
→ `Сохранить факт-срез`.
