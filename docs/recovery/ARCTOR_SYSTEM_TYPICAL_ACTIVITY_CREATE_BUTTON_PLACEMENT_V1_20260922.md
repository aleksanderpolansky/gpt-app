# ARCTOR — System Typical Activity Create Button Placement V1

Date: 2026-09-22
Baseline: c53d2d01a7894b49a6f18ec310e1bd6c76368698

UI-only correction.

The button `+ Добавить системную типовую активность` is moved into the
upper-left system catalog card, directly under `Системные типовые активности`,
matching the existing `Мои типовые активности` layout.

The form still opens in the main work area.

No DB/API/formula/ontology changes.

## Execution evidence

- Product commit: `0b5f7f970b61ed365c9f607649c0388cf98817ca`
- git diff --check: PASS
- scoped ESLint: PASS
- production build: PASS
- DB migration: NOT REQUIRED
