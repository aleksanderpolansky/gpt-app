# ARCTOR — E04 Activity Facts UI Standardization V1

Date: 2026-09-21
Release: ARCTOR_E04_ACTIVITY_FACTS_UI_STANDARDIZATION_V1_20260921
Baseline: 29ca8e1ffd001116d41e20d98d90c364448098db

## Goal

Keep the already working fact collections and snapshot search unchanged functionally,
but bring the two pages closer to the visual conventions already used in ARCTor catalogs
such as Observation Objects, Certificates and Enterprises.

## Product changes

### /activity-facts
- Remove the oversized hero-card treatment from the page header.
- Use the same light workspace background and wider content canvas as the catalog pages.
- Localize the small FACTS eyebrow instead of showing the English-only "Activity facts".
- Reduce oversized typography and card radii.
- Make summary cards more compact.
- Present collection tabs as compact catalog-style pills without an extra large container card.
- Compact the cards/table switch.
- Reduce filter-panel, list-row, detail-panel and button radii/padding to the current catalog visual language.
- Preserve all collection behavior:
  - all values;
  - planned values;
  - completed activities;
  - state snapshots;
  - other values.

### /activity-facts/snapshot
- Remove the oversized hero-card treatment.
- Use the same page background, wider canvas, heading scale and compact controls as the standard catalog pages.
- Keep the explanatory state-snapshot block.
- Keep snapshot search and the existing write contract unchanged.
- Compact form fields, alerts and primary action.

## Boundaries

- No DB migration.
- No API change.
- No snapshot write-contract change.
- No new catalog or whitelist.
- No collection logic change.
- Styling/layout only plus localized FACTS eyebrow.

## Validation

The package runner must pass:
- git diff --check
- scoped ESLint for both changed pages
- production build

Only after PASS:
- product commit
- recovery commit
- push main
