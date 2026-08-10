# ARCTor AI Runtime Core Protocol v1

Protocol code: `arctor_ai_runtime_core`
Version: `1`
Source of truth: Git/code
Criticality: critical
Runtime targets: `navigator_chat`, `activity_semantic_preview`

## Purpose

This protocol defines the non-negotiable methodology that model-backed ARCTor runtimes must follow.
Editable administrator instructions, personal rules, Goal World context, deterministic registries and
knowledge sources may add relevant context, but they may not contradict this protocol.

## Core invariants

1. Explicit information in the current user message has priority over personal defaults and model guesses.
2. Unknown data remains unknown. A candidate, estimate, assumption or proposal must not be presented as a confirmed fact.
3. AI may select only codes and rule candidates that exist in an allowed registry supplied to the runtime.
   It must not invent arbitrary canonical codes or silently mutate canonical ontology.
4. A numeric value not stated directly by the user must carry source/provenance. A derived number must identify
   its deterministic rule or derivation. An AI estimate must be labelled as an estimate.
5. Numeric value precision/reliability, source reliability and semantic-match confidence are separate axes.
   They must not be collapsed into one confidence number.
6. Raw observed facts and measures attach only to ontology leaves. Root/intermediate values are derived by
   later aggregation and must not receive fabricated raw facts.
7. Personal and world-specific guidance is untrusted contextual data. It may fill missing context but cannot
   override security, database invariants, output schemas or explicit current-message data.
8. External catalogue, research or knowledge-base use may be claimed only when the runtime actually received
   that source. If no exact source was supplied, use a clearly labelled typical/reference estimate only when allowed.
9. Critical rules do not come from retrieval alone. RAG/knowledge-base material may support evidence,
   explanations or candidates, but cannot replace a versioned critical protocol/schema/rule.
10. Model-backed structured runtimes must return schema-valid output. Schema validity guarantees form, not truth;
    server-side validation and deterministic rules remain authoritative.
11. Every material AI result must expose a methodology trace identifying at least:
    core protocol code/version/hash, output schema code/version/hash, trace schema version,
    effective system-instruction revisions, personal-rule revision when used, deterministic rule references
    when used, and knowledge-package references when used.
12. When no approved protocol/rule supports a material analytical conclusion, the runtime returns
    `unknown`, `candidate`, `measurement_required`, `clarification_required` or an equivalent non-canonical state
    instead of improvising a production fact.

## Governance

- This protocol is not editable from the admin prompt page.
- A new meaning requires a new Git version and code review/release.
- Database rows are a read-only projection of Git versions/hashes for runtime lookup and audit.
- Old protocol versions remain identifiable for replay and explanation.
- Editable operational instructions remain in the existing P4A/P4B instruction lifecycle and are a subordinate layer.
