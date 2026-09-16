# ARCTOR Formula Explicit Publish UI V1

Дата: 2026-09-16
Baseline: `2ef454d4c92ca898e232554bd03289b27a27848f`

## Цель

Довести controlled Formula Builder flow до явного ручного publish action.

Server explicit publish gate уже существует.
Этот этап добавляет только UI и не выполняет публикацию автоматически.

## UI

В governance block `FormulaTestPanel` добавлен раздел явной публикации.

Кнопка появляется только если server readiness возвращает:

- `ready=true`;
- `publishEnabled=true`.

Перед публикацией куратор обязан поставить отдельный checkbox подтверждения.

После этого UI отправляет:

- `action=publish_version`;
- текущий `ruleVersionId`;
- `confirmationCode=PUBLISH_FORMULA_RULE_V1`.

Confirmation code не вводится пользователем вручную: checkbox является
явным UI-подтверждением, а код остаётся server-contract detail.

## Безопасность

UI не принимает решение о readiness самостоятельно.

Окончательные условия повторно проверяются server publish gate непосредственно
перед UPDATE.

Если существует уже published sibling, readiness блокирует кнопку до появления
atomic supersede gate.

## После успешной публикации

UI:

- показывает сообщение об успехе;
- локально выключает повторную кнопку;
- через 1.2 секунды перезагружает страницу.

Reload нужен, чтобы Formula Builder заново прочитал version status и не
оставлял published version визуально editable из-за старого client state.

Server всё равно блокирует configure для published version, но UI также должен
немедленно синхронизироваться.

## Ограничение V1

Этот UI поддерживает только первую публикацию в series.

Автоматический supersede не включён.

## Что НЕ включено

- автоматическая публикация launcher-ом;
- atomic supersede;
- executor;
- result/snapshot fact write;
- lineage;
- recalculation execution.

## Acceptance

После release нужно вручную выбрать безопасную configured draft formula и
пройти:

1. no-write test;
2. record evidence;
3. publish readiness;
4. checkbox explicit confirmation;
5. publish;
6. reload и проверка status=published.

Это будет первая controlled live acceptance публикации.

## Следующая точка

После live acceptance:

1. зафиксировать evidence результата в recovery;
2. спроектировать atomic supersede/version creation;
3. только затем переходить к deterministic executor.
