# P5B2A Strict Structured Outputs

Baseline: P5B1 commit `04754647405223c1c7b0c8d5a4f9a2262b6cf09d`.

## Purpose

P5A created versioned JSON Schemas and P5B1 attached their identity to each runtime methodology trace. P5B2A makes those schemas executable at the actual model-call boundary.

## Runtime rule

The runtime binding selects one approved output schema. The same schema identity appears in `methodologyTrace` and the sanitized schema payload is sent to the provider with strict schema adherence enabled.

`navigator_chat` uses `navigator_chat_output@1`.

`activity_semantic_preview` uses `activity_semantic_preview_model_output@1`.

The source JSON Schema remains canonical in Git. Provider-specific transport metadata such as `$schema` and `$id` is removed only from the request payload; the semantic schema is not loosened.

## Safety

- Generic JSON mode is no longer used by these two current runtimes.
- The provider boundary enforces the approved schema even if explanatory shape hints remain in the current calendar prompt.
- Unknown/candidate semantics remain defined by the schema and core protocol.
- No database schema or provenance rows are changed in this slice.
- No OpenAI call is performed by the source-application script.

## Next slice

P5B2B will persist methodology/protocol/schema/rule references into activity processing provenance using the existing P4A provenance layer, after an exact writer/schema audit.
