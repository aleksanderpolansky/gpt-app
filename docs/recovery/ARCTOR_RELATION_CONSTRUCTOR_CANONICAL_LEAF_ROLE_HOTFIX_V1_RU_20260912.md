# ARCTor — Canonical Leaf Role Hotfix для Конструктора связей V1

Дата: 2026-09-12
Baseline: main @ fdd08f7e29152a3a779eba7daf278b5bf8930382
Release: ARCTOR_RELATION_CONSTRUCTOR_CANONICAL_LEAF_ROLE_HOTFIX_V1_20260912

## Симптом
После успешного релиза leaf-only фильтра «Конструктор связей» показывал 0 объектов наблюдения, хотя листовые ОН в системе существуют.

## Причина
В leaf-only hotfix фильтр был ошибочно наложен на `value_objects.node_role_code = 'leaf'`.
В текущем Reality Curator структурная роль онтологического узла хранится и используется как `ontology_node_role_code` (`root | intermediate | leaf`).
Поэтому запрос к каталогу отфильтровал все реальные листовые ОН.

## Исправление
- DB guard `SYSTEM_RELATION_NODE_ROLE_GUARD_REJECTED` НЕ меняется.
- Каталог relation-constructor фильтруется по `ontology_node_role_code = 'leaf'`.
- Endpoint server guard проверяет `ontology_node_role_code`.
- UI metadata `nodeRoleCode` получает значение из `ontology_node_role_code`.
- Compatibility snapshot также читает каноническую онтологическую роль.
- `node_role_code` не удаляется из select/type, чтобы не ломать legacy/auxiliary compatibility, но больше не является источником истины для структурной роли.
- Исходный и целевой ОН по-прежнему обязаны быть листовыми.
- SQL schema, формулы и consequence runtime не меняются.

## Acceptance
- validator PASS 10/10;
- targeted ESLint PASS;
- TypeScript `tsc --noEmit` PASS;
- production build PASS;
- recovery integrity PASS;
- `git diff --check` PASS;
- clean commit + push;
- relation-constructor catalog uses canonical `ontology_node_role_code=leaf`;
- DB node-role guard remains unchanged.
