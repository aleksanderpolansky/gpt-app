# ARCTOR — локализация и формулировки конструктора куратора

Дата: 2026-09-05
Релиз: `ARCTOR_CURATOR_LOCALIZATION_AND_WORDING_CLEANUP_V1_0_2`
Baseline: `0223016c120aede4ac62e0ae2941e0e71bf4e053`

## Причина

Во время реального прохода сигнала `подтянулся 10 раз` интерфейс был переключён на `locale=uk`, но управляющие тексты конструктора параметров и следующего шага ОН оставались английскими.

Проверка исходников показала причину: в `curator-template-parameters.tsx` и `curator-object-bootstrap.tsx` полноценные словари существовали только для EN/RU, а PL/UK/DE/ES/CS были напрямую привязаны к EN.

Дополнительно:
- после перехода в конструктор продолжал показываться устаревший RU/EN summary первоначальной проверки `missing parameter`, хотя `duration` уже был найден, активирован и выбран;
- два соседних блока повторяли `Parameter being configured`;
- формулировка ошибочно создавала впечатление, что параметр сам является фактом;
- статус использованного параметра назывался `Смысл заблокирован` и визуально воспринимался как ошибка.

## Решение

- Добавлены собственные интерфейсные словари EN / RU / PL / UK / DE / ES / CS для конструктора параметров и шага определения ОН.
- Устаревший summary первоначальной проверки больше не показывается как текущий статус; история остаётся в журнале.
- Удалён дублирующий внешний блок текущего параметра.
- Правило параметров уточнено: параметр задаёт, какое значение можно записать; факт возникает после записи значения.
- Формулировка завершённой первичной проверки уточнена как проверка системного каталога параметров.
- Русский статус использованного параметра заменён точно на:
  `Редактирование полей невозможно: параметр уже используется`.
- Статус оформлен как жёлтый информационный badge (amber), а не красная ошибка.
- Аналогичные нейтральные формулировки заданы для остальных поддерживаемых языков.

## Область изменения

Изменяется только UI/локализация:
- `src/app/admin/reality-curator/signals/curator-template-parameters.tsx`;
- `src/app/admin/reality-curator/signals/curator-object-bootstrap.tsx`;
- `src/app/admin/reality-curator/signals/curator-work-panel.tsx`;
- `src/app/activity-templates/activity-parameter-admin-catalog.tsx`;
- dedicated validator.

DB mutation: нет.
SQL migrations: 0.
OpenAI calls: 0.
Коммерческий контур: не изменяется.

## Live acceptance после production

1. `?locale=uk`: конструктор параметров и определения ОН имеет украинские управляющие тексты.
2. `?locale=ru`: тот же участок имеет русские управляющие тексты.
3. После подтверждения `count + duration` не показывается устаревшая фраза о недостающем параметре.
4. Контекст текущего параметра не дублируется.
5. Для использованного `duration` отображается `Редактирование полей невозможно: параметр уже используется`.
6. Этот статус жёлтый/informational, не красный/error.

## Recovery discipline

Этап закрывается только после code gates, отдельного recovery commit, push/remote verification, clean worktree и production live acceptance.

## История release-runner

### V1 — FAIL до commit/push

Запуск `ARCTOR_CURATOR_LOCALIZATION_AND_WORDING_CLEANUP_V1` дошёл до dedicated validator и успешно подтвердил все функциональные изменения, но остановился на touched/new ESLint:

- `ESLINT_TOUCHED_AFTER: files=5 errors=2 warnings=0`;
- commit не создавался;
- push не выполнялся;
- DB/SQL/OpenAI не затрагивались;
- rollback вернул репозиторий точно к baseline;
- `ROLLBACK_WORKTREE_CLEAN: YES`.

Причина V1.0.1 локализована в новом Node validator: он использовал глобальные `process` и `console`. В flat ESLint-конфигурации проекта этот новый `.mjs` попал под `no-undef`, что и дало ровно две новые ошибки. Функциональные TSX-патчи и dedicated validator до этого прошли.

### V1.0.1

Validator больше не полагается на неявные Node globals:
- добавлен `import { argv, stdout } from "node:process"`;
- `process.argv` заменён на `argv`;
- `console.log` заменён на `stdout.write`.

Функциональный смысл UI-патча V1 не изменён.

## V1.0.1 — FAIL до commit/push: duplicate end-anchor in patcher

V1.0.1 прошёл source-contract gates, patcher self-test, dedicated validator и `git diff --check`,
но touched ESLint обнаружил две синтаксические ошибки:

- `curator-object-bootstrap.tsx:158:52` — `Parsing error: ':' expected`;
- `curator-template-parameters.tsx:124:20` — `Parsing error: Expression or comma expected`.

Причина установлена точно. `replaceSection()` уже сохраняет `endText` через `source.slice(end)`,
но replacement одновременно добавлял тот же end-anchor:

- `TEMPLATE_BLOCK + "const DIMENSIONS = ["`;
- `OBJECT_BLOCK + "const FACET_LABELS: Record<string, string> = {"`.

Это создавало сдвоенные декларации. V1.0.2 убирает end-anchor из replacement и добавляет
self-test/validator, требующие ровно одно вхождение каждого end-anchor после patch.

Состояние после V1.0.1:
- `DATABASE_MUTATION_APPLIED: NO`;
- `CODE_COMMIT_CREATED: NO`;
- push не выполнялся;
- rollback выполнен;
- `ROLLBACK_WORKTREE_CLEAN: YES`.

Функциональный UI scope не меняется: EN/RU/PL/UK/DE/ES/CS, исправленные формулировки,
удаление stale summary/дублирования и amber-информационный статус
`Редактирование полей невозможно: параметр уже используется`.


Code commit: `ca6928e267a00fb9ea713e749f9c49ac1d5bd30c`
