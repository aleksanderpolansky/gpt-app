# ARCTOR_TABLE_VIEWS_T1_3_READABILITY_HOTFIX_V1 — recovery checkpoint

Дата: 2026-08-28

## 1. Baseline

- Ветка: `main`.
- Обязательный исходный HEAD: `f0ca8bcfb785592375972913567b30d2661603e5`.
- Предыдущий релиз `ARCTOR_TABLE_VIEWS_T1_2_LAYOUT_UX_HOTFIX_V1` завершился `RESULT=PASS`, commit/push/remote verify/worktree clean.
- `tabulator-tables` остаётся строго `6.5.2`; зависимость и package lock этим hotfix не меняются.

## 2. Причина hotfix

Production visual postcheck T1_2 подтвердил, что горизонтальный overflow устранён и все три Tabulator-таблицы помещаются в рабочую область при открытом AI-Navigator. После этого стали видны проблемы второго уровня — читаемость и избыточная техническая информация:

1. `/activity-today`: длинные значения `Basic analysis ...`, составной technical status `completed / actual` и колонка `Source` съедают место; пользователь видит обрезанные технические строки вместо короткого состояния.
2. `/activity-facts`: `measure_type`, `unit`, `source_type` показываются внутренними codes (`duration`, `count`, `user_edit`, `ai_extraction`); если effective leaf-link отсутствует, UI показывает `semantic_object_key`, но визуально не объясняет, что это fallback, а не реально связанный объект наблюдения.
3. `/value-objects`: колонка Parent дублирует визуальную иерархию Data Tree и отнимает ширину; Description и числовые колонки конкурируют за место, поэтому заголовки счётчиков обрезаются.
4. Ellipsis есть, но ключевые текстовые колонки не везде включают Tabulator tooltip для полного значения.

## 3. Решение

### 3.1. Activity Journal

- Основной table surface остаётся read-only.
- Колонки: When / Activity / Activity time / Duration / Analysis / Status.
- `Source` сохраняется в row model, но скрывается из основного table surface (`visible: false`); technical source остаётся доступен через существующие детали записи.
- Analysis получает короткие локализованные состояния: Ready / Running / Retry и эквиваленты для `pl/ru/uk/de/es/cs`.
- Status получает короткие пользовательские состояния: Completed / Planned / Deleted / Archived / Active / Updated / Restored и локализованные эквиваленты.
- Хранимые `status`, `activityRoleCode`, `source` и API contracts не меняются.
- Для текстовых колонок включён `tooltip: true`, чтобы ellipsis не скрывал полное значение.

### 3.2. Activity Facts

- Сами факты, effective links и tagging contract не меняются.
- Для отображения локализуются известные технические codes:
  - measure type: `duration`, `count`, `context_tag`;
  - common units: minute/hour/second/count/tag/percent/meter/kilometer;
  - common source types: `user_edit`, `ai_extraction`, `manual_form`, `system_event`, `activity_capture`.
- Неизвестный code не угадывается и не заменяется: он отображается как исходный value.
- Если `valueObjects[]` содержит effective leaf-links, таблица показывает реальные hydrated titles как и раньше.
- Если effective link отсутствует, `semanticObjectKey` сохраняется как fallback, но рядом явно выводится локализованная метка `Not linked to an observation object` / эквивалент. Это принципиально: UI не должен создавать ложное впечатление, что legacy semantic key уже является сохранённой связью Reality Model.
- Та же маркировка fallback добавлена в Cards view для согласованности.
- Текстовые колонки получают `tooltip: true`.

## 4. Observation Objects

- Data Tree остаётся тем же; `_children`, expand/collapse и row navigation не меняются.
- Parent остаётся в row model, но скрывается из основного table surface (`visible: false`), потому что структурный родитель уже выражен tree indentation.
- Основной layout: Observation object / Description / Role / Direct children / Descendants / Leaves / Status.
- Object получает больше места; Description остаётся вторичной responsive column.
- Ширины numeric columns увеличены, чтобы заголовки не обрезались на стандартном desktop.
- Текстовые колонки получают Tabulator tooltip.
- Tree/Cards/Map остаются без функциональных изменений.

## 5. Что намеренно НЕ входит

- SQL/migrations: нет.
- DB writes / Storage writes: нет.
- OpenAI calls: нет.
- Новые API routes: нет.
- Изменение фактов/effective links/backfill: нет.
- Inline editing: нет.
- Drag-and-drop/reparenting: нет.
- Spreadsheet editor/XLSX/Google Sheets: нет.

## 6. Safety / release gates

Release runner обязан:

1. Проверить clean `main` и exact HEAD `f0ca8bcfb785592375972913567b30d2661603e5`.
2. Выполнить `git fetch origin main` и подтвердить `origin/main == HEAD`.
3. Проверить exact baseline blobs для package files, Tabulator adapter/CSS и трёх изменяемых pages.
4. Выполнить manifest/hash/secret scan.
5. До mutation выполнить isolated TypeScript delta gate для трёх TSX payload files.
6. Снять full-project ESLint baseline.
7. Применить только exact allowlist payload.
8. Подтвердить `tabulator-tables@6.5.2` через `npm ls`.
9. Запустить release validator.
10. Запустить changed-files ESLint с `--max-warnings=0`.
11. Запустить full `tsc --noEmit`.
12. Запустить full `next build`.
13. Выполнить `git diff --check`.
14. Повторить full-project ESLint и запретить regression относительно baseline.
15. Проверить exact changed/staged files.
16. Commit только после всех PASS.
17. Push `main`, fetch и exact remote verify.
18. При любой ошибке до commit выполнить rollback к baseline. Если commit создан, но push не завершён — не уничтожать commit, а завершить с отдельным resume-push status.

## 7. Postcheck после PASS

Проверить на production при открытом AI-Navigator:

- `/activity-today?locale=en`: Source не занимает колонку; Analysis/Status короткие и читаемые; полные длинные значения доступны tooltip.
- `/activity-facts?locale=en`: known technical codes отображаются человекочитаемо; semantic-key fallback явно помечен как `Not linked to an observation object`; effective linked titles по-прежнему показываются без fallback marker.
- `/value-objects?locale=en`: Parent не занимает отдельную колонку; заголовки Direct/Descendants/Leaves читаются; дерево остаётся корректным.
- Повторить хотя бы одну не-English locale для проверки локализации short statuses/codes/fallback marker.

Если visual postcheck не выявит новых дефектов, read-only этап `Table Views T1` можно считать закрытым и переходить к отдельному editable/spreadsheet этапу.
