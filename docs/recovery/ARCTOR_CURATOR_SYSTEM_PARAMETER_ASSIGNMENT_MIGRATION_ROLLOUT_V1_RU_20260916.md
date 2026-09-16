# ARCTOR System Parameter Assignment Migration Rollout V1

Дата: 2026-09-16
Исходный кодовый baseline: `2bed60d532ab50790892c95b1b4fd9c633c13cc0`

## Что проверено

Migration `20260916123000_curator_system_parameter_assignment_v1.sql` применена вручную через SQL Editor / эквивалентный административный SQL-канал.

Postcheck выполнялся только чтением и намеренным вызовом RPC с невалидными пустыми аргументами. Ожидаемый guard `ARCTOR_SYSTEM_PARAMETER_ASSIGNMENT_ARGUMENTS_INVALID` подтверждает, что функция существует и validation выполняется до любых записей.

## Evidence

`
MigrationState=APPLIED_VERIFIED
ScopeColumnAccessible=YES
RpcGuardReachable=YES
ActorAssignments=0
SystemAssignments=0
DbWriteExecutedByProbe=NO
`

## Зафиксированные свойства production

- `value_object_parameter_assignments.scope_code` доступен;
- RPC `save_system_value_object_parameter_assignment_set_v1` доступен service-role backend;
- guard не допускает пустой/невалидный запрос;
- postcheck сам не создавал assignments и не писал activity facts;
- formula execution, result/snapshot writes и lineage writes этим rollout не включались.

## Что ещё НЕ проверено

Реальная запись системного assignment ещё не выполнялась этим postcheck.

Следующий smoke:

1. в Кураторе модели взять параметр с уже назначенным листовым ОН;
2. подтвердить «Все ОН этого параметра назначены»;
3. убедиться, что UI завершает mapping без ошибки;
4. read-only проверить появившийся `scope_code=system` assignment;
5. после этого переходить к материализации системной типовой активности.

## Ограничение

Supabase migration history этим этапом не нормализуется и не подделывается. `db push` не выполнялся.
