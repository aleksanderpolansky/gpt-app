# ARCTOR Formula Test Evidence + Publish Readiness API V1

Дата: 2026-09-15
Baseline: `ed95992ea5c01fa6d3f8245f185365f2fcb6c80d`

## Цель

Добавить governance gate между no-write Formula Test и будущей публикацией.

Этот этап НЕ публикует формулу.

## Test evidence

Добавлен server layer:

`src/lib/reality-curator/formula-rule-governance.server.ts`

Новый action:

`record_test_evidence`

Он повторно запускает существующий deterministic `test_draft` на переданных sample inputs.

Evidence записывается только если:

- тест реально выполнен (`evaluationStatus=evaluated`);
- `testPassed=true`;
- `noWrite=true`;
- `unitAlgebra.status=resolved`;
- конфигурация формулы не изменилась между pre-test и post-test fingerprint.

## Fingerprint

Evidence привязывается к SHA-256 fingerprint точной конфигурации:

- semantic address series;
- input contract;
- condition;
- expression AST;
- triggers;
- result role;
- result unit;
- missing-input policy;
- expression language.

Metadata, timestamps и сам evidence в fingerprint не входят.

## Privacy / minimization

В metadata НЕ сохраняются сырые sample inputs и сырой output.

Сохраняются:

- `sampleInputsHash`;
- `outputHash`;
- status проверки;
- target unit;
- кто и когда зафиксировал evidence;
- formula fingerprint.

Это позволяет проверить актуальность evidence без накопления тестовых пользовательских значений.

## Evidence invalidation

Любой новый `configure_draft` теперь:

- очищает `testEvidence`;
- устанавливает `testEvidenceState=required_after_configuration`;
- фиксирует `testEvidenceInvalidatedAt`.

Поэтому evidence нельзя случайно использовать после изменения формулы.

## Publish readiness

Добавлен read-only action:

`publish_readiness`

Он проверяет:

- active series;
- editable draft/testing version;
- configured formula;
- valid evidence contract;
- совпадение evidence fingerprint с текущей конфигурацией;
- passed/no-write/evaluated test;
- resolved unit algebra.

Возвращается `ready=true/false` и массив причин.

Даже при `ready=true`:

`publishEnabled=false`

Публикация в этом этапе физически не выполняется.

## Запись данных

`record_test_evidence` пишет только metadata существующей draft/testing formula version.

Не пишет:

- activity facts;
- result/snapshot facts;
- derivation lineage;
- recalculation queue.

SQL migration нет.

## Следующая точка

После этого gate:

1. вывести evidence/readiness в Formula Builder UI;
2. определить отдельный явный publish action;
3. проверить переходы version status и supersede semantics;
4. только после безопасной публикации переходить к executor.
