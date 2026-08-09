# ARCTor.app — Goal World Constructor
## P2C Value Object Definition Editor Contract v1
### 9 Aug 2026

## 1. Purpose

P2C separates three different actions that must not be conflated:

1. changing the primary Value Object title;
2. changing the semantic definition;
3. changing the structural position in the tree.

P2B remains the only structural tree-write boundary.

P2C does not create or move parents and does not change root pointers.

Recognition aliases remain P2D.

## 2. Primary title rename

The primary title is part of the canonical semantic definition.

Changing it:

- keeps the same Value Object id;
- keeps the same canonical key;
- creates the next immutable definition version;
- records version provenance as `P2C_RENAME_V1`.

A primary title is not the same thing as an alias.

## 3. Semantic definition edit

P2C v1 exposes controlled editing of:

- description;
- hierarchy relation to the current structural parent;
- visibility;
- privacy class.

These changes:

- keep the same Value Object identity;
- create the next immutable definition version when the value actually changes;
- record version provenance as `P2C_SEMANTIC_DEFINITION_EDIT_V1`.

P2C v1 deliberately does not edit:

- `canonical_key`;
- `ontology_node_role_code`;
- `parent_value_object_id`;
- `root_value_object_id`;
- `facet_code`;
- `object_kind_code`.

Parent/root movement belongs to P2B.

Facet/kind reclassification is intentionally not exposed as a generic field edit
because it can invalidate descendants and ontology constraints. It requires a
future controlled reclassification operation if needed.

## 4. No-op semantics

Saving the same values again does not create a new definition version.

The response explicitly marks `stateAlreadySatisfied=true`.

## 5. Idempotency

Every P2C write uses an idempotency key and request hash.

A repeated identical request returns the stored response.

The same idempotency key with different payload is rejected.

## 6. Version provenance

P2C creates `value_object_definition_edit_requests`.

For a real definition-version change, the immutable
`value_object_definition_versions` snapshot receives provenance containing:

- edit request id;
- edit kind;
- owner user id;
- owner actor id;
- editing actor id.

The old P1C snapshot behavior remains the fallback for all non-P2C writes.

## 7. Permissions

P2C v1 is actor-owner scoped.

A write is allowed only when:

- the Value Object has `scope_code='actor'`;
- `owner_user_id` is the current application user;
- `owner_actor_id` is the current active actor;
- the actor is active and owned by that user;
- Value Object status is `draft`, `active` or `inactive`.

Platform administration does **not** silently impersonate the owner through this
endpoint.

`platformAdminOverride=false` is returned explicitly by the editor contract.

If platform-admin semantic mutation is required later, it must be a separate
audited override operation with an explicit reason.

## 8. Legacy PATCH isolation

The existing legacy `/api/value-objects/[id]` PATCH remains available for
non-ontology commercial/profile fields.

For ontology-ready Value Objects it is no longer allowed to write `title` or
`description`.

Those fields must pass through the P2C definition editor, so version provenance
cannot be bypassed by the old route.

## 9. Aliases are P2D

The intake found that the existing `concept_aliases` table is reusable in
principle, but it is not yet a Value Object alias contract:

- `concept_type='value_object'` is currently not allowed by its constraint;
- P2A currently checks alias status `active`, while the alias registry uses
  statuses such as `approved` and `published`;
- there are currently zero Value Object aliases.

Therefore P2C does not patch the alias table.

P2D will extend the existing lexical store instead of inventing a second alias
table.

Locked semantic rule for P2D:

> synonyms / language variants / alternative labels do not create a Value
> Object definition version.

## 10. Runtime gate

P2C closes only after live acceptance proves:

- rename increments definition version;
- rename provenance is `P2C_RENAME_V1`;
- description edit increments definition version;
- semantic-edit provenance is `P2C_SEMANTIC_DEFINITION_EDIT_V1`;
- no-op edit does not increment version;
- idempotent replay does not increment version;
- wrong actor is denied;
- retired object is not editable;
- canonical key remains immutable;
- semantic node role remains immutable;
- parent/root cannot be edited through P2C;
- legacy PATCH cannot bypass P2C title/description boundary;
- runtime fixtures roll back cleanly.
