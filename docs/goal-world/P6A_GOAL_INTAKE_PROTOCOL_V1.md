# ARCTor.app — Goal World Constructor
# P6A Goal Intake Protocol v1

Protocol code: `goal_intake_protocol`
Version: `1`
Stage: P6A foundation
Source of truth: Git/code

## 1. Purpose

P6 converts a short human goal statement into a normalized **Goal Definition**
with explicit known, partial, unknown and clarification-required fields.

The P6 Goal Definition is an **intake artifact**. P6A does not create a Goal
World, does not create or mutate Value Objects, and does not decide the future
P7 persistence model.

This preserves the roadmap boundary:

- P6 = understand and normalize the goal;
- P7 = define the Goal World data model;
- P8 = compile a Goal Definition into an initial Goal World.

## 2. Required Goal Definition fields

The normalized definition contains exactly these nine semantic fields:

1. goal;
2. success definition;
3. current state;
4. timeframe;
5. resources;
6. constraints;
7. motivation;
8. non-negotiables;
9. context.

Each field carries its own state:

- `known` — enough explicit or trusted information is available;
- `partial` — some useful information is available, but material aspects are missing;
- `unknown` — no supported value is available;
- `clarification_required` — ambiguity prevents a reliable normalized value.

Unknown is a valid result. It must never be silently replaced by a model guess.

## 3. Evidence origin

A field may use only these origin codes:

- `current_message`;
- `user_confirmed_prior`;
- `trusted_actor_context`;
- `existing_reality_graph`;
- `deterministic_derivation`;
- `none`.

`none` is used only when no supported source exists.

A remembered preference, a world-specific hint, or a model assumption is not a
confirmed fact merely because it is plausible.

## 4. Goal classification

P6 uses two lightweight classification layers only to choose the relevant
completeness checklist and questions.

### Goal form

- `achieve_outcome`
- `reach_state`
- `maintain_state`
- `execute_project`
- `build_routine`
- `make_decision`
- `explore`
- `avoid_outcome`
- `unknown`

### Domain modules

- `learning`
- `health`
- `relationship`
- `career_business`
- `financial`
- `location_transition`
- `creative`
- `other`

These codes are **not** Value Object kinds, branch types, node roles, Goal World
roles or canonical ontology. They must not be written into those registries.

Multiple domain modules may apply to one goal.

## 5. Core completeness checklist

The core checklist always treats these fields as required:

- goal;
- success definition;
- current state;
- timeframe.

The remaining five fields are recommended by default.

Goal-form and domain modules may promote a recommended field to required.
They may never downgrade a core required field.

Completeness is deterministic arithmetic coverage, not confidence and not
probability.

For required fields:

`requiredCompletenessPercent = floor(100 * requiredKnown / requiredTotal)`

`partial`, `unknown` and `clarification_required` are reported separately and
do not count as fully complete.

No output may describe this percentage as a chance of success.

## 6. Questionnaire policy

P6 must not ask every standard question blindly.

Question generation is deterministic from:

1. the current Goal Definition;
2. the effective field requirements from the core checklist and active modules;
3. the field question registry.

Rules:

- do not ask a field already marked `known`;
- ask `clarification_required` before `unknown`;
- ask required fields before recommended fields;
- use already-known data instead of asking again;
- do not invent a custom canonical question id when a registry question exists;
- a future UI may limit how many questions are shown in one turn without
  changing the underlying completeness state.

## 7. Normalization rules

- Preserve the user's original goal text exactly as `sourceGoalText`.
- `normalizedStatement` may clarify wording but must not silently change the
  intended target.
- Negative wording may remain negative. P6 must not automatically turn an
  avoidance goal into a different positive goal.
- A broad goal such as "I want to be happier" is allowed. Missing success
  criteria or timeframe remain explicit unknown/clarification fields.
- Dates, quantities and money not stated or deterministically derived must not
  be invented.
- Existing Reality Graph data may fill a field only when it is actually supplied
  to the runtime and the origin is recorded.
- P6 does not create Value Objects as a side effect.

## 8. Relationship to P5 methodology

When P6 becomes model-backed in the next slice, it must reuse the P5 platform:

- `arctor_ai_runtime_core@1`;
- strict Structured Outputs;
- versioned runtime methodology binding;
- editable system instructions;
- actor processing preference when actually supplied;
- public-safe methodology trace.

P6A deliberately defines the protocol/schema/registry first and performs no
OpenAI call.

## 9. Relationship to future P7/P8

P6 does not decide:

- Goal World tables;
- approach/avoid/maintain world roles;
- target/ideal object roles;
- world-specific weights/evaluation;
- which existing Value Object becomes the primary target;
- whether a missing Value Object should be created.

Those are P7/P8 responsibilities.

## 10. P6A acceptance

P6A is accepted when:

- `GOAL_INTAKE_SCHEMA` is strict and versioned;
- the nine fields have explicit field-state semantics;
- goal form/domain classification is intake-only;
- core + module requirements are deterministic;
- question selection is registry-based;
- completeness is deterministic and cannot be confused with probability;
- golden cases include short, detailed, negative/avoidance, decision and vague goals;
- no DB/AI/runtime mutation is introduced in P6A.
