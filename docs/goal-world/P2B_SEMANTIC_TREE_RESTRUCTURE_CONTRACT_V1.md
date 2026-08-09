# ARCTor.app â€” Goal World Constructor
## P2B Semantic Tree Restructure Contract v1
### 9 Aug 2026

## 1. Purpose

P2B adapts the already proven P8 controlled tree-restructure engine to the
P1/P2 semantic ontology.

It does **not** create a second operation ledger.

The canonical flow remains:

`preview -> exact preview confirmation -> atomic apply -> audit -> guarded rollback`

Reused tables:

- `value_object_tree_operations`
- `value_object_tree_operation_items`

Legacy P8 v1 RPCs remain installed for compatibility. P2B introduces semantic
v2 RPCs that write to the same ledger and are intended to become the ontology
editor boundary after runtime acceptance.

## 2. Locked structural rule

Every Value Object has exactly one structural parent.

Multidimensionality is represented by typed horizontal relations, not by extra
structural parents.

Therefore:

- root has no structural parent;
- intermediate has exactly one structural parent;
- leaf has exactly one structural parent;
- semantic leaf is terminal.

## 3. Stable semantic role

`ontology_node_role_code` is immutable.

A leaf never becomes an intermediate.

If a branch needs refinement, P2B inserts a new intermediate object and reparents
selected direct children under it.

## 4. Semantic reparent

P2B reparent is allowed only for semantic:

- `intermediate`
- `leaf`

A semantic root cannot be moved under another parent and cannot be transformed
into a non-root object.

The destination parent must be:

- same owner user;
- same active actor;
- actor-scoped;
- draft or active;
- semantic `root` or `intermediate`;
- ontology-ready.

Facet rule:

- a DOMAIN root may accept a non-DOMAIN child facet;
- an intermediate may accept only a child from the same facet.

Cycle creation is forbidden.

The entire moved subtree changes root context atomically.

For legacy compatibility, `branch_type_code` follows the destination root so the
old V2 tree guard and remaining old product/service/certificate paths stay
internally consistent during the transition.

## 5. Hierarchy relation during normal reparent

Normal reparent preserves the moved object's existing
`hierarchy_relation_code`.

Changing the semantic meaning of the parent edge is a separate semantic edit and
must not be silently invented by the tree mover.

## 6. Insert intermediate

Insert-intermediate is allowed only under semantic:

- `root`
- `intermediate`

Selected objects must be direct owned children of that parent.

All selected children must belong to the same semantic facet.

The new intermediate requires explicit:

- title;
- description;
- facet;
- object kind allowed for `intermediate`;
- hierarchy relation from the new intermediate to its parent.

The selected children keep their existing hierarchy relation codes.

No relation meaning is guessed during structural refinement.

## 7. Definition history

Structural changes are semantic definition changes.

Existing P1C triggers therefore create new immutable definition versions when
parent/root changes.

Rollback does not erase those versions. Reverting the tree creates another
current structural state while historical snapshots remain immutable.

## 8. Rollback of inserted intermediate

P1 definition snapshots reference historical parents with restrictive foreign
keys.

Therefore a P2B-created semantic intermediate must **not be physically deleted**
on rollback after it has participated in semantic history.

Rollback behavior:

1. selected children are restored to their previous parents;
2. the created intermediate is marked `retired`;
3. its identity and historical definition snapshots remain;
4. retired nodes are excluded from normal P2B structure navigation.

This is intentional historical preservation, not orphan garbage.

## 9. Historical AI recalculation after reparent

A normal structural reparent does **not** automatically reinterpret old facts,
measurements, analytics or AI conclusions.

If the user explicitly requests historical recalculation, it is a separate
paid operation outside P2B.

Before that operation starts, the system must:

1. estimate affected historical scope;
2. estimate token usage;
3. show the budget to the user;
4. receive explicit confirmation;
5. set a hard maximum token limit;
6. never spend beyond the confirmed limit;
7. stop and request a new confirmation if more budget is needed.

P2B returns explicit metadata that historical recalculation was **not started**.

## 10. Aliases

Synonyms, language variants and alternative labels are aliases.

Examples:

- `Deutsch`
- `Ð½ÐµÐ¼ÐµÑ†ÐºÐ¸Ð¹`
- `Ð½ÐµÐ¼ÐµÑ†ÐºÐ¸Ð¹ ÑÐ·Ñ‹Ðº`

Alias changes do not create a new Value Object definition version.

Alias editing is P2D, not P2B.

## 11. Runtime API contract

Semantic RPCs:

- `get_value_object_tree_restructure_context_v2`
- `preview_value_object_tree_restructure_v2`
- `apply_value_object_tree_restructure_v2`
- `rollback_value_object_tree_restructure_v2`

P2B uses the existing operation tables with
`contract_version = P2B_SEMANTIC_TREE_V1`.

## 12. Gate

P2B backend closes only after live acceptance proves:

- valid semantic reparent;
- cross-facet invalid reparent rejected;
- root reparent rejected;
- cycle rejected;
- insert intermediate;
- stable leaf role;
- new intermediate has full P1 identity;
- definition versions increment;
- preview stale protection;
- idempotent apply;
- rollback restores structure;
- inserted intermediate rollback retires, not deletes;
- historical recalculation stays off;
- fixture cleanup leaves no active test structure.
## 13. Pre-apply integration hardening

Before the first database apply, P2B is additionally hardened against four
cross-layer integration failures:

1. A P2B operation row in the shared P8 ledger may be changed only while the
   transaction carries the P2B controlled-flow context. This prevents the
   legacy P8 rollback RPC from committing a rollback against a P2B operation.
2. A semantic intermediate retained as `retired` after rollback remains
   available for historical replay but is excluded from ordinary P2A
   descendant navigation, child counts, facet counts and subtree counts.
3. The rollback audit for a retained created intermediate records its actual
   retained parent/root/branch state rather than the pre-creation NULL state.
4. Apply idempotency responses expose `operationStatus` and
   `rolledBackByOperationId`, so replay after rollback cannot misleadingly
   report the original operation as still applied.

These protections do not activate historical AI recalculation and do not
change the locked token-budget policy.
