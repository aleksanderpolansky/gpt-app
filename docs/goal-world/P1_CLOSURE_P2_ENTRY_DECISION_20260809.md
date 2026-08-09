# ARCTor.app — Goal World Constructor
## P1 Closure / P2 Entry Decision
### 9 Aug 2026

## P1 status

**CLOSED.**

P1 runtime acceptance was executed against the live Supabase schema with all
temporary fixtures inside a single transaction.

Acceptance result:

- 19 / 19 checks passed;
- root creation passed;
- intermediate creation passed;
- leaf creation passed;
- assembled ontology card read passed;
- cross-facet structural child was rejected;
- child under semantic leaf was rejected;
- kind/facet mismatch was rejected;
- wrong-actor read was rejected;
- canonical key is immutable;
- semantic node role is immutable;
- semantic definition update created definition version 2;
- lifecycle activate / deactivate / reactivate passed;
- rollback cleanup passed;
- permanent P1D fixture rows: 0.

P1 therefore satisfies the runtime gate:

> root / intermediate / leaf can be created and read deterministically without AI.

## Legacy role retirement

**DEFER.**

Do not remove or reinterpret the old runtime fields yet:

- `object_kind`
- `node_role_code`
- `branch_type_code`

They are still used by product, service, certificate and older Value Object
authoring flows.

They remain a temporary compatibility bridge.

Retirement must happen only after the P2 structure editor and the affected old
write paths are migrated to the semantic ontology contract.

## Fresh P2 audit

Live database at P2 entry:

- 15 Value Objects;
- 5 semantic roots;
- 0 semantic intermediates;
- 10 semantic leaves;
- 15 definition-version rows;
- 0 tree restructure operations;
- 0 tree restructure operation items.

Existing P8 tree-restructure machinery is present:

- `preview_value_object_tree_restructure_v1`
- `apply_value_object_tree_restructure_v1`
- `rollback_value_object_tree_restructure_v1`
- `value_object_tree_operations`
- `value_object_tree_operation_items`

Decision: **REUSE AND ALTER**, not replace.

Important limitation found by the audit:

- the existing P8 functions know `root_value_object_id`;
- they do not yet operate on the new `ontology_node_role_code` and `facet_code`
  contract as their canonical semantic rules.

Therefore P2 must adapt those operations before exposing them as the canonical
new ontology editor.

Recognition audit found the existing `concept_aliases` table. It is reusable as
the shared lexical alias store. A richer recognition-profile contract is still a
separate P2 substep and must not duplicate aliases blindly.

## P2 entry sequence

P2A:
- role-specific read cards for root / intermediate / leaf;
- structure path and children;
- editor capabilities;
- no structural writes yet.

P2B:
- adapt P8 preview/apply/rollback to semantic roles and facets;
- safe insert intermediate;
- controlled reparent/refinement.

P2C:
- explicit lexical rename vs semantic-definition edit;
- editor permissions and version provenance.

P2D:
- aliases and recognition profiles;
- reuse `concept_aliases` for lexical aliases.

P2 gate closes only after the manual editor is runtime-tested and rollback-safe.
