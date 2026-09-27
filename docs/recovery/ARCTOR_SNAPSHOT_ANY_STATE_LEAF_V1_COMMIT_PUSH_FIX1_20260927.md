# ARCTor Snapshot Any State Leaf V1 — Commit/Push FIX1

Дата: 2026-09-27
Baseline: `main @ 3abc43ff1961acd0224b856e257afbfd5777ac3c`

## Предыдущая попытка

`ARCTOR_SNAPSHOT_ANY_STATE_LEAF_V1_COMMIT_PUSH_20260927` остановилась до commit.

Причина:
`STAGED_DIFF_CHECK failed with exit code 2`.

Причиной были только trailing spaces в документации и runtime report.
До этой проверки успешно прошли:

- dedicated validator `PASS_20_20`;
- targeted ESLint;
- TypeScript;
- git diff --check для tracked code;
- production build;
- exact staged allowlist.

После ошибки staging был сброшен, package-added rollout recovery был удалён.
Commit hash и remote hash не появились.

## FIX1

Продуктовая логика не меняется.

FIX1:
- не включает runtime reports в commit;
- перед staging удаляет trailing spaces/tabs только из двух ранее созданных
  untracked markdown-файлов snapshot feature;
- создаёт чистый DB rollout checkpoint и этот FIX1 checkpoint;
- повторяет validator / ESLint / TypeScript / build;
- проверяет exact staged allowlist;
- выполняет `git diff --cached --check`;
- только затем делает commit + push;
- сверяет remote `main` с новым commit.

## Safety

DB_WRITES=0
SQL_EXECUTED=0

Production DB migration уже применена вручную и подтверждена read-only
postcheck до этого commit/push этапа.
