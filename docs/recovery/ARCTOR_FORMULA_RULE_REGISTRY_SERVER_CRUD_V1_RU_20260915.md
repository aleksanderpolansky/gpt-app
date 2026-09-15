# ARCTOR Formula Rule Registry — Server CRUD V1

Дата: 2026-09-15
Baseline: `f17dac3843e81acbc18daf19c4944d1721829b0e`

## Цель

Добавить первый безопасный server CRUD для уже установленного production Formula Rule Registry, не включая исполнение формул и запись фактов.

## Изменения

Добавлены:

- `src/lib/reality-curator/formula-rule-registry.server.ts`
- `src/app/api/admin/formula-rules/route.ts`

Server layer умеет:

- читать серии и их версии;
- создавать новую серию + версию `draft`;
- обновлять только `draft/testing` version;
- проверять UUID, scope-owner shape, rule code, input keys, trigger vocabulary, result role, missing-input policy и закрытый `arctor_formula_v1` AST;
- при ошибке создания первой версии удалить только что созданную пустую series, чтобы не оставлять частичный объект.

Admin API:

- `GET /api/admin/formula-rules`
- `POST action=create_draft`
- `POST action=update_draft`

Маршрут доступен только через `requirePlatformAdmin()`.

## Что намеренно НЕ включено

- publish;
- formula executor;
- result/snapshot fact write;
- lineage write;
- recalculation queue;
- UI;
- изменение Supabase schema;
- изменение Target Standards V2.

API явно возвращает:

- `publishEnabled=false`
- `formulaExecutionEnabled=false`
- `factWriteEnabled=false`

## Причина узкого этапа

Сначала требуется доказать, что новый реестр можно безопасно читать и наполнять draft-правилами. Подключение к «Конструктору последствий» должно использовать этот server layer, а не писать в таблицы напрямую.

## Проверки

Launcher обязан выполнить:

- exact baseline;
- clean worktree;
- staged exact-file allowlist;
- `npx eslint` для двух новых TypeScript файлов;
- `npx tsc --noEmit`;
- production `npm run build`;
- `git diff --cached --check`;
- commit;
- push;
- remote `main` SHA verification.

## Точка продолжения

Следующий gate:

1. добавить выбор target parameter в «Конструктор последствий»;
2. после source ON + source parameter + target ON + target parameter создавать draft rule через server layer;
3. показать draft rule в карточке задачи;
4. затем отдельный publish/test gate;
5. только после publish — deterministic executor.
