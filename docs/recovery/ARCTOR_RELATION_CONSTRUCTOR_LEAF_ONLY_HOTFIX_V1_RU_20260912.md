# ARCTor — Relation Constructor Leaf-Only Hotfix V1

Дата: 2026-09-12
Baseline: main @ b6d1f3f889f20389f0b3def2fab6bd6a587bb639
Release: ARCTOR_RELATION_CONSTRUCTOR_LEAF_ONLY_HOTFIX_V1_20260912

## Причина
- Runtime-тест подтвердил, что DB guard `SYSTEM_RELATION_NODE_ROLE_GUARD_REJECTED` работает корректно: попытка связать листовой ОН с промежуточным ОН должна блокироваться.
- Уточнено архитектурное правило: и исходный, и целевой объект в ручном «Конструкторе связей» должны быть только листовыми ОН.
- Предыдущий hotfix снял application-level facet/node-role hard guard для curator manual relation, но сам DB guard не удалялся.

## Решение
- DB guard сохраняется без изменений.
- Каталог `/api/admin/relation-constructor` теперь возвращает только активные global system ОН с `node_role_code=leaf`.
- Поэтому и поле «Исходный объект наблюдения», и поле «Объект наблюдения, с которым создаётся связь» показывают только листовые ОН.
- Сервер дополнительно проверяет оба endpoint независимо от UI: crafted/manual API request с root/intermediate ОН отклоняется как `RELATION_CONSTRUCTOR_SOURCE_NOT_LEAF` или `RELATION_CONSTRUCTOR_TARGET_NOT_LEAF`.
- Закрытый реестр видов связи, запрет self-link и DB-level guards сохраняются.
- Конструктор последствий не меняется: его target-кандидаты уже ограничены связанными листовыми ОН.
- Формулы/результирующие факты не затрагиваются.

## Acceptance
- validator PASS 8/8;
- targeted ESLint PASS;
- TypeScript `tsc --noEmit` PASS;
- production build PASS;
- recovery integrity PASS;
- `git diff --check` PASS;
- clean commit + push;
- source relation picker = leaf only;
- target relation picker = leaf only;
- direct API request with non-leaf endpoint rejected;
- DB node-role guard remains in place.
