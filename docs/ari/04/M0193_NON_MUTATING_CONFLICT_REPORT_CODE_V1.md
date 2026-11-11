# M-0193 / ARI-04.06.07 — Non-mutating conflict report (CODE, локально)

**Точная задача мастер-плана:** «Подготовить non-mutating conflict report со связанными evidence refs».

## Изменение

Новый чистый модуль `src/lib/ontology/nonMutatingConflictReportV1.ts` вызывает принятый `detectContradictionsV1` и собирает объяснимый структурированный отчет без записи в граф, API, БД или журнал.

- Сохраняет исходные `code`, `BLOCK/REVIEW`, `relatedAssertionIds`, `evidenceRefs`, `explanation`, `witnessPath`.
- Связывает каждый `evidenceRef` **только** с переданными вызывающей стороной метаданными `sourceUri`, `sourceVersion`, `author`, `sourceDate`, `claim`, `locator`.
- Отмечает отсутствующую метаинформацию как `UNRESOLVED_REF`; не придумывает ссылки, источники, авторов и цитаты.
- Любая переданная метаинформация помечается `CALLER_PROVIDED_UNVERIFIED`, даже если она формально полная. Ее достоверность не проверяется.
- Некорректные или дублирующиеся записи evidence metadata приводят к `BLOCKED`, `complete=false`, без молчаливого пропуска.
- Возвращает счетчики `blockFindings`, `reviewFindings`, `unresolvedEvidenceRefs`; не выдаёт отсутствие обнаруженных конфликтов за доказанное отсутствие противоречий вне ограниченного контекста.
- Сохраняет `globalAbsenceEstablished=false`, `writesPerformed=0`, `approvesRelation=false`, `verifiesSource=false`, `runtimeIntegrated=false`.

## Требования к вызывающему коду

`scan` должен включать **только** разрешённый пользователю bounded набор, прошедший RLS/ownership и scope-проверки. Этот локальный модуль не авторизует доступ. `snapshotId` — это метка, а не доказательство полноты/целостности снимка. `sourceUri` передается без сетевого получения страницы, проверки подлинности или семантической верификации. Следует экранировать строки при отображении в UI.

## Не входит в M-0193

- Внесение изменений в существующий `contradictionDetectorV1.ts` и другие принятые M-0187–M-0192 файлы.
- Создание нового SQL, RPC, GraphQL/REST endpoint, Supabase миграций, записей в production.
- Подтверждение научной истинности причинной связи, разрешение promote, детерминированный графовый read API, нагрузочные/e2e/SEC-06 отрицательные runtime-тесты.

## Проверки

`node scripts/ari/ontologyNonMutatingConflictReportV1.test.mjs`: 72 сценария + 40 инвариантов, строгая TS-проверка и повторные тесты предшественников M-0187–M-0192.

**Приёмка:** только локальный CODE-модуль. Само применение не переводит M-0193 в ACCEPTED. Отдельное подтверждение владельца и доказательства необходимы, `SEC-06 OPEN_BLOCKER`, release `BLOCKED`.

## Комплект тестирования

В ZIP содержится неизменённая read-only копия принятого M-0189 `contradictionDetectorV1.ts`, **только** для проверки TypeScript внешнего нового модуля до его установки. Это reference file с закреплённым SHA-256; установщик никогда не устанавливает и не перезаписывает его в рабочем репозитории.
