# ARCTOR Formula Builder — Validation API V1

Дата: 2026-09-15
Baseline: `67ed0775fd086677c39cfeb7dfe79aaa142ace43`

## Цель

Добавить безопасный серверный gate между редактированием draft rule и будущим test/publish.

До этого `update_draft` проверял только структуру AST. Теперь завершённый draft должен пройти дополнительную проверку Formula Builder V1.

## Новый server layer

Добавлен:

`src/lib/reality-curator/formula-rule-builder.server.ts`

Он проверяет:

- существование version;
- editable status: только `draft` или `testing`;
- непустой input contract;
- уникальность input keys;
- закрытый набор trigger;
- допустимый result fact role;
- допустимую missing-input policy;
- shape/arity каждого AST operation;
- отсутствие `literal null` placeholder в завершённой формуле;
- ссылки `input` только на объявленные input keys;
- использование всех required inputs;
- condition contract: либо `{}`, либо `{ expression: AST }` с boolean root operation;
- для consequence-constructor rule обязательный source_fact input, совпадающий с source ON + source parameter серии;
- target parameter должен оставаться active;
- result unit принудительно фиксируется на canonical unit target parameter;
- переданный другой result unit отклоняется.

## Состояние после configure

После успешного `configure_draft` metadata версии переводится в:

- `formulaState = configured`;
- `draftState = configured`;
- `draftIncomplete = false`;
- `placeholderExpression = false`;
- `resultFactRoleProvisional = false`;
- `builderContract = ARCTOR_FORMULA_BUILDER_V1`;
- сохраняется `configuredAt`.

Старые metadata/provenance не стираются, а объединяются с новыми.

## API

В `/api/admin/formula-rules` добавлен:

`POST action=configure_draft`

Старый внешний `update_draft` отключён и возвращает HTTP 410:

`FORMULA_RULE_RAW_DRAFT_UPDATE_RETIRED_USE_CONFIGURE_DRAFT`

Это закрывает возможность обойти builder-validation через административный API.

Низкоуровневый `updateFormulaRuleDraftV1()` остаётся внутренней функцией server layer.

## Что не включено

- publish;
- testing transition;
- formula execution;
- fact write;
- lineage;
- recalculation queue execution;
- UI редактора.

## Граница проверки единиц

V1 не пытается выполнять полноценную размерностную алгебру выражения.

На этом этапе гарантируется более узкий инвариант:

`result_unit_code == canonical_unit_code target parameter`.

Полная проверка размерностей входов и промежуточных операций должна быть добавлена до executor/publish, когда будет утверждён отдельный unit-algebra contract.

## Следующий этап

Formula Builder UI V1:

- открыть существующий draft;
- редактировать inputs;
- condition;
- AST expression;
- triggers;
- result role;
- missing-input policy;
- отправить `configure_draft`;
- после успешной проверки показать `configured`, но всё ещё без publish.

После этого отдельный test/publish gate.
