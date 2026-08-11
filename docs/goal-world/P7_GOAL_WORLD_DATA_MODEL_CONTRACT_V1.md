# ARCTor.app — P7 Goal World Data Model Contract v1

Stage: P7
Status: source contract / no database migration yet

## 1. Human meaning

A Goal World is a durable working container for one user-declared terminal
goal.

It does not copy the person's Reality Graph. It stores references to shared
Value Objects plus world-specific roles, targets, subgoals, constraints,
resources, indicators, uncertainty and version history.

Example:

- Reality Graph: body weight currently observed as 130 kg.
- Goal World revision 1: terminal goal is to reach 100 kg.
- Goal World revision 2: the same world is revised to reach 95 kg.

The 95 kg revision does not create a second world and does not overwrite the
historical 100 kg revision.

## 2. One declared terminal goal per world revision

Every Goal World revision has exactly one `terminal` objective.

That objective represents the goal the actor explicitly named/confirmed.

Other objectives may be:

- `intermediate` — a milestone or necessary result on the path to the
  terminal goal;
- `supporting` — a secondary/supporting result that contributes to the
  terminal goal.

`supporting` does not mean "unimportant". A supporting objective may be the
hardest or most influential part of the roadmap.

Intermediate/supporting objectives may form an arbitrarily deep hierarchy.
The terminal objective is the root of that goal-objective hierarchy.

## 3. No hidden-goal replacement

ARCTor may later observe evidence that appears inconsistent with the declared
terminal goal.

It may create a `proposal_only` goal-interpretation hypothesis, but it must not:

- silently replace the terminal goal;
- claim to know the actor's "real subconscious goal";
- create a new terminal goal without actor confirmation;
- rewrite historical goal statements.

The actor-declared terminal goal remains canonical until the actor changes it.

## 4. Goal revision is normal everyday behavior

A Goal World has stable identity and immutable revisions.

Changing:

- 100 kg -> 95 kg;
- target date;
- success definition;
- constraints;
- resources;
- non-negotiables;
- intermediate/supporting objectives

normally creates a new revision of the same Goal World.

A revision may record a reason when known, for example:

- user_refinement;
- new_reality_evidence;
- changed_resources;
- changed_constraints;
- feasibility_correction;
- changed_life_context;
- other.

No negative behavioral conclusion is inferred merely because a goal was
revised.

## 5. Current state and desired state are different layers

A Goal World must not turn a target into current reality.

Current state is a time-indexed projection from shared Reality Graph evidence.
Desired target criteria are world-specific.

Example:

- current body weight = 130 kg, with observation provenance;
- desired body weight = 95 kg, stored as a target criterion of the Goal World.

The current-state projection may be rebuilt later as reality changes without
creating a new goal revision merely because the person's real state changed.

A new goal revision is needed when the intention/world definition changes, not
for every new observation.

## 6. Shared Reality Graph references

The Goal World stores references to existing Value Objects. It does not copy
them.

World-specific object roles include:

- target;
- prerequisite;
- constraint;
- resource;
- support;
- indicator;
- context;
- risk.

World orientation is separate:

- approach;
- avoid;
- maintain;
- neutral.

The same Value Object may have different roles/orientations in different Goal
Worlds.

## 7. Primary target

P7 keeps one `primaryTargetValueObjectId` for the terminal objective when a
single primary Value Object can be resolved.

This is a routing/navigation anchor, not a claim that every human goal has only
one causally important object.

Additional Value Objects may participate through memberships, criteria,
relations and subgoals.

If a primary target cannot yet be resolved, it may remain null until the
compiler/proposal flow resolves it.

## 8. Goal statement and normalized definition

The exact user statement and the normalized Goal Definition remain separate.

A revision references:

- an immutable exact source statement;
- an immutable normalized Goal Definition revision produced by P6;
- the Goal World revision built from them.

The exact utterance remains provenance and is never silently rewritten.

## 9. Target criteria

A target criterion states a desired condition for a shared Value Object.

It may optionally refer to a parameter and may contain a typed target value,
unit, comparator and explanatory text.

Target criteria belong to the Goal World revision. They do not overwrite the
shared Value Object or current state.

## 10. Goal hypotheses

Goal interpretation hypotheses are optional proposal-only artifacts.

They exist specifically to support cases where later evidence suggests that the
declared terminal goal may not fully explain the actor's behavior.

P7 allows them to be recorded as hypotheses with evidence references, but:

- status is always proposal-only in P7;
- they cannot replace the terminal objective;
- they cannot create a new world automatically;
- they cannot be promoted without a later explicit controlled contract.

## 11. Target database model

P7 targets the following persistence model. Exact SQL names/FKs/RLS are applied
only after a fresh read-only schema preflight against the current database.

### `goal_worlds`

Stable identity of a Goal World.

Core fields:

- id;
- actor_id;
- lifecycle_status;
- current_revision_id;
- current_revision_number;
- created_at;
- updated_at.

### `goal_world_revisions`

Immutable definition of the world at a point in intention history.

Core fields:

- id;
- goal_world_id;
- revision_number;
- previous_revision_id;
- source_goal_statement_id;
- goal_definition_revision_id;
- revision_reason_code;
- created_at.

Uniqueness: `(goal_world_id, revision_number)`.

### `goal_world_goal_statements`

Immutable exact user statements.

Core fields:

- id;
- goal_world_id;
- actor_id;
- exact_text;
- recorded_at.

### `goal_world_goal_definitions`

Persisted normalized P6 Goal Definition revisions, or a reference to an
equivalent existing P6 persistence table if one is introduced/reused before SQL
implementation.

### `goal_world_objectives`

World-local objective hierarchy for one revision.

Core fields:

- id;
- goal_world_revision_id;
- objective_role_code;
- parent_objective_id;
- primary_target_value_object_id;
- label;
- origin_code.

Guards:

- exactly one terminal objective per revision;
- terminal parent is null;
- every non-terminal objective has a parent;
- no cycles;
- terminal origin is actor-declared/confirmed.

### `goal_world_object_memberships`

Links a world revision to shared Value Objects and gives them world-specific
roles/orientation.

No Value Object copy is created.

### `goal_world_target_criteria`

Desired conditions for shared Value Objects/parameters.

Current state is not stored here.

### `goal_world_goal_hypotheses`

Optional proposal-only interpretation hypotheses with evidence references.

P7 does not allow them to become active terminal goals.

## 12. Revision boundary

Create a new revision when intention/world definition changes.

Examples:

- target 100 kg -> 95 kg;
- target date changes;
- success definition changes;
- a new non-negotiable is accepted;
- a subgoal is added/removed;
- a world-specific resource/constraint role is materially changed.

Do not create a new revision merely because:

- a new weight observation arrived;
- sleep changed last night;
- another activity was logged;
- current derived state was recalculated.

Those are Reality Graph/runtime-state changes.

## 13. Lifecycle

P7 source contract uses:

- draft;
- definition_ready;
- compiled;
- ready_for_activity_intake;
- active;
- paused;
- completed;
- abandoned.

P7 itself only establishes the contract. P8 will define compilation and the
transition into a compiled/ready world.

## 14. P7 invariants

1. One stable world can have many immutable revisions.
2. Every revision has exactly one terminal objective.
3. The terminal objective is the actor-declared/confirmed goal.
4. Subgoals can be arbitrarily deep.
5. Supporting does not mean low importance.
6. Target changes normally create a new revision of the same world.
7. Current Reality changes do not automatically create goal revisions.
8. Desired target state never overwrites current Reality state.
9. Goal Worlds reference shared Value Objects rather than copy them.
10. Hidden/alternative-goal interpretations remain proposal-only hypotheses.
11. A hypothesis cannot replace the terminal objective without actor action.
12. No P7 weight, probability or causal claim is invented by the model.
