# ARCTor — Activity Template Admin + Parameter Catalog V1 — Recovery

Дата: 2026-08-26
Release: `ARCTOR_ACTIVITY_TEMPLATE_ADMIN_PARAMETER_CATALOG_V1`
Baseline: `main @ 8861df910d8234048ebef0ef49553482050b06e0`

## Точка до релиза

`ARCTOR_ACTIVITY_TEMPLATE_AUTHORING_V2_COMPACT_V1_1` уже перевёл редактор типовых активностей на V2 parameter registry: без пользовательской категории, без `process_count`, с UUID parameter definitions, leaf-only прямыми parameter targets и EVENT_LINK fallback.

Focused intake `ARCTOR_ACTIVITY_TEMPLATE_ADMIN_PARAMETER_INTAKE_V1` подтвердил clean baseline, V2 RPC и `value_object_parameter_definitions`. Source и DB при intake не менялись.

## Решение этого релиза

1. `/activity-templates` становится внутренней административной поверхностью. Серверная страница и все API редактора требуют `requirePlatformAdmin()` с default roles `owner|admin`.
2. Обычный пользователь больше не видит «Типовые активности» в журнале активностей. Ссылка показывается в административной части Dashboard только при `canEdit=true` из `/api/admin/navigation`.
3. На той же странице добавлен административный «Каталог параметров» для SYSTEM parameter definitions.
4. Создание параметра не требует ручного `parameter_code`: код генерируется из названия, нормализуется в lowercase ASCII, проверяется на коллизии среди всех system definitions и после создания считается immutable.
5. Физическая schema не меняется. CRUD использует существующую `value_object_parameter_definitions` и её DB guards. SQL/migration в релизе нет.
6. Фактически обнаруженный DB invariant: semantic rewrite использованного parameter definition запрещён trigger `enforce_value_object_parameter_definition_v3`. UI/API дополнительно считают definition использованным также при ссылке из `activity_template_profile_parameters_v2`. Для использованного параметра доступны только activation/deactivation; для нового смысла создаётся новый parameter definition.
7. «Деактивация» UI соответствует существующему storage status `retired`; физического DELETE нет.
8. Системные seeded parameter titles получают presentation-localization для `EN/PL/RU/UK/DE/ES/CS`; raw canonical code остаётся стабильным. Единицы получают пользовательские presentation labels вместо raw unit codes.
9. VO selector остаётся leaf-only для прямой привязки. Если leaf не найден, выполняется read-only diagnostic lookup `level=all`; найденные root/intermediate показываются как информационные карточки без возможности добавить их как direct target.

## Файлы

Изменены:
- `src/app/activity-templates/page.tsx`
- `src/app/activity-templates/activity-template-impact-profile-editor.tsx`
- `src/app/api/activity-template-impact-profiles/route.ts`
- `src/app/api/activity-template-impact-profiles/catalog/route.ts`
- `src/app/api/activity-template-impact-profiles/[id]/route.ts`
- `src/components/app-shell/global-navigation.tsx`

Добавлены:
- `src/app/activity-templates/activity-parameter-admin-catalog.tsx`
- `src/app/api/admin/activity-parameter-definitions/route.ts`
- `src/lib/activity/activity-parameter-presentation.ts`
- `scripts/validate-activity-template-admin-parameter-catalog-v1.mjs`
- этот recovery checkpoint.

## Safety / acceptance

Release launcher обязан до commit/push пройти exact baseline guards, read-only DB OpenAPI preflight, release validator, changed-files ESLint, full TypeScript, full Next build, lint no-regression, `git diff --check`, exact dirty/staged file set и remote verify. При ошибке до подтверждённого push выполняется возврат к baseline.

DB writes релиз не выполняет. DB write появляется только позже при явном действии администратора в production UI каталога параметров.

## Следующая точка

После PASS/deploy:
1. открыть `/activity-templates` под owner/admin;
2. проверить отсутствие ссылки и direct URL access у обычного пользователя;
3. проверить PL/UK/RU presentation существующих параметров;
4. создать тестовый parameter definition через UI, проверить auto-generated immutable code, edit до использования, activation/deactivation;
5. только затем создать реальную типовую активность «Обед», выбрать параметры и leaf ЦО/ОН, сохранить, открыть заново и выполнить read-only V2 DB postcheck.

## Validation correction after first release attempts

Release attempts V1-V1_3 did not commit or push changes. The first three failures were launcher-only guards (Git LF/CRLF diagnostics, raw working-tree hash vs Git content, and `git cat-file` missing-path exit 128). V1_3 then reached the real changed-files ESLint gate and correctly stopped on two `react-hooks/set-state-in-effect` errors before TypeScript/build/commit.

Source correction for the next launcher:
- initial parameter-catalog load now runs inside an async effect task, matching the already accepted async-load pattern in the template editor;
- short VO search no longer synchronously clears state inside the effect; clearing remains in the input/change/reset/add-object paths, while the effect simply returns for queries shorter than two characters.

The product contract, DB contract, admin guards, localization contract, V2 routing semantics and changed-file scope are otherwise unchanged. Full acceptance still requires changed-files ESLint, full TypeScript, full Next build, lint no-regression, diff/staged checks and confirmed push.

## V1_4 validation result

`V1_4` подтвердил сам source release значительно глубже предыдущих запусков:

- baseline Git-content guards — PASS;
- DB read-only preflight — PASS;
- release validator — PASS;
- changed-files ESLint — PASS;
- full TypeScript — PASS;
- full Next build — PASS;
- `git diff --check` до staging — PASS;
- post-release ESLint no-regression — PASS;
- exact staged file set — PASS.

Commit/push не выполнялись: финальный `git diff --cached --check` остановил релиз только на форматировании этого нового recovery-файла — две строки с trailing whitespace и лишняя пустая строка в EOF. Source-код приложения при этом уже прошёл все перечисленные code/build gates.

`V1_5` меняет только форматирование recovery checkpoint и добавляет ранний payload-whitespace preflight в launcher, чтобы trailing whitespace/extra blank EOF больше не обнаруживались после нескольких минут build-проверок.
