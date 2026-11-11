# ARCTor M-0110 / ARI-03.03.07 — legacy API compatibility and feature flag

## Цель
Сверить действующий GET `src/app/api/admin/ontology-research/context/route.ts` со стабильным интерфейсом исследовательского конструктора (q, locale, ontology, templates, diagnostics, warnings, частичное покрытие). Проверить по фактическому локальному коду, что отдельный POST `src/app/api/value-objects/indexed-lookup/route.ts` закрыт по умолчанию переключателем `ARCTOR_ON_INDEXED_LOOKUP_V1` и не подменяет legacy-выдачу.

## Допускаемое изменение
Только тест `scripts/tests/ari03-m0110-legacy-contract-flag.test.cjs`, отчёт и документация в `docs/ari/03/lexical_retrieval/`, приватные доказательства в `docs/recovery/ARI_MASTER/03/`.

**Никаких изменений `src/`, существующих API, Supabase, флагов окружения, Git remote, commit/push/deploy, использования OpenAI API.** Отклонения в runtime-схеме из статических проверок не считаются доказанными; реальные запросы пользователей и RLS не тестируются.

## Проверки
28 статических проверок *исходников рабочего репозитория* и повторный запуск 160 регрессионных тестов M-0104—M-0109, 0 FAIL, 0 SKIP. Дополнительно — TypeScript strict noEmit для лексического модуля, проверка текущего Git SHA, SHA-256 приватного ledger, хешей предыдущих тестов, целостность нового ZIP.

## Техническая граница
Feature flag уже существует в отдельном indexed-lookup API, его не создаём заново. **Это source-contract safety gate, не endpoint E2E и не введение поиска в эксплуатацию.** При выявлении несоответствия не меняем старый API автоматически: остановка, диагностический ZIP, отдельное исправление с управляемой приёмкой.

После подтверждённого запуска: 108/615 принято, 2 WAIVED, 505 PENDING; следующий M-0111 / ARI-03.04.01.
