# ARCTor.app â€” Goal World Constructor
## P1C Runtime Ontology Create/Read Contract v1

Baseline:

- branch: `feat/gw-p1a-ontology-kernel-20260809`
- P1B commit: `ee8a96239c05eb8b07574a394c94c8a4472ed6e1`
- 15 legacy Value Objects already mapped to P1 ontology
- 15 immutable definition-version rows already present
- old production routes still use legacy tree fields

P1C turns the P1 ontology from a stored classification into a controlled runtime.

## 1. What P1C adds

1. Database guard for ontology-complete Value Objects.
2. Automatic immutable definition snapshots for new and changed definitions.
3. Controlled actor-scoped creation RPC.
4. Assembled read RPC for the core Value Object card.
5. Controlled lifecycle RPC for activate / deactivate / reactivate / retire.
6. Server API routes that call those RPCs after resolving the active actor.
7. Read-only diagnostics for deployment review.

## 2. Structural rules

### Root

A new ontology root must be:

- `ontology_node_role_code = root`
- `facet_code = DOMAIN`
- `object_kind_code = domain_root`
- no parent
- no hierarchy relation
- `root_value_object_id = id`

### Non-root under a DOMAIN root

The first child chooses its semantic facet.

Example:

`Career [DOMAIN root]`
-> `Professional role [ROLE]`
-> `HR specialist [ROLE]`

or a short branch:

`Health [DOMAIN root]`
-> `Knee joint [ENTITY leaf]`

### Non-root under a non-root parent

The child must remain in the same facet as its parent.

Cross-facet meaning is represented later by typed semantic relations, not by a
second structural parent.

### Parent role

A parent may be `root` or `intermediate`.

A `leaf` may not have children.

## 3. Compatibility with the old runtime

The July tree engine still requires:

- legacy `node_role_code`
- legacy `object_kind`
- legacy `branch_type_code`

P1C therefore uses a compatibility bridge:

- semantic root/intermediate/leaf is stored in `ontology_node_role_code`;
- newly created P1C objects use legacy `node_role_code = structural`;
- newly created P1C objects use legacy `object_kind = other`;
- a new inactive technical branch code `ontology_v1` is used only for newly
  created P1C roots;
- descendants of an existing mapped root inherit that root's old branch code.

`ontology_v1` is not a new semantic facet and must not be shown as a user choice.

Compatibility is deliberately one-way:

- old product/service/certificate flows may continue under the mapped legacy roots;
- old routes may not create P1-null children inside a new `ontology_v1` tree;
- no route, old or new, may create a child under a semantic `leaf`.

This keeps the existing commercial runtime working while making newly created
P1C ontology trees semantically closed.

This bridge is temporary and is removed only after the old write paths are
retired.

## 4. Actor scope

The first runtime creator is deliberately actor-scoped.

New objects created by the P1C public API have:

- `scope_code = actor`
- current active actor as owner
- `origin_type_code = user_declared`
- initial `status = draft`

Global ontology publication belongs to the later expert/model/admin workflow and
is not silently exposed through the ordinary user API.

## 5. Canonical key

For actor-scoped runtime objects P1C generates an opaque stable key from actor ID
and Value Object ID.

This prevents:
- title rename from changing identity;
- accidental duplicate semantic slugs;
- users needing to design machine identifiers.

Global/expert ontology packages may later use human-readable package-stable keys.

## 6. Definition versions

Creation writes definition version 1 automatically.

A new immutable definition version is created when the semantic definition
changes, including:

- title
- description
- facet
- kind
- node role
- parent/root/hierarchy relation
- scope
- visibility/privacy
- validity interval
- origin

Lifecycle status alone does not create a new semantic definition version.

`canonical_key` cannot be changed after creation.

`ontology_node_role_code` cannot be changed after creation. In particular, a leaf
cannot become an intermediate node.

## 7. Lifecycle

Allowed controlled transitions:

- draft -> active
- active -> inactive
- inactive -> active
- draft -> retired
- active -> retired
- inactive -> retired

Retired is terminal in P1C.

Deactivation preserves identity, history and versions.

## 8. Create API

`POST /api/value-objects/ontology`

Required body:

```json
{
  "title": "Professional communication",
  "description": "Recurring professional communication as an observable process.",
  "facetCode": "PROCESS",
  "objectKindCode": "generic_process",
  "nodeRoleCode": "leaf",
  "parentValueObjectId": "uuid",
  "hierarchyRelationCode": "aspect_of",
  "idempotencyKey": "client-generated-key"
}
```

For root creation:

```json
{
  "title": "Career",
  "description": "The actor's professional life and development.",
  "facetCode": "DOMAIN",
  "objectKindCode": "domain_root",
  "nodeRoleCode": "root",
  "idempotencyKey": "client-generated-key"
}
```

## 9. Read API

`GET /api/value-objects/ontology/{id}`

Returns the assembled core card:

- identity
- ontology
- parent
- root
- facet registry data
- kind policy
- current definition version
- latest immutable definition snapshot
- allowed lifecycle actions

## 10. Lifecycle API

`POST /api/value-objects/ontology/{id}/lifecycle`

```json
{
  "status": "active"
}
```

## 11. P1C non-goals

P1C does not yet:

- replace the old `/api/value-objects` authoring flow;
- change product/service/certificate creation;
- implement P2 tree refinement;
- create recognition profiles;
- allow leaf facts through the new contract;
- create cross-facet semantic relations;
- expose global ontology publishing;
- call AI.

## 12. P1C gate

After database apply and runtime acceptance:

1. actor can create a root without AI;
2. actor can create an intermediate under it;
3. actor can create a leaf under it;
4. the read RPC/API returns the assembled card;
5. wrong facet/kind/parent combinations are rejected;
6. leaf cannot become intermediate or accept children;
7. canonical key is stable;
8. definition versions are created automatically;
9. deactivate/reactivate preserves ID and history.

P1D performs the live acceptance fixture and decides the old-role retirement plan.
