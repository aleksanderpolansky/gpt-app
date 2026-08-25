# ARCTOR — PLATFORM LOCALIZATION / VALUE OBJECT ON-DEMAND V1

Дата: 2026-08-25

## Точка восстановления до исходной интеграции

Git baseline:

`d8d0f40c71339c62c2dbadeb3e008ca72b8dd036`

Commit baseline:

`value-object-egress-locale-source-integration-v1`

## Доказанный фундамент БД

Перед этим исходным этапом production-проверки универсального слоя локализации дали:

- foundation postcheck: 36/36 PASS;
- ACL hotfix postcheck: 8/8 PASS;
- boolean hotfix postcheck V2: 10/10 PASS;
- runtime fixture: 20/20 PASS;
- persistentFixtureRows: 0.

Следовательно DB-контракт считается доказанным до начала source integration.

## Решение

Пользовательский контент больше не должен переводиться заранее на все семь языков.

Для actor-owned Value Object / Observation Object применяется:

1. канонический исходный текст остаётся в `value_objects`;
2. язык исходника определяется по уже существующему `localizedContent` envelope;
3. source revision каждого поля регистрируется лениво через
   `register_platform_localization_source_v1`;
4. запрашивается состояние только текущего языка через
   `get_platform_localization_batch_v1`;
5. если перевод текущего языка отсутствует/устарел и не защищён человеком,
   ИИ генерирует только этот target locale;
6. результат сохраняется через `upsert_platform_localized_content_v1`;
7. следующие открытия используют сохранённый свежий вариант без нового AI-вызова;
8. legacy human locale из metadata_json не перезаписывается ИИ: он
   импортируется как `human_locked + needs_review`;
9. GLOBAL System локализация остаётся отдельным механизмом и этим этапом
   не изменяется;
10. P2C ontology-definition editor route этим этапом не изменяется.

## Поверхности первого потребителя

- `/api/value-objects?locale=...` — каталог actor-owned объектов;
- `/value-objects/[id]?locale=...` — карточка actor-owned объекта;
- actor-owned дерево внутри карточки — пакетная локализация title.

## Ограничения V1

- Старые actor-owned объекты без корректного `localizedContent` envelope
  не переводятся автоматически: язык исходника не угадывается.
- Это намеренный fail-safe. Они продолжают отображаться через существующий
  fallback, а их источник можно нормализовать отдельным контролируемым этапом.
- Первый этап не подключает enterprises/offers/certificates/help к новому
  runtime. Они будут следующими потребителями уже доказанного общего слоя.

## Критерии закрытия source release

Этап закрывается только если release report подтверждает:

- точный baseline;
- чистый Git до изменений;
- marker-safe patch;
- собственный validator PASS;
- TypeScript PASS;
- ESLint changed paths PASS без warnings;
- существующий Value Object egress validator PASS;
- branch-driven leaf validator PASS;
- VO mind-map readonly validator PASS;
- `npm run build` PASS;
- `git diff --check` PASS;
- staged allowlist exact;
- commit PASS;
- push PASS;
- remote SHA = local SHA;
- финальный Git clean.

Финальный commit SHA находится в release REPORT.txt.


## Попытка source launcher V8 — 2026-08-25

Production evidence:

- baseline local/remote: `d8d0f40c71339c62c2dbadeb3e008ca72b8dd036`;
- Git before patch: CLEAN;
- package SHA: PASS;
- patcher: PASS;
- changed-file allowlist: PASS;
- release validator: 24/24 PASS;
- `npx tsc --noEmit`: PASS;
- ESLint changed paths with `--max-warnings=0`: PASS;
- legacy egress validator: 32/34, only checks 18 and 31 failed;
- rollback: PASS;
- final Git after rollback: CLEAN.

Два FAIL старого egress validator являются устаревшими проверками формы:

1. `18_recovery_evidence_placeholder_present`: CLOSED recovery предыдущего
   релиза уже содержит заполненный Evidence и правильно не содержит package-time
   placeholder.
2. `31_actor_catalog_rpc_row_explicitly_typed`: старый validator требует одну
   историческую строку исходного кода. Новый source integration сохраняет явную
   типизацию через `ownedRows: Array<Record<string, unknown>>` и typed callback;
   production `tsc --noEmit` уже прошёл.

Следующая ревизия не отключает прежний validator. Она разрешает только эти два
точно доказанных устаревших FAIL и оставляет остальные 32 проверки блокирующими.


## Попытка source launcher V9 — 2026-08-25

Production evidence:

- baseline local/remote: `d8d0f40c71339c62c2dbadeb3e008ca72b8dd036`;
- Git до изменений: CLEAN;
- package SHA: PASS;
- patcher: PASS;
- changed-file allowlist: PASS;
- current localization validator: 24/24 PASS;
- strict legacy egress compatibility gate: PASS;
- branch-driven leaf regression: 32/32 PASS;
- Mind Map V0 historical validator: 49/53, четыре FAIL;
- rollback до commit: PASS;
- Git после rollback: CLEAN.

Четыре FAIL V0:

- `MAP_READ_ONLY_DRAG`;
- `MAP_NO_WRITE_FETCH`;
- `MAP_NO_MUTATION_HTTP`;
- `MAP_DETERMINISTIC_LAYOUT`.

Это не регрессия локализации. V0 validator проверяет историческую read-only карту.
Позднее уже CLOSED/PASS этапы намеренно изменили именно эти четыре свойства:

- Mind Map V1 добавил controlled authoring и guarded Delete;
- V1.1 добавил draggable controlled reparent через существующие preview/apply;
- V1.1 сменил layout на top-to-bottom;
- V1.2 добавил inline fast authoring через существующий POST `/api/value-objects`.

Следующая ревизия не игнорирует Mind Map regression. Она:
1. блокирующе запускает текущие `validate-vo-mind-map-v1-1-controlled-reparent.mjs`
   и `validate-vo-mind-map-v1-2-fast-authoring.mjs`;
2. старый V0 запускает диагностически, но требует ровно тот же набор четырёх
   устаревших FAIL и summary 53/49/4;
3. любой дополнительный FAIL или изменение baseline blob остаётся блокирующим.
