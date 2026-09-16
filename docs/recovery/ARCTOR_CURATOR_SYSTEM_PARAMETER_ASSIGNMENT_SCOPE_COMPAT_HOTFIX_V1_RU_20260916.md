# ARCTor Curator System Parameter Assignment Scope Compatibility Hotfix V1

Дата: 2026-09-16

Исходный baseline:
\$ExpectedHead\

## Причина

Первый реальный smoke:

\Duration -> Stair ascent\

дошёл до действия:

\confirm_measurable_object_mapping_set\

и вызвал существующий:

\save_system_value_object_parameter_assignment_set_v1\.

RPC завершился PostgreSQL ошибкой:

\23514 value_object_parameter_assignments_scope_shape_gsr1_check\.

## Установленная первопричина

В таблице одновременно существуют два поколения scope-контракта:

1. GSR1: \ssignment_scope_code\;
2. новый curator assignment V1: \scope_code\.

Новый RPC записывал:

\scope_code = system\

но не задавал \ssignment_scope_code\.

По legacy default старое поле становилось:

\ssignment_scope_code = actor\.

При ownerless system row старый GSR1 CHECK корректно отклонял INSERT.

Пробный RPC выполнялся внутри rollback-subtransaction, поэтому постоянной
assignment-строки после диагностики нет.

## Исправление

Migration:

\20260916203000_curator_system_parameter_assignment_scope_compat_v1.sql\

делает два scope-поля compatibility pair:

- значения обязаны совпадать;
- системный RPC пишет одновременно
  \ssignment_scope_code=system\
  и \scope_code=system\;
- actor legacy path сохраняется;
- old GSR1 ownership-shape guard не отключается;
- новый owner-shape guard не ослабляется.

## UI

В confirmed-ветке конструктора параметров теперь отображается ошибка POST.
Ранее ошибка сохранялась в state, но соответствующая JSX-ветка её не показывала.

## Не изменяется

- activity facts;
- source/result/snapshot facts;
- activity templates;
- formula registry;
- formula execution;
- historical facts;
- existing ON;
- существующие parameter mappings.

## Acceptance

После ручного применения migration:

1. повторить кнопку «Все ОН этого параметра назначены» для Duration;
2. system assignment должен сохраниться;
3. mapping-set confirmation должен записаться только после assignment;
4. UI должен автоматически перейти к Count;
5. выполнить Count -> One-storey stair ascent;
6. после второго подтверждения оба параметра должны иметь mappingCompleted=true.

## Следующая точка

После PASS двух прямых mappings:

- E01 source mappings закрыт для лестничного пилота;
- следующий кодовый этап — материализация ownerless system typical activity
  «Подъём по лестнице» и её versioned parameter/profile contract
  из curator journey;
- после этого — runtime activity -> source facts.

Этап не считать закрытым без актуального recovery checkpoint.