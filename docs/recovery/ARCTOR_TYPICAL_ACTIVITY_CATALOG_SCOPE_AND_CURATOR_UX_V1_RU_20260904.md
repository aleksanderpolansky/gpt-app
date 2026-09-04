# ARCTOR — SYSTEM TYPICAL ACTIVITY CATALOG + CURATOR UX V1
Дата: 2026-09-04

## Baseline
- Baseline до патча: `12a479b336a377a3ae7e52d31bbb50147a9e6675`.
- Code commit: `e54b51670637108179f5dcec6861825d13b3c486`.
- Recovery commit: текущий commit после отдельного docs/recovery commit.

## Что исправлено
1. Куратор и basic-intake AI используют один общий server-каталог системных типовых активностей.
2. Каталог определяется не по названию и не по `template_group`, а явным metadata-contract:
   `arctorTypicalActivity.kind=typical_activity`, `scope=system`, `catalogVersion=reality_model_v1`.
3. Исторические system seeds и commercial workflow templates не считаются типовыми активностями только потому, что находятся в `activity_templates`.
4. AI-кандидат допускается только при активном impact-profile и при том, что все связанные ОН имеют `scope_code=global`.
5. Технические идентификаторы сигнала в UI куратора объединены в свернутый по умолчанию блок `Технические детали`.
6. История событий находится в свернутом по умолчанию блоке `События`; блоки и вложенные события сортируются от новых к старым с детерминированным tie-break.
7. Кнопка уточнена до `Показать существующие типовые активности`.

## Архитектурное решение
### Типовые активности
- Текущий поддерживаемый scope: `system`.
- System typical activity — глобальная сущность, создаваемая/утверждаемая куратором и доступная анализу всех пользователей.
- Она может ссылаться только на системные/глобальные ОН.
- Будущий `private/user` scope допустим как отдельное расширение, но не является частью текущего runtime.

### Commercial
- `Confirmed purchase`, `Confirmed sale`, `Gift certificate` — не typical activities.
- Это специальные commercial workflow/activity templates и они не участвуют в semantic matching типовых активностей.
- Для Value Objects коммерческий слой уже имеет `usage_scope=commercial`; это характеристика использования, а не жесткий подтип.
- Для товаров/услуг дополнительно существует `commercial_usage` (`catalog_info`, `certificate_base`, `both`).
- Сертификат/суперпредложение создается как отдельная плановая `activity_event` на базе product/service VO.
- Подтверждение внешней покупки — отдельный organization-level amount-based workflow; оно не превращается в каталог typical activities.

## Почему старые записи были видны
- `German marketing handwriting practice` был system seed миграции 013.
- `AI Navigator manual activity` — generic system seed отдельной миграции single-entry AI composer.
- `Confirmed purchase`/`Confirmed sale` — system workflow templates CRB1.
- `Gift certificate` — system workflow template PGC3B.
- Поэтому фильтр только по `template_scope=system` был семантически недостаточным.

## Live evidence предыдущего этапа
- fallback retry: `подтянулся 10 раз`.
- outstanding activities: 5 -> 4.
- curator queue: 3 -> 4.
- model unavailable: 0.
- analysis mode: `nano_model`.
- единицы: `10 повт.` / `20 повт.`.
- provenance: добавление 13:26, AI 15:22, передача в очередь 15:22.

## Что намеренно НЕ делаем
- Не удаляем и не переименовываем старые commercial/system templates.
- Не меняем работающие purchase/certificate workflows.
- Не создаем SQL migration в этом патче.
- Не делаем автоматическую переклассификацию старых записей по названиям.
- Не реализуем private typical activities.
- Авторинг/создание новой system typical activity куратором будет подключен к этому metadata-contract на соответствующем следующем шаге конструктора.

## История release-runner
### V1 — FAIL до commit/push
- Запуск `ARCTOR_TYPICAL_ACTIVITY_CATALOG_SCOPE_AND_CURATOR_UX_V1` дошёл до dedicated validator и ESLint без регрессии, затем остановился на TypeScript.
- Ошибка: `SystemTypicalActivityCatalogRow.updated_at` был ошибочно объявлен как `string | null`, тогда как существующий analyzer contract `TemplateRow.updated_at` требует `string`.
- Фактическая колонка `activity_templates.updated_at` в исходной схеме объявлена `timestamptz not null`, поэтому nullable-тип в новом shared loader был ложным расширением контракта.
- Runner выполнил rollback к baseline; worktree после rollback чистый. Commit/push, SQL/DB mutation и OpenAI-вызовов не было.

### V1.0.1 — исправление
- `SystemTypicalActivityCatalogRow.updated_at` приведён к `string`.
- Loader fail-closed проверяет непустой `updated_at` и только после проверки возвращает строку.
- Dedicated validator дополнительно фиксирует этот контракт.
- Остальная функциональная семантика V1 не изменена.

## Проверки release-gate
- canonical baseline blobs;
- patcher self-test;
- dedicated validator;
- touched/new ESLint;
- full ESLint no-regression;
- TypeScript `--noEmit`;
- Next production build;
- `git diff --check`;
- exact changed-file allowlist;
- separate recovery commit;
- push + remote verification;
- clean worktree.
