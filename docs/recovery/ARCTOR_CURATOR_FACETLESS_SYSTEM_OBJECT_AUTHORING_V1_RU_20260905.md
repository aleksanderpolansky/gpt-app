# ARCTor — удаление Semantic facet из системного authoring Куратора

Дата: 2026-09-05
Релиз: `ARCTOR_CURATOR_FACETLESS_SYSTEM_OBJECT_AUTHORING_V1_0_2`
Baseline: `f49df3146ea5b06d47a140cbc50e13c05eb66567`
Code commit: `34d08384f5183a2aac28bca1537e75489dc6c5d4`
Статус: CODE_RELEASED_AWAITING_LIVE_ACCEPTANCE

## 1. Причина

В реальном проходе Куратора при построении ветви «Actions and Processes» форма прямого потомка root требовала ручной выбор `ENTITY / PROCESS / STATE / RELATIONSHIP / ROLE / KNOWLEDGE / BEHAVIOR / CONTEXT` через поле «Semantic facet / Семантическая грань».

Это противоречит принятой модели «3+1»: смысл ОН задаётся его названием и определением, местом в одном из трёх деревьев, структурным родителем, смыслом родительской связи, ролью узла, параметрами и типизированными горизонтальными связями. Дополнительный универсальный facet-enum не является семантическим источником истины.

## 2. Зафиксированное решение

- `facet_code` выведен из актуального curator semantic contract.
- Поле Semantic facet полностью удалено из create UI Куратора.
- Поле не заменяется другим обязательным enum.
- В полной карточке ОН больше не показывается отдельное поле Semantic facet.
- В заголовке и техническом бейдже каталога facet больше не используется как видимый классификатор.
- `object_kind_code` этим релизом не объявляется новой семантической гранью и не становится ручным полем Куратора.

## 3. Legacy DB compatibility

Физическая колонка `value_objects.facet_code` этим релизом не удаляется. SQL и миграции не выполняются.

Read-only intake подтвердил, что действующий P1C database trigger пока требует заполненные `facet_code` и `object_kind_code` для ontology rows и проверяет совпадение kind/facet. Поэтому endpoint создания системного draft временно сохраняет эти значения только как legacy storage compatibility.

Куратор их не выбирает и API больше не принимает `body.facetCode`.

Для прямых детей трёх root «треугольной комнаты» legacy compatibility определяется сервером:

- `Systems and Structures` -> legacy `ENTITY`;
- `States and Needs` -> legacy `STATE`;
- `Actions and Processes` -> legacy `PROCESS`.

Для более глубоких descendants техническое значение наследуется от parent только ради существующего DB guard. Это значение не считается семантической классификацией ARCTor.

Если direct-child создаётся под неизвестным root старой архитектуры, endpoint fail-closed возвращает конфликт вместо выдумывания facet. Отдельный DB cleanup/reconciliation необходим до физического удаления legacy-полей.

## 4. Изменённые source files

1. `src/app/admin/reality-curator/signals/curator-object-bootstrap.tsx`
2. `src/app/api/admin/reality-curator/signals/object-bootstrap/route.ts`
3. `src/components/workspace/value-objects/value-object-full-card-panel.tsx`
4. `src/app/value-objects/[id]/page.tsx`
5. `src/components/workspace/value-objects/actual-value-objects-list.tsx`

## 5. Safety boundary

- SQL migrations: 0.
- DB mutation в release-runner: 0.
- Supabase writes в release-runner: 0.
- OpenAI calls: 0.
- Существующие `facet_code` не переписываются.
- Существующие ОН не переподчиняются.
- Параметры и типовые активности не изменяются.

## 6. Проверки release-runner

- exact baseline + origin/main;
- clean worktree либо строго распознанный residue предыдущего failed runner с path+SHA guard;
- exact SHA-256 пяти source files из intake;
- Node syntax check patcher/validator;
- patcher self-test на копии текущих source files до mutation;
- dedicated facetless validator;
- TypeScript pre/post;
- touched-file ESLint 0 errors / 0 warnings;
- full ESLint no regression;
- production build;
- `git diff --check`;
- exact changed-file allowlist по `git status --porcelain`, включая untracked recovery checkpoint;
- code commit;
- recovery commit;
- push/remote verification;
- final clean worktree.

## 7. Ошибки release-runner и технические уроки

До успешного V1.0.2 было два неуспешных локальных запуска без commit/push:

1. V1 (18:46) остановился на `git fetch`, потому что Windows PowerShell 5.1 интерпретировал нормальный Git STDERR (`From https://...`) как terminating error при `$ErrorActionPreference = "Stop"`. Source/DB не менялись; rollback был чистым.
2. V1.0.1 (18:50) дошёл до source patch, но `git diff --name-only` смешал machine-readable STDOUT с предупреждением Git о LF/CRLF из STDERR. Allowlist корректно остановил релиз до commit. Rollback оставил один известный residue-файл из-за line-ending поведения Git.

V1.0.2 устраняет оба класса ошибок: native STDOUT/STDERR разделены, changed-file allowlist строится по `git status --porcelain`, untracked recovery checkpoint учитывается, rollback использует точный byte snapshot, а известный residue V1.0.1 может быть автоматически очищен только при точном совпадении пути и SHA-256. Любое другое грязное состояние fail-closed и не уничтожается.

## 8. Live acceptance после деплоя

Нужно проверить production:

1. `/admin/reality-curator/signals?locale=uk`: при parent `Actions and Processes` поля «Семантична грань» нет.
2. Можно создать direct intermediate без `facetCode` в browser payload.
3. Созданный System draft остаётся ownerless/hidden/unpublished.
4. Полная карточка нового и существующего ОН не показывает Semantic facet.
5. Каталог/заголовок карточки не показывает raw facet как классификатор.
6. Путь root -> intermediate -> ... -> leaf продолжает работать.

## 9. Точка продолжения

После live acceptance вернуться к сигналу `подтянулся 10 раз`: продолжить создание правильного системного пути в ветви «Actions and Processes», довести его до leaf и затем связать с `count`, после чего проверить `duration`.

Отдельная будущая задача: dependency audit и redesign legacy `facet_code/object_kind_code` DB guards до физической очистки schema. Этот релиз schema не меняет.