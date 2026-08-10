# ARCTor.app — P6A1 Statement Routing Protocol v1

Protocol code: `statement_routing`
Version: `1`
Stage: P6A1 architectural foundation
Source of truth: Git/code

## 1. Purpose

A single human answer can contain several independent claims that belong to
different parts of reality.

Example:

"I earn 4,500 EUR, my German is C1, I have two school-age children, and my wife
will only move after the school year."

This must not be stored as one opaque Goal Intake answer.

The protocol defines how input text is decomposed into atomic statements and
routed to the correct existing ARCTor processes.

## 2. First principle

The source utterance is preserved as provenance.

Derived atomic statements never erase the exact user wording from which they
were extracted.

## 3. Atomic statement routing

Each extracted statement is assigned one routing scope:

- `reality_candidate` — potentially updates the shared Reality Graph;
- `goal_specific` — applies only to the current Goal Definition/Goal World;
- `both` — contains a reality fact plus goal-specific meaning;
- `conversation_only` — useful for dialogue but should not become canonical
  reality;
- `unresolved` — meaning or target is insufficiently clear.

Routing is not the same as persistence.

## 4. Semantic meaning of a statement

A statement may describe, for example:

- observation/measurement;
- capability/current state;
- resource;
- constraint;
- preference;
- relationship state;
- biographical/context fact;
- planned/actual activity;
- goal-specific condition;
- correction of earlier information.

These are routing semantics. They do not create new Value Object kinds.

## 5. Matching before creation

For `reality_candidate` and `both`, the system must first search existing
observable leaf Value Objects and applicable parameter definitions.

If an existing target is found, the new observation/fact is attached through the
normal fact/measurement pipeline.

If no target exists, the system may propose a new Value Object/parameter
candidate according to the existing ontology rules. It must not silently mutate
the ontology.

## 6. Goal-specific versus general reality

Information is goal-specific when its meaning is bounded by the current goal.

Examples:

- "I am willing to invest 20,000 EUR in this business" is a goal-specific
  resource allocation;
- it does not imply "the user owns only 20,000 EUR";
- "my current liquid savings are 20,000 EUR" is a general reality observation;
- one utterance may contain both facts and therefore route as `both`.

## 7. Psychological/self-report statements

A self-description such as "I hate hotels" or "I love applause" is evidence of
a reported preference, not automatically a permanent psychological trait.

The statement may be routed into reality as a preference/behavioral candidate
when useful, but later analyses should distinguish:

- what the person says about themselves;
- what repeated behavior demonstrates;
- what occurred only in a particular situation;
- what is a derived pattern;
- what remains a model hypothesis.

This distinction is required before such information influences professional,
sport, relationship or activity suitability analysis.

## 8. Time semantics

Routing should preserve:

- when the statement was made (`knownAt`);
- when the described state applies (`effectiveAt` / validity range);
- when an observation happened (`observedAt`), if different.

Corrections create new evidence/version history. They do not silently rewrite
historical meaning.

## 9. Quality semantics

No universal confidence number.

Routing should reuse separate ARCTor quality axes and indicate whether a value
was:

- directly stated;
- measured;
- imported from a trusted device/source;
- deterministically derived;
- model-inferred candidate requiring confirmation.

## 10. Goal Intake integration

P6 may use the same answer twice without duplication of meaning:

1. as evidence for updating the current Goal Definition;
2. as input to Statement Routing for relevant shared-reality candidates.

This enables later goals to reuse already known information instead of asking
the person again.

## 11. Safety boundary

Statement Routing must not:

- interpret every personal opinion as an objective fact;
- convert one situational answer into a permanent personality trait;
- create psychological labels from sparse evidence;
- infer sensitive facts that were not supported by the input/context;
- create canonical Value Objects without the existing controlled ontology path.

## 12. Example

Input:
"I currently speak German at C1, can invest up to 20,000 EUR in this project,
and my wife wants the children to finish the school year before we move."

Possible routing:

- German C1 -> `reality_candidate`;
- 20,000 EUR allocation -> `goal_specific`;
- spouse/children timing condition -> `both`:
  - family/relationship context may be a shared-reality observation;
  - "must wait until school year ends" is also a constraint of this Goal World.

The exact routing remains evidence-backed and versioned.
