# ARCTOR Formula Evidence + Publish Readiness UI V1.0.1

Дата: 2026-09-16
Baseline: `19550e8fa700e68802660a8cc0c9d75a00176bee`

## Цель

Вывести в Formula Builder существующие governance actions:

- `record_test_evidence`;
- `publish_readiness`.

Фактическая публикация по-прежнему выключена.

## Ошибка первого launcher и исправление V1.0.1

Первый `ARCTOR_FORMULA_EVIDENCE_READINESS_UI_V1` был остановлен до ESLint и до commit
на строгой проверке staged allowlist.

Причина:

- launcher переписывал `src/app/admin/formula-builder/page.tsx`;
- фактическое содержимое page.tsx при этом не менялось;
- Git корректно не добавил этот файл в staged diff;
- launcher ошибочно ожидал его в exact staged set и получил `STAGED_SET_MISMATCH`.

Rollback завершился `PASS`; commit и push не выполнялись.

V1.0.1 больше не переписывает и не stage-ит `page.tsx`.
Интеграция `FormulaTestPanel` уже присутствует в baseline, поэтому для этого этапа
изменяются только сам `FormulaTestPanel`, recovery и current-state.

## Что изменено

В `FormulaTestPanel` добавлен блок governance.

После успешного no-write теста с:

- `evaluationStatus=evaluated`;
- `testPassed=true`;
- `noWrite=true`;
- `unitAlgebra.status=resolved`

куратор может нажать:

`Зафиксировать доказательство теста`

UI повторно передаёт те же sample inputs server action `record_test_evidence`.
Источник истины остаётся на сервере.

После записи evidence или отдельно по кнопке можно выполнить:

`Проверить готовность к публикации`

UI показывает:

- `ready`;
- `evidenceState`;
- `evidenceRecordedAt`;
- список причин блокировки;
- `publishEnabled`.

Даже при `ready=true` фактический `publishEnabled` остаётся `false`.

## Что намеренно не сделано

- publish action;
- изменение version status;
- supersede;
- executor;
- fact write;
- lineage;
- recalculation execution.

## Recovery incident 2026-09-16

После успешного commit предыдущего API launcher был ошибочно запущен повторно на уже новом baseline.

Baseline guard корректно остановил второй запуск, но старый rollback ошибочно удалил два файла,
которые уже существовали в HEAD:

- governance server;
- recovery document этапа evidence API.

Файлы были восстановлены из `HEAD`.

Диагностика показала:

- `core.autocrlf=true`;
- raw worktree bytes имели CRLF;
- filtered Git hash обоих файлов точно совпадал с HEAD/index;
- `git diff --quiet` возвращал 0;
- после `git update-index --refresh` итоговый `git status` стал clean.

## Урок для launcher

Новый launcher не выполняет rollback вообще до начала mutation.

Используется `MutationStarted=false`, который переключается только после:

- exact local baseline;
- exact remote baseline;
- clean worktree;
- проверки существования/отсутствия target files.

Новый recovery-файл удаляется при rollback только если он был создан этим запуском.

Нельзя удалять intended-new path только потому, что launcher когда-то считал его новым.

## Проверки

Launcher выполняет:

- exact local baseline;
- exact remote baseline;
- clean worktree;
- exact patch markers;
- ESLint;
- `tsc --noEmit`;
- production build;
- staged exact allowlist;
- `git diff --cached --check`;
- commit;
- push;
- remote SHA verification.

## Точка продолжения

Следующий отдельный gate:

1. explicit publish server action;
2. проверка transition draft/testing -> published;
3. supersede semantics;
4. publish audit metadata;
5. executor всё ещё не включать до отдельного этапа.
