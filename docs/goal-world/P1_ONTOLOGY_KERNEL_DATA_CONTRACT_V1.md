# ARCTor.app — Goal World Constructor
## P1 Ontology Kernel Data Contract v1

Status: P1A contract foundation.

This document defines the new semantic ontology layer without yet switching
existing production routes from the July storage conventions.

## 1. Core semantic facets

System facets:

- `DOMAIN`
- `ENTITY`
- `PROCESS`
- `STATE`
- `RELATIONSHIP`
- `ROLE`
- `KNOWLEDGE`
- `BEHAVIOR`
- `CONTEXT`

`COMMUNICATION` is represented as PROCESS or RELATIONSHIP according to its nature.
`RESOURCE` is normally an ENTITY.
`GOAL` and `MOTIVATION` are Goal World roles/relations, not ontology facets.

## 2. Semantic node roles

- `root`
- `intermediate`
- `leaf`

A leaf is the terminal semantic address for direct facts/measure-backed links.
It is not restricted to activity patterns.

P1A stores this new role in `ontology_node_role_code` while the current runtime
continues to use its legacy `node_role_code`.

## 3. Hierarchy relation codes

- `is_a`
- `part_of`
- `aspect_of`
- `subprocess_of`

Structural hierarchy uses exactly one parent.

Cross-facet meaning belongs in typed semantic relations, not second parents.

## 4. Scope

- `global`
- `actor`

Organization, person and avatar are actors.
Visibility is independent of scope.

## 5. Visibility

- `private`
- `shared`
- `public`

## 6. Privacy class

- `public_ontology`
- `standard`
- `sensitive`
- `restricted`

## 7. Lifecycle

Logical lifecycle values:

- `candidate`
- `draft`
- `active`
- `inactive`
- `retired`

P1A does not yet replace all legacy application status checks.

## 8. Origin

- `system_model`
- `expert_model`
- `user_declared`
- `ai_candidate`
- `imported_standard`
- `legacy`

## 9. Stable identity and versioning

`value_objects.id` remains stable.

Definition changes are snapshotted in `value_object_definition_versions`.

A definition version contains enough ontology fields to reconstruct the meaning
used by historical analysis.

P1A creates the ledger structure. Automatic snapshot triggers are deferred until
the P1 runtime cutover so existing routes are not silently changed.

## 10. Kind registry

`value_object_kind_registry` is a system-governed policy registry.

Each kind knows at minimum:
- its facet
- allowed node roles
- whether it is active
- a version
- policy JSON for later parent/child/relation/parameter guards

P1A seeds only unambiguous generic/system kinds.
Ambiguous legacy kinds are not silently mapped.

## 11. P1A non-goals

P1A does not:
- execute SQL
- backfill existing Value Objects
- change certificate/product/service runtime
- rewrite old facts
- create Goal World tables
- activate AI
- replace relation or parameter contracts
- change existing production routes

## 12. P1 sequence after this contract

P1A — registries + additive semantic columns + definition-ledger structure  
P1B — controlled mapping/backfill and canonical root/intermediate/leaf guards  
P1C — definition snapshot lifecycle + create/read RPC/API contract  
P1D — runtime acceptance and old-role retirement plan

P1 gate closes only when root/intermediate/leaf can be created and read without AI
under the new ontology contract.
