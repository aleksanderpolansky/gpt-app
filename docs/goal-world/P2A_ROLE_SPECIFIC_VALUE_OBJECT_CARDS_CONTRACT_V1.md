# ARCTor.app â€” Goal World Constructor
## P2A Role-Specific Value Object Cards Contract v1

P2A turns the generic P1C ontology card into a structure-aware card used by the
manual Value Object editor.

P2A is deliberately read-only at the new editor boundary.

Structural writes remain behind the existing P8 preview/apply/rollback machinery
until P2B adapts it to the semantic ontology rules.

## 1. One object, three structural presentations

`value_objects` remains one entity.

The semantic role selects the presentation:

- `root` -> ROOT_CARD
- `intermediate` -> INTERMEDIATE_CARD
- `leaf` -> LEAF_CARD

No separate root/intermediate/leaf tables are created.

## 2. P2A structure card

`get_value_object_structure_card_v1(...)` returns:

- the complete P1C core card;
- resolved semantic card type;
- complete structural path from root to current node;
- immediate semantic children;
- child counts by semantic role;
- subtree size;
- structural editor capabilities.

## 3. ROOT_CARD

A root card is the entry point to a domain.

It exposes:

- root identity and definition;
- immediate branches;
- child facet distribution;
- subtree size;
- ability to add an intermediate or leaf branch;
- no reparent action;
- no insert-above action.

A root remains `DOMAIN / domain_root / root`.

## 4. INTERMEDIATE_CARD

An intermediate card exposes:

- parent;
- root;
- full path;
- immediate children;
- subtree size;
- ability to add children;
- ability to reparent through controlled preview/apply;
- ability to insert another intermediate above it.

## 5. LEAF_CARD

A leaf card exposes:

- parent;
- root;
- full path;
- no structural children;
- no add-child action;
- ability to refine by inserting an intermediate above it;
- ability to reparent through controlled preview/apply.

A leaf never becomes an intermediate by changing
`ontology_node_role_code`.

Refinement creates or inserts structure around the stable leaf identity.

## 6. P2A capabilities

The card returns capabilities, not permissions to bypass the database.

Capabilities are derived from semantic structure:

- `canAddIntermediateChild`
- `canAddLeafChild`
- `canInsertIntermediateAbove`
- `canReparent`
- `canPreviewRestructure`
- `canRename`
- `canEditSemanticDefinition`
- `canManageRecognition`

P2A only exposes them to the UI.

Because the structure-card RPC is `SECURITY DEFINER`, every ancestor, child,
grandchild-count and subtree traversal is additionally restricted to the same
actor owner as the selected Value Object. This is defense in depth on top of the
existing database ownership guards.

Actual structural write safety remains P2B.

## 7. Existing P8 reuse

P2A does not create a second tree-operation ledger.

P2B must reuse:

- `value_object_tree_operations`
- `value_object_tree_operation_items`
- preview/apply/rollback flow
- existing idempotency and rollback protections

and add semantic ontology validation.

## 8. Recognition boundary

Existing `concept_aliases` is retained as the canonical lexical alias store.

P2A only reports alias count when rows use:

- `concept_type = value_object`
- `concept_id = value_objects.id`

P2A does not write aliases.

If current runtime data uses another `concept_type` convention, P2D must resolve
that through a dedicated compatibility gate before alias writes are enabled.

## 9. API

`GET /api/value-objects/ontology/{id}/structure-card`

Returns:

```json
{
  "ok": true,
  "card": {
    "contractVersion": "value-object-structure-card-v1",
    "cardType": "ROOT_CARD|INTERMEDIATE_CARD|LEAF_CARD",
    "core": {},
    "path": [],
    "children": [],
    "summary": {},
    "recognition": {},
    "capabilities": {}
  }
}
```

## 10. P2A non-goals

P2A does not:

- execute tree restructure writes;
- change existing P8 write RPCs;
- retire legacy tree fields;
- alter product/service/certificate flows;
- edit titles/descriptions;
- write aliases;
- create AI recognition rules;
- call AI.

## 11. P2A acceptance gate

After apply:

1. mapped root returns ROOT_CARD;
2. mapped leaf returns LEAF_CARD;
3. P1C access control is preserved;
4. leaf returns zero semantic children;
5. path resolves to root;
6. root cannot report reparent capability;
7. leaf cannot report add-child capability;
8. existing 15 Value Objects and 15 definition versions remain unchanged.
