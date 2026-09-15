# ARCTOR Consequence Constructor — Formula Draft API V1

Дата: 2026-09-15
Baseline: `284b6a5d172160bcd25ae2d0ea27a49c28707b97`

## Цель

Подключить текущий «Конструктор последствий» к уже установленному Formula Rule Registry на серверном уровне.

## Что теперь отдаёт GET `/api/admin/consequence-constructor`

Для каждого уже выбранного целевого ОН дополнительно возвращаются:

- активный `parameter_registry_v2` profile типовой активности;
- признак присутствия исходного параметра в этом профиле;
- активные системные параметры, реально назначенные целевому ОН;
- readiness создания draft;
- уже существующие rules для того же semantic address.

## Новый POST action

`create_formula_draft`

Требует:

- task;
- уже выбранный target ON;
- target parameter;
- связанную системную типовую активность;
- active `parameter_registry_v2` profile;
- исходный параметр в active profile;
- active system target parameter, назначенный target ON.

## Семантическая идентичность и идемпотентность

Canonical `rule_code` строится из:

- template;
- source ON;
- source parameter;
- target ON;
- target parameter.

Workflow task id в canonical identity не входит и хранится только как provenance.

Повтор той же semantic-комбинации возвращает существующую series.

## Draft-заглушка

Математическое выражение пока не задаётся.

Draft создаётся с:

- `expression = { op: "literal", value: null }`;
- `draftIncomplete = true`;
- `placeholderExpression = true`;
- `draftState = awaiting_formula`;
- provisional `resultFactRole = result`.

Publish/executor/fact write остаются выключенными.

## Ошибка первого launcher и исправление V1.0.1

Первый `ARCTOR_CONSEQUENCE_FORMULA_DRAFT_API_V1` был остановлен до изменения проекта с
`PATCH_MARKER_NOT_FOUND_IMPORT`.

Причина: launcher сравнивал многострочные patch-маркеры побайтно, а TypeScript-файл
в рабочем дереве использовал LF, тогда как PowerShell launcher был сохранён с CRLF.

Rollback завершился `PASS`, commit не создавался.

V1.0.1 нормализует переводы строк только для операции точного patch-match.
Содержимое маркеров и правило `exactly once` сохранены.

После исправления patch-match V1.0.1 успешно прошёл ESLint, TypeScript и production build,
но staged `git diff --check` остановил commit из-за `new blank line at EOF` в
`src/app/api/admin/consequence-constructor/route.ts`.

Причина: `Set-Content` добавил собственный перевод строки к уже завершённому переводом
строк сгенерированному содержимому.

Rollback снова завершился `PASS`, commit не создавался.

V1.0.2:
- пишет новые и изменяемые текстовые файлы через `WriteAllText`;
- использует UTF-8 без BOM для TypeScript/recovery-файлов;
- нормализует содержимое в LF;
- гарантирует ровно один перевод строки в конце файла;
- отдельно проверяет отсутствие второй пустой строки в EOF до `git add`.

## Изменения

Добавлен:

- `src/lib/reality-curator/consequence-formula-draft.server.ts`

Изменён:

- `src/app/api/admin/consequence-constructor/route.ts`

SQL schema не меняется.

## Следующая точка

Следующий отдельный gate — UI конструктора:

- показать target parameter selector;
- показать readiness;
- кнопка создания draft;
- показать уже созданный draft.

После UI — Formula Builder V1 и только затем test/publish.
