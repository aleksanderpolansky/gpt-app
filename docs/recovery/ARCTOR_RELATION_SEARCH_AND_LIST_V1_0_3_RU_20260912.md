# ARCTor — Поиск ОН в конструкторе связей + список связей V1

Дата: 2026-09-12
Baseline: main @ 4e8d1a99cca08fb73a7bb428909f74071eb3d74a
Release: ARCTOR_RELATION_SEARCH_AND_LIST_V1_0_3_20260912

## Что изменено
- Предыдущий runner V1 от 2026-09-12 12:50 прошёл recovery-integrity и validator 22/22, но targeted ESLint остановил релиз на `react-hooks/set-state-in-effect` в новой странице `/admin/relations`: эффект вызывал `load()`, внутри которой выполнялся `setRelations`. Commit/push не выполнялись; failure path запустил rollback к baseline.
- Runner V1_0_1 от 2026-09-12 12:52 остановился ещё раньше на `RELATIONS_NAV_LABEL_ANCHOR_NOT_FOUND`. Причина: navigation patcher искал LF-only многострочный anchor в Windows checkout с CRLF. Commit/push не выполнялись; failure path снова запустил rollback к baseline.
- Runner V1_0_2 от 2026-09-12 13:00 прошёл navigation patcher, recovery-integrity, validator 22/22 и targeted ESLint, но TypeScript остановил релиз: новый `/api/admin/relations/route.ts` импортировал Supabase через `../../../../lib/supabase`, тогда как соседний рабочий `/api/admin/relation-constructor/route.ts` на той же глубине использует `../../../../../lib/supabase`. Commit/push не выполнялись; failure path снова запустил rollback к baseline.
- V1_0_3 сохраняет исправления React lifecycle и EOL-safe navigation patcher, исправляет Supabase import path и добавляет отдельную validator-проверку этого пути до TypeScript gate.
- В «Конструкторе связей» поля 1 и 2 переведены с обычного select на тот же поисковый combobox, который используется при выборе родителя ОН.
- При фокусе показывается список ОН; одновременно можно печатать текст и фильтровать по названию, описанию, английскому названию/описанию и canonical key.
- Переход «Карта связей ОН → + Добавить связь» теперь гарантированно подставляет исходный ОН после загрузки каталога, а не полагается на client-state initializer во время hydration.
- Вид связи остаётся закрытым выпадающим списком системного реестра типов связей.
- Создана новая административная страница `/admin/relations` — список общих связей ОН.
- В левом меню пункт «Связи» размещён непосредственно под «Конструктором последствий».
- На странице списка есть кнопка «+ Добавить связь», поиск по объектам/типу/комментарию и ссылки на обе карточки ОН.
- Список читает `system_value_object_relations`; последний комментарий куратора подтягивается из существующего append-oriented `activity_processing_logs`.
- Формулы, типовые активности и результирующие факты этим релизом не изменяются.
- SQL schema change не требуется.

## Архитектурная граница
Общая связь ОН остаётся независимой от типовой активности. Страница списка и карта показывают сам факт смысловой связи. Применимость этой связи в конкретной типовой активности будет определяться следующим этапом в «Конструкторе последствий».

## Acceptance
- validator PASS 23/23;
- targeted ESLint PASS;
- TypeScript `tsc --noEmit` PASS;
- production build PASS;
- recovery integrity PASS;
- `git diff --check` PASS;
- clean commit + push;
- оба поля выбора ОН поддерживают поиск и выпадающий список;
- sourceValueObjectId из URL подставляется после загрузки каталога;
- `/admin/relations` доступен из меню под Конструктором последствий;
- на списке есть кнопка «Добавить связь».
