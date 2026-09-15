# ARCTOR_FORMULA_RULE_REGISTRY_FOUNDATION_V1_0_1

Дата: 2026-09-14
Базовый commit до изменения: `06881dc12ed2617e8896fd46dedf25d382fad138`

## Цель

Создать канонический версионируемый реестр формул/правил расчёта, не смешивая его со значениями фактов и не возвращая старый механизм мутации фактов коэффициентами.

## Зафиксированное решение

1. Один реестр поддерживает три области: `system`, `user`, `organization`.
2. Системное правило работает с системной типовой активностью, глобальными листовыми ОН и системными параметрами.
3. Пользовательское правило может использовать системную или приватную типовую активность; глобальные ОН или приватные actor-scoped ОН владельца; системные или приватные параметры владельца.
4. Приватное правило не изменяет глобальную модель. Оно существует отдельной серией/версией.
5. `parallel` означает независимое правило. `replace_base` явно ссылается на базовую серию. `protected` запрещает такое замещение.
6. Организационная область заложена структурно. На V1 она допускает системную/организационную типовую активность, но только глобальные ОН и системные параметры. Приватная семантика организации — отдельный будущий gate после контракта полномочий организации.
7. Формула хранится как закрытый JSON-AST `arctor_formula_v1`; произвольный JavaScript/SQL/код запрещён.
8. Значения остаются в `activity_object_facts`. Эта миграция не создаёт новый storage состояний.
9. Существующая `activity_fact_recalculation_queue` не заменяется и не дублируется.
10. Исполнитель формул, запись result/snapshot, lineage, идемпотентность исполнения, нормативы и UI — следующие отдельные этапы.

## Изменения

- `supabase/migrations/20260914190000_formula_rule_registry_v1.sql`
  - `activity_fact_calculation_rule_series_v1`
  - `activity_fact_calculation_rule_versions_v1`
  - `activity_fact_calculation_rules_published_v1`
  - DB guards области/владельца/leaf/parameter_registry_v2/version lifecycle
  - закрытый доступ для anon/authenticated; server/service_role only
- `src/lib/reality-curator/formula-rule-registry.contract.ts`
  - типы scope/status/result role
  - закрытый словарь операций
  - структурная проверка AST без eval
- `docs/recovery/ARCTOR_CURRENT_STATE_RU.md`
  - добавлена точка текущего состояния и продолжения.

## Что намеренно НЕ сделано

- нет исполнения формул;
- нет записи/изменения фактов;
- нет изменения `activity_fact_derivation_inputs_v1`;
- нет новой очереди пересчёта;
- нет подключения старых coefficient rules;
- нет изменения Target Standards V2;
- нет UI для пользователя/куратора;
- migration не применяется к production автоматически этим скриптом.

## Исправление V1.0.1

Первый launcher V1 завершился на этапе разбора PowerShell до выполнения тела скрипта: UTF-8 без BOM в Windows PowerShell 5.1 дал повреждённое отображение кириллицы, а Markdown-backticks находились внутри интерполируемых here-string. Изменений проекта этот запуск не выполнил.

V1.0.1:
- сохранён как UTF-8 with BOM для Windows PowerShell 5.1;
- recovery/current-state шаблоны переведены в literal here-string + явную замену placeholder;
- локальной проверкой TypeScript найден и исправлен narrowing `digits: unknown`;
- усилены DB guards: immutable semantic identity серии, active profile, обязательное назначение параметра конкретному ОН и совпадение semantic address при `replace_base`.

## Проверки релиза

Скрипт релиза обязан выполнить до commit/push:

- baseline + clean worktree;
- статические invariants SQL/контракта;
- ESLint для нового TS-контракта;
- `npx tsc --noEmit`;
- production `npm run build` (если не задан `-SkipBuild`);
- `git diff --check`;
- контроль списка изменённых файлов.

## Точка продолжения

Следующий gate: безопасный server CRUD для series/version + подключение текущего «Конструктора последствий» к созданию draft rule после выбора целевого ОН и целевого параметра. После этого — deterministic executor, запись `result/snapshot` и lineage через существующие таблицы фактов.
