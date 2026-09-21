# ARCTOR — Snapshot Searchable Combobox V1

Date: 2026-09-21
Release: ARCTOR_SNAPSHOT_SEARCHABLE_COMBOBOX_V1_20260921
Baseline: 58f3e334fc71095a28a903d6e23a79ce8429c075

## User-visible problem

The snapshot page had a text field called "Поиск по списку" plus a separate native
`select`.

The text field did filter the option array correctly — the UI even showed `1 / 2` —
but the matched ON stayed hidden inside the closed native dropdown until the user
clicked the selector.

This made a working filter look like a broken search.

## Correction

The separate search field and native selector are replaced by one searchable combobox.

Behavior:
- focus opens the available ON/parameter list;
- typing filters the list immediately;
- matching options are visible immediately under the input;
- clicking a result selects it;
- ArrowUp / ArrowDown move through results;
- Enter selects the highlighted result;
- Escape closes the list;
- the selected option remains visible in the field;
- choosing an option still sets the canonical unit exactly as before.

## Important boundaries

No API change.
No DB change.
No ontology change.
No snapshot eligibility change.
No fact-write contract change.
No Mass assignment change.

The snapshot selector continues to use only system assignments returned by the
existing `/api/activity/facts/snapshots` endpoint.

## Acceptance

For RU:
1. open `/activity-facts/snapshot?locale=ru`;
2. click the ON/parameter field;
3. type `прот`;
4. the visible result list must immediately show:
   `Текущая порция протеиновой добавки · Масса`;
5. click it;
6. the selected value must remain in the field;
7. Unit must resolve from the existing Mass assignment;
8. save 35 gram in the next manual smoke test.

## Recovery rule

Release is closed only after:
- git diff --check PASS;
- scoped ESLint PASS;
- production build PASS;
- product commit;
- separate docs/recovery commit;
- push main PASS.

## Actual execution evidence

- Product commit: `bb8fd66afe6c85281303b23e72605e2878ef0c07`
- git diff --check: PASS
- scoped ESLint: PASS
- production build: PASS
