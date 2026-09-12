# ARCTor — Целевые ОН в Конструкторе последствий + curator relation guard hotfix V1

Дата: 2026-09-12
Baseline: main @ 7fdcc9f752c63a0042c052e1562a9d8b95b794e8
Release: ARCTOR_CONSEQUENCE_TARGETS_AND_RELATION_GUARD_HOTFIX_V1_20260912

## Причина
- После успешного запуска общего «Конструктора связей» runtime-тест показал `RELATION_CONSTRUCTOR_NODE_ROLE_GUARD_REJECTED` при попытке вручную связать листовой ОН с промежуточным ОН.
- Для общего ручного curator-слоя эта структурная блокировка противоречит назначению конструктора: куратор должен иметь возможность зафиксировать смысловую связь между любыми двумя активными системными ОН и обосновать её комментарием.
- «Конструктор последствий» всё ещё показывал статически заблокированное поле целевого ОН, хотя общий слой связей уже реализован.

## Решение
- В `/api/admin/relation-constructor` facet/node-role ограничения реестра переводятся из hard-block в advisory evidence: curator manual relation больше не отклоняется только из-за структурной роли или ветви. Результат совместимости сохраняется в rationale log как `registryCompatibility`.
- Сохраняются обязательные ограничения: оба ОН должны быть активными global system objects, вид связи должен быть active + `canonical_write_policy_code=enabled`, self-link запрещён.
- В `/admin/consequence-constructor` разблокирован поиск целевого ОН.
- Кандидаты строятся только из активных `system_value_object_relations`, связанных с исходным ОН.
- Для выбора результата допускаются только листовые global system ОН.
- Для сужения списка учитываются связи в обе стороны: на этом этапе связь используется как доказательство связанности, а направление вычислительного последствия будет задаваться уже правилом формулы.
- Выбор целевого ОН разрешён только после привязки задания к конкретной типовой активности.
- Выбор записывается append-oriented событием `consequence_constructor_target_selected` в `activity_processing_logs` с `activityTemplateId`, source/target, параметром и relation evidence.
- Для одной исходной пары можно добавить несколько целевых ОН.
- Формулы и результирующие факты этим релизом не создаются.

## Семантическая граница
Общая связь ОН остаётся глобальной и нужна для карты/сужения кандидатов. Выбор целевого ОН уже контекстный: он фиксируется в рамках конкретной типовой активности и конкретной пары `parameter + source leaf`. Следующий этап должен определить целевой параметр, входные состояния и формулу результирующего факта.

## Acceptance
- validator PASS 23/23;
- targeted ESLint PASS;
- TypeScript `tsc --noEmit` PASS;
- production build PASS;
- recovery integrity PASS;
- `git diff --check` PASS;
- clean commit + push;
- curator relation больше не блокируется node-role/facet guard;
- target search в Consequence Constructor активен;
- показываются только связанные листовые ОН;
- выбор target хранится в контексте типовой активности;
- несколько targets поддерживаются;
- formula write отсутствует.
