# ARCTOR — E04 Activity Facts Graphic Standard Palette V1

Date: 2026-09-21
Release: ARCTOR_E04_ACTIVITY_FACTS_GRAPHIC_STANDARD_PALETTE_V1_20260921
Baseline: 5d8cf1a182ca70cee527795c6a941cf1fb0e690e

## Reason

The previous visual-standardization step improved density and proportions, but the
Activity Facts page still used too many unrelated semantic colors at the same time.
That created visual inconsistency with the Observation Objects catalog and with the
provided high-fidelity graphical standard.

## Reference graphical standard

The palette used by this release is limited to the graphical-standard colors:

- page background: #f0f2f7
- card/background surface: #ffffff
- primary foreground: #1a1d2e
- secondary foreground: #5a5f7a
- muted foreground: #7c8099 / #9ca3b8
- input/background surface: #f5f6fb
- primary action/accent: #3b6ef8
- primary secondary surface: #eef2ff
- neutral border: rgba(0,0,0,0.08)

Red is retained only for destructive/error states.

## Activity Facts page

- Removed green, violet, orange, indigo, amber and Tailwind palette accents from the normal page state.
- All KPI/summary numbers now use the same neutral foreground.
- Collection tabs use only neutral styling plus the single primary blue selected state.
- Observation-object chips are neutral; primary blue is used only as an interaction/link accent.
- Fact values no longer sit inside a separate colored metric badge.
- Fact roles are neutral text.
- Confirmed/proposed/pending statuses are neutral pills.
- Only rejected/error state may use destructive red.
- The page-load status indicator is neutral; blue is used only while actively loading.
- Apply is the standard primary blue button; Reset is a standard neutral secondary button.
- Detail cards use white/neutral surfaces instead of role-specific colored panels.

## Snapshot page

- Removed green and amber surfaces from the normal snapshot flow.
- Explanatory panel uses a neutral standard card.
- Primary save action uses the standard primary blue.
- Success uses the primary/secondary blue system rather than green.
- Error uses destructive red only.
- Search and write behavior are unchanged.

## Boundaries

- No DB migration.
- No API changes.
- No business-logic changes.
- No fact collection changes.
- No snapshot write-contract changes.
- Styling/palette only.

## Validation

The package runner must pass:
- git diff --check
- scoped ESLint for both pages
- production build

Only after PASS:
- product commit
- recovery commit
- push main
