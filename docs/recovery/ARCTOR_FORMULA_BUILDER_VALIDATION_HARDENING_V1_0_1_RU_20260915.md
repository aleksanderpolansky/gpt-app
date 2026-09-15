# ARCTOR Formula Builder — Validation Hardening V1.0.1

Дата: 2026-09-15
Baseline: `f2fcbc64d83296de532db2a3e8e1219e576bb497`

## Причина отдельного hotfix

Validation API V1 успешно прошёл ESLint, TypeScript и production build, но после commit был выполнен дополнительный ручной review границы HTTP JSON -> TypeScript.

Обнаружено, что API route приводит JSON body к TypeScript-типу. Следовательно, одних compile-time типов недостаточно: произвольный HTTP JSON должен быть повторно проверен runtime-validator.

До V1.0.1:

- expression использовался как типизированный AST без отдельного root structural guard;
- input selector проверял key, но не проверял runtime enum для kind/window/selection;
- optional UUID input fields не проверялись в builder layer;
- condition позволял дополнительные неиспользуемые поля;
- subtract/divide допускали более двух аргументов.

## Исправление

V1.0.1 добавляет:

- `isFormulaExpressionNodeV1()` root structural guard;
- structural guard для condition expression;
- condition shape: только `{}` или `{ expression: AST }`;
- UUID runtime validation для `ruleVersionId`;
- строгий input-key contract;
- runtime enum validation:
  - kind;
  - window;
  - selection;
- runtime UUID validation selector-ов;
- runtime boolean validation `required`;
- `subtract` и `divide` теперь требуют ровно два аргумента.

## Что не меняется

- Formula Builder API action остаётся `configure_draft`;
- publish выключен;
- executor выключен;
- fact write выключен;
- Supabase schema не меняется;
- полная unit algebra по-прежнему отдельный gate до publish/executor.

## Проверки

Launcher выполняет:

- exact baseline;
- clean worktree;
- exact patch markers;
- ESLint builder server;
- `tsc --noEmit`;
- production build;
- staged allowlist;
- `git diff --cached --check`;
- commit/push;
- remote SHA verification.

## Точка продолжения

После этого hotfix можно безопасно переходить к Formula Builder UI V1.
