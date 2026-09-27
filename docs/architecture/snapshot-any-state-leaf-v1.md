# ARCTor Snapshot — Any State Leaf V1

Дата: 2026-09-26
Baseline: `main @ 3abc43ff1961acd0224b856e257afbfd5777ac3c`

## Зафиксированная логика

Факт-срез относится только к ветви **«Состояния и потребности»**.

Любой авторизованный пользователь может создать персональный факт-срез для
любого активного системного листового ОН этой ветви.

Пользователь:
1. выбирает листовой ОН состояния;
2. выбирает существующий системный числовой параметр;
3. выбирает допустимую единицу;
4. вводит значение и effective_at;
5. сохраняет персональный snapshot.

Для создания snapshot больше не требуется, чтобы exact pair
`value_object ↔ parameter` уже была глобальным SYSTEM assignment.

Это **не создаёт системное назначение** от имени обычного пользователя.

## Администратор

Если выбранная пара ещё не имеет SYSTEM assignment, platform admin может
прямо на той же странице нажать **«Сделать системным назначением»**.

Для этого используется уже существующий guarded materializer
`materializeSystemParameterAssignmentsV1`.

После materialization snapshot можно сохранить обычным assignment-based
путём.

## Database guard

Существующий DB guard запрещает GLOBAL facts без SYSTEM assignment.
Поэтому добавляется узкое исключение:

- только `fact_role_code = snapshot`;
- только measure-less/activity-less point-in-time user-confirmed snapshot;
- только GLOBAL active system-model LEAF;
- только root `States & Needs`;
- только active SYSTEM numeric parameter;
- parameter assignment должен быть NULL;
- metadata marker:
  `snapshotCaptureV1.selectionMode = direct_state_leaf_parameter_v1`;
- measure_type обязан совпадать с parameter_code;
- unit обязан входить в allowed_unit_codes.

Все остальные GLOBAL facts продолжают требовать SYSTEM assignment.

## Link access

Ссылка `/activity-facts/snapshot` уже находится на общей странице Facts без
admin gate. Patch её не ограничивает и не переносит.

## Scope текущего PATCH

Изменяются:
- `src/app/activity-facts/snapshot/page.tsx`;
- `src/app/api/activity/facts/snapshots/route.ts`.

Добавляются:
- `supabase/migrations/20260926215000_snapshot_personal_state_leaf_parameter_v1.sql`;
- validator;
- architecture note;
- recovery checkpoint.

Сам patch installer:
- БД не меняет;
- SQL не выполняет;
- commit/push/deploy не делает.

Миграция должна быть применена отдельным контролируемым шагом до production
smoke direct-personal snapshot.
