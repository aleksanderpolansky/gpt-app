# ARCTor.app — Goal World Constructor
## P2D Value Object Aliases & Deterministic Recognition Contract v1
### 9 Aug 2026

## 1. Purpose

P2D makes lexical identity explicit without changing Value Object identity.

Examples such as:

- `Deutsch`
- `немецкий`
- `немецкий язык`
- `German`

may all point to one Value Object.

Aliases do not create or mutate Value Object definition versions.

## 2. Reuse the shared alias registry

P2D reuses `public.concept_aliases`.

It does not create a second Value Object alias table.

The existing polymorphic `concept_type` registry is extended with:

`value_object`

The existing normalized key remains:

`lower(btrim(alias_text))`

No fuzzy database extension is introduced in P2D v1.

## 3. Primary title versus alias

The primary title remains part of the semantic definition.

Changing the primary title is P2C and creates the next immutable definition version.

Adding, archiving or restoring an alias is P2D and does **not** create a Value Object definition version.

An alias equal to the current primary title after normalization is rejected as redundant.

## 4. Alias lifecycle

P2D v1 owner management supports:

- `add`
- `archive`
- `restore`

Owner-confirmed aliases use:

- `source_type='owner_confirmed'`
- `status='approved'`

An archived alias is not physically deleted.

This keeps lexical history while removing it from recognition.

Recognition-active statuses are:

- `approved`
- `published`

## 5. Locale

An alias may have a locale or may be language-independent.

P2D stores locale in the existing `concept_aliases.locale` field.

Locale is normalized to lowercase.

Examples:

- `de`
- `ru`
- `en`
- `pl`
- `uk`
- `es`
- `cs`

The same normalized alias may exist for one Value Object in different locales because the existing unique index already includes locale.

## 6. Owner permissions

Alias management is actor-owner scoped.

The Value Object must:

- use `scope_code='actor'`;
- belong to the current application user;
- belong to the current active actor;
- be ontology-ready;
- have status `draft`, `active` or `inactive`.

`retired` Value Objects cannot be edited through P2D.

P2D RPCs are server-only: browser roles do not execute them directly.

## 7. Deterministic recognition

P2D v1 provides exact deterministic recognition.

Input text is normalized with the same rule as aliases:

`lower(btrim(text))`

Candidates come from:

1. current primary titles;
2. `approved` / `published` Value Object aliases.

Recognition is owner/actor scoped and ignores retired objects.

Locale affects ordering, not basic exact recognition:

1. primary title exact match;
2. alias with exact requested locale;
3. language-independent alias;
4. exact alias in another locale.

If exactly one Value Object matches, `resolvedValueObjectId` is returned.

If multiple Value Objects match the same normalized text, the result is explicitly `ambiguous=true`; P2D does not silently choose one.

## 8. P2A card repair

P2A currently counts aliases with a non-existent lifecycle value `status='active'`.

P2D repairs the live structure-card function to count:

`status in ('approved','published')`

and changes:

`recognition.writeEnabled`

from `false` to `true`.

## 9. No definition-version side effect

P2D writes only `concept_aliases`.

It does not update `value_objects`.

Runtime acceptance must prove that:

- adding an alias does not increment `definition_version`;
- archiving an alias does not increment `definition_version`;
- restoring an alias does not increment `definition_version`.

## 10. Public exposure

P2D v1 does not broaden direct public-table visibility for Value Object aliases.

Owner management and recognition go through server-side RPCs.

Public cross-user recognition can be added later as a separate policy decision without changing alias identity.

## 11. Runtime gate

P2D closes only after live acceptance proves:

- `value_object` is accepted by the shared alias registry;
- add / duplicate-add / archive / restore are idempotent by state;
- primary-title duplicate is rejected;
- definition version stays unchanged;
- P2A alias count uses approved/published aliases;
- exact recognition resolves one Value Object;
- locale preference is deterministic;
- ambiguous exact matches are returned as ambiguous;
- wrong actor is denied;
- retired Value Object is not manageable;
- runtime fixtures roll back cleanly.
