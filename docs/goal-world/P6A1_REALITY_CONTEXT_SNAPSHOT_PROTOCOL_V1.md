# ARCTor.app — P6A1 Reality Context Snapshot Protocol v1

Protocol code: `reality_context_snapshot`
Version: `1`
Stage: P6A1 architectural foundation
Source of truth: Git/code

## 1. Purpose

ARCTor maintains one shared Reality Graph. A Goal World, recommendation,
analysis or AI call must not receive the whole personal history by default.

This protocol defines how a server-side process compiles a **task-scoped,
time-aware, provenance-preserving snapshot** of the already known reality.

The snapshot is a transient analytical input. It is not a second Reality Graph
and it does not copy canonical ownership of facts.

## 2. Core principle

A private goal is always interpreted against the person's already known reality.

Examples:

- "open a business in Germany" may depend on language capability, business
  experience, capital, family constraints, location, time availability and
  professional network;
- which of those dimensions matters, and how much, depends on the actual person;
- the same natural-language goal can therefore compile into very different
  Goal Worlds for different people.

## 3. Snapshot inputs

The context assembler may inspect only data relevant to the declared runtime
purpose and actor:

- Value Object identities and hierarchy;
- typed semantic relations;
- observations/facts/measures attached to observable leaf objects;
- derived current-state projections, with their derivation references;
- activities relevant to the requested period or object;
- actor-owned profile/context records that are explicitly allowed;
- current Goal Definition when the runtime purpose is goal-specific;
- current Goal World references when the runtime purpose operates inside an
  already compiled world.

The snapshot must not treat derived state as raw evidence. Derived state always
retains links to the observations/rules from which it was calculated.

## 4. Time model

Every included knowledge item should preserve, when available:

- `effectiveAt` / validity period — when the statement applies to reality;
- `observedAt` — when the observation happened;
- `knownAt` — when ARCTor learned it;
- `asOf` — the time for which the snapshot is being compiled.

Current state is therefore a time-bound projection, not a timeless property.

## 5. Relevance selection

Context selection is deterministic-first.

The assembler begins from the runtime anchor, for example a Goal Definition,
Value Object, activity or recommendation request, and expands through:

1. directly referenced Value Objects;
2. structural ancestors/descendants within configured depth;
3. allowed typed semantic relations;
4. recent/relevant observations and activities;
5. actor context fields explicitly permitted for this runtime.

AI may propose additional candidate context only after the deterministic set is
known. Candidate expansion does not become canonical without validation.

## 6. Minimal necessary context

The assembler must prefer the smallest context sufficient for the task.

Sensitive information is not included merely because it exists in ARCTor.

A runtime binding/policy must declare which context families are allowed. The
resulting snapshot records which families and source references were actually
used.

## 7. Knowledge classes in a snapshot

The snapshot may expose references/summaries for:

- `observable_object`;
- `observation`;
- `derived_state`;
- `activity`;
- `relationship`;
- `actor_context`;
- `goal_definition`;
- `goal_world_context`.

These are snapshot presentation classes only. They do not create new canonical
ontology kinds.

## 8. Behavioral and psychological context

Behavioral or psychological context may be included when it is materially
relevant to the task, but it must be evidence-grounded and time-aware.

ARCTor distinguishes:

- directly stated preference or self-description;
- repeatedly observed behavior;
- situational reaction;
- derived behavioral pattern;
- model hypothesis requiring confirmation.

A repeated pattern may be useful without being converted into a permanent
personality label.

Examples of potentially relevant dimensions include:

- tolerance for travel, hotels and irregular schedules;
- response to public evaluation or social exposure;
- need for routine versus novelty;
- preferred autonomy versus external structure;
- persistence after failure;
- switching/avoidance patterns;
- stress response and recovery;
- social intensity versus need for solitude;
- conflict tolerance;
- tolerance for financial/occupational uncertainty.

These are not mandatory global psychological traits. They are contextual
observations/derived states whose evidence, time window and uncertainty must be
preserved.

## 9. Quality and provenance

Do not introduce a universal `confidence` field.

Where relevant, reuse the existing ARCTor distinctions:

- semantic match quality;
- value precision/reliability;
- source reliability;
- measurement/derivation method;
- uncertainty;
- provenance/evidence references.

A user statement is strong evidence of what the user said. It is not
automatically proof that the external world matches the statement.

## 10. Unknown and stale information

Missing context remains unknown.

Old information may be included with its time metadata, but the assembler must
not silently present it as current. A runtime may decide that a stale value
requires clarification or a fresh observation.

## 11. Consumers

The same snapshot architecture is reusable by:

- P6 Goal Intake;
- P8 Goal World Compiler;
- activity/fact interpretation;
- analytics and forecast layers;
- future professional/education/sport/activity suitability analysis;
- future decision support.

Each consumer gets its own allowed-context policy. There is no "send everything
to AI" mode.

## 12. Provenance of decisions

Any material model-backed result should be able to state which snapshot version,
source references, rules and methodology binding were used.

The snapshot itself should be reproducible enough to explain why the system had
a particular understanding of the person's situation at that time.

## 13. Non-goals

This protocol does not:

- create or mutate Value Objects;
- persist a Goal World;
- define P7 Goal World tables;
- automatically promote free text into global truth;
- calculate compatibility or success probability;
- grant AI unrestricted access to all personal data.
