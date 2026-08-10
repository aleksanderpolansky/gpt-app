# P5B1 Runtime Methodology Context + Public Trace

Baseline: P5A commit `2cc434a40cb2a477ba35502e22a637904ae042d2`.

## Purpose

P5B1 connects the P5A methodology registry to the two AI runtimes that already exist.
It does not yet change database provenance tables and does not yet migrate the model
calls to strict JSON Schema enforcement.

## What changes

1. A server-only executable projection of `arctor_ai_runtime_core@1` is prepended
   to the actual system prompt used by the model.
2. Existing P4A/P4B effective system instructions remain the editable operational layer.
3. Existing actor personal guidance remains subordinate, untrusted context.
4. A central runtime assembler binds:
   - runtime code;
   - core protocol version/hash;
   - output schema version/hash;
   - trace schema version/hash;
   - effective system-instruction revisions;
   - personal-rule revision when present;
   - deterministic rule references actually supplied to the call;
   - knowledge-package references actually supplied to the call.
5. `/api/test` returns a public-safe `methodologyTrace` on successful model results.
6. Calendar semantic preview returns the same trace for model and fallback preview results.
7. The calendar trace identifies the effective calendar rule under the already bound
   `calendar_ai_rule_preferences` registry.

## Safety

The assembler rejects a deterministic registry or knowledge package that is not declared
in the P5A runtime binding. This prevents a runtime from claiming methodology sources that
were never approved for that runtime.

`methodologyTrace` contains version/source metadata only. It does not expose the text of
personal guidance or hidden system instructions.

## Not yet in P5B1

- strict Structured Outputs / JSON Schema enforcement at the OpenAI call boundary;
- persistence of protocol/schema/rule references into stored activity provenance;
- knowledge/model-package registry;
- admin/user methodology viewer.

Those are subsequent P5B/P5 slices after this runtime binding is accepted.
