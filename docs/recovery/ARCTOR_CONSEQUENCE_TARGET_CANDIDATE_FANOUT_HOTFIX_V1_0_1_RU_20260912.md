# ARCTor — Consequence Target Candidate Fan-out Hotfix V1.0.1

Дата: 2026-09-12
Baseline: main @ 1649b57f8859d48438fc6d3a4df471f7b1ae9776
Release: ARCTOR_CONSEQUENCE_TARGET_CANDIDATE_FANOUT_HOTFIX_V1_0_1_20260912

## Симптом
После успешного создания активной общей связи leaf → leaf связь была видна на `/admin/relations`, но в «Конструкторе последствий» для соответствующего исходного ОН продолжало отображаться состояние «Нет связанных листовых ОН».

Runtime пример:
- исходный ОН: «Подтягивание средним хватом»;
- активная связь существует с «Потребность в силовой нагрузке»;
- target-кандидат не отображался.

## Причина
`buildTargetCandidates()` строил общий список `sourceIds` сразу для всех заданий конструктора и затем удалял из набора связанных endpoint ID любой ID, который встречался как source хотя бы в одном другом задании:

`filter((id) => !sourceIds.includes(id))`

Это ошибочно. Один и тот же листовой ОН может быть исходным в одном consequence-task и одновременно допустимым целевым ОН для другого consequence-task.

Таким образом, валидный target исчезал глобально только потому, что где-то ещё использовался как source.

## Ошибка первой попытки V1
Первая попытка релиза остановилась только на validator после трёх успешных проверок. Причина — дефект самого validator: он искал буквальную последовательность `\\n` вместо реального переноса строки между `if (...) {` и присваиванием `targetId`. Source rollback был выполнен, поэтому baseline не изменился. V1.0.1 меняет только validator на whitespace-tolerant regex; production-код hotfix остаётся тем же.

## Исправление
- Убрано глобальное исключение всех `sourceIds`.
- Для загрузки карточек кандидатов берётся полный union endpoint ID всех найденных активных связей.
- Выбор второго конца связи по-прежнему выполняется отдельно для каждого конкретного `sourceId`.
- Поэтому ОН может одновременно быть source в одном task и target в другом task.
- Incoming и outgoing общие связи по-прежнему учитываются как evidence связанности.
- Кандидаты по-прежнему только `global + system_model + active + ontology_node_role_code=leaf`.
- Возможность выбора target до типовой активности сохраняется.
- Удалённые/inactive связи по-прежнему не дают кандидатов.
- Формулы и результирующие факты не затрагиваются.

## Acceptance
- validator PASS 9/9;
- targeted ESLint PASS;
- TypeScript `tsc --noEmit` PASS;
- production build PASS;
- recovery integrity PASS;
- `git diff --check` PASS;
- clean commit + push;
- target ОН не исключается из-за того, что он source другого consequence-task;
- active leaf relation становится видимой в target picker без обязательной типовой активности.
