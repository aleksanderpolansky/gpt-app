# UI-0 — UI implementation track protocol

Дата: 01.06.2026  
Статус: documentation-only / transition gate / no runtime changes  
Связанный lock: C34-E.5 — Final Semantic Block readiness lock and next implementation decision  
C34 status: C34-A–E = 25/25 complete  
UI-0 progress after this document creation: 6/14

## 1. Purpose

UI-0 formally opens the UI implementation track after C34-E.5.

UI-0 is not the implementation of the interface.

UI-0 is a transition protocol between:

1. completed semantic readiness documentation;
2. current Next.js interface inventory;
3. future UI implementation blocks;
4. later runtime, route, DB, and write-gated behavior.

The purpose of UI-0 is to avoid mixing documentation readiness, UI inventory, UI coding, semantic runtime, DB reads, DB writes, and commercial core behavior in one unsafe step.

## 2. Why UI starts as a separate track

The semantic block is ready at documentation level after C34-E.5.

This does not mean that:

- semantic runtime exists;
- production category derivation is active;
- Value Object writes are enabled;
- State Facts are written;
- State Deltas are written;
- State Snapshots are written;
- Semantic Capital is written;
- audit rows are written;
- correction rows are written;
- feedback rows are written;
- final Next Best Action exists;
- UI implementation exists.

Therefore UI must start as a separate implementation track with its own gates, counters, allowed files, forbidden files, and verification steps.

## 3. What UI-0 does

UI-0 does the following:

- confirms that C34-E.5 has been committed and pushed;
- confirms C34-A–E = 25/25 complete;
- creates this UI implementation track protocol;
- registers the UI-0 ... UI-18 roadmap;
- defines gate taxonomy for future UI steps;
- locks forbidden scope for UI-0;
- defines UI-0 Definition of Done;
- creates a countdown template for future UI development responses;
- prepares UI-1 read-only inventory brief;
- stops before UI-1 and asks for explicit continuation.

## 4. What UI-0 does not do

UI-0 does not implement UI.

UI-0 does not change app/page.tsx.

UI-0 does not create React components.

UI-0 does not create routes.

UI-0 does not create API routes.

UI-0 does not create adapters.

UI-0 does not create fixtures.

UI-0 does not call DB.

UI-0 does not run SQL.

UI-0 does not read DB.

UI-0 does not write DB.

UI-0 does not connect OpenAI runtime.

UI-0 does not add persistence.

UI-0 does not change commercial core.

UI-0 does not change production behavior.

## 5. Why UI-1 is read-only inventory

The first practical UI step after UI-0 is UI-1.

UI-1 must be read-only because before changing code we need to identify:

- current Next.js app structure;
- current main page file;
- current input field;
- current send button;
- current submitted message block;
- current GPT response block;
- existing routes;
- existing commercial core pages;
- existing components that can be reused;
- current project conventions.

UI-1 must not edit files.

UI-1 must not commit.

UI-1 must not create UI.

UI-1 must not create routes.

UI-1 must not touch DB.

UI-1 must produce only an inventory report or a read-only summary unless a separate documentation save gate is opened.

## 6. UI-0 microstep counter

UI-0 consists of 14 microsteps:

1. UI-0.1 — Verify C34-E.4 clean point.
2. UI-0.2 — Confirm C34-E.5 not created yet.
3. UI-0.3 — Create C34-E.5 final readiness lock.
4. UI-0.4 — Verify C34-E.5 anchors.
5. UI-0.5 — Commit/push C34-E.5.
6. UI-0.6 — Create UI-0 transition document.
7. UI-0.7 — Register UI-0 ... UI-18 numbering.
8. UI-0.8 — Define gate taxonomy.
9. UI-0.9 — Lock forbidden scope for UI-0.
10. UI-0.10 — Define UI-0 Definition of Done.
11. UI-0.11 — Create countdown template for future UI steps.
12. UI-0.12 — Commit/push UI-0 protocol.
13. UI-0.13 — Prepare UI-1 read-only inventory brief.
14. UI-0.14 — Stop gate before UI-1.

Current expected status after creating this file:

UI-0 progress: 6/14  
Left in UI-0: 8  
C34-A–E: 25/25 complete  
UI track: opened in documentation  
No UI code changed yet

## 7. Gate taxonomy overview

Future UI steps must explicitly declare one of the following gate types:

1. read-only — only search, inspect, list, map, inventory.
2. documentation-only — documentation changes only.
3. fixture-only UI — UI rendered from static fixture data only.
4. local-state UI — UI using local state only, no backend.
5. no-write route UI — route calls allowed only when no writes are possible.
6. read-only DB UI — DB reads allowed only after explicit read gate.
7. write-gated UI — any persistence requires a separate explicit write gate.

## 8. Forbidden scope for UI-0

During UI-0 it is forbidden to:

- change app/page.tsx;
- change src/app/page.tsx;
- create React components;
- create UI components;
- create pages;
- create routes;
- create API routes;
- create adapters;
- create fixtures;
- import DB clients;
- import Supabase clients;
- run SQL;
- create migrations;
- read DB;
- write DB;
- connect OpenAI runtime;
- add persistence;
- modify commercial core;
- modify package/config/runtime files;
- change production behavior.

## 9. UI-0 Definition of Done

UI-0 is complete when:

- C34-E.5 is committed and pushed;
- C34-A–E = 25/25 complete;
- UI-0 transition document exists;
- UI-0 ... UI-18 numbering is registered;
- gate taxonomy is defined;
- forbidden scope for UI-0 is locked;
- UI-0 Definition of Done is documented;
- countdown template for future UI steps exists;
- UI-1 read-only inventory brief is prepared;
- UI-0 stops before UI-1;
- no UI code was changed;
- no runtime code was changed;
- no SQL was executed;
- no DB reads were executed;
- no DB writes were executed;
- no route was created;
- no adapter was created;
- no fixture file was created;
- no production behavior was changed.

## 10. Next step

Next microstep:

UI-0.7 — Register UI-0 ... UI-18 numbering.

UI-0.7 should extend or verify this protocol with the complete UI roadmap numbering from UI-0 to UI-18.

No code should be changed in UI-0.7.

No commit should be performed in UI-0.7 unless the later UI-0.12 commit/push gate is reached.

## 11. UI roadmap numbering — UI-0 ... UI-18

This section registers the official UI implementation roadmap.

The roadmap is documentation-level only at UI-0.

No UI implementation is created by this section.

No runtime behavior is changed by this section.

No DB read or DB write is introduced by this section.

No SQL is executed by this section.

### UI block registry

| UI block | Name | Gate baseline | Main purpose |
|---|---|---|---|
| UI-0 | Final Readiness → UI Implementation Track Gate | documentation-only / transition | Close C34-E.5, open UI track, define counters and gates. |
| UI-1 | Current Next.js Interface Inventory | read-only | Find current page, input, send button, response blocks, routes, reusable components. |
| UI-2 | Minimal UI-kit | fixture-only UI | Create reusable visual primitives from static props only. |
| UI-3 | Master Workspace Shell | local-state UI | Create top/left/center/right/bottom workspace shell without DB/backend writes. |
| UI-4 | Activity Capture Local MVP | local-state UI | Let user enter activity and see local category/value-object candidates. |
| UI-5 | Activity Review Card | local-state UI / fixture-only UI | Replace simple preview with "I understood it like this" review card. |
| UI-6 | Semantic Review / Needs Review | fixture-only UI / no-write UI | Show new terms, candidate concepts, merge/reject/confirm actions as preview. |
| UI-7 | Value Objects List / Tree / Cloud | read-only first | Show unified Value Objects as personal/object map without hard subtypes. |
| UI-8 | Value Object Card | read-only first | Show object detail, history, signals, related activities, next action candidates. |
| UI-9 | Today / Timeline | read-only first | Show chronological activity events, filters, conflict markers, corrections preview. |
| UI-10 | Calendar / Free Windows | read-only first | Show time windows and action opportunities without external calendar writes. |
| UI-11 | Analytics Dashboard | read-only analytics | Show balance rings, heatmap, weak directions as signals, not truth. |
| UI-12 | Next Best Action | no-write first | Show weak directions, ask user choice, then show action candidates. |
| UI-13 | Privacy / Audit / Corrections | read-only / write-gated later | Show inferred/confirmed/rejected/corrected states and privacy boundaries. |
| UI-14 | Commercial Core UI | separate commercial gates | Organizations, offers, certificates, points, purchase confirmations. |
| UI-15 | Contextual Right AI Column | no-write first | Make AI column scoped to selected activity/object/page. |
| UI-16 | Mobile Shell | local-state / responsive UI | Mobile tabs: AI, Workspace, Objects, Calendar, Actions. |
| UI-17 | No-write Preview Route Integration | no-write route UI | Connect UI to no-write semantic preview route and verify no writes. |
| UI-18 | Full UI Acceptance and Release Readiness | acceptance / release gate | Scenario matrix, visual QA, privacy audit, no hidden writes, desktop/mobile. |

### Fixed order

The implementation order is:

1. UI-0 — Final Readiness → UI Implementation Track Gate.
2. UI-1 — Current Next.js Interface Inventory.
3. UI-2 — Minimal UI-kit.
4. UI-3 — Master Workspace Shell.
5. UI-4 — Activity Capture Local MVP.
6. UI-5 — Activity Review Card.
7. UI-6 — Semantic Review / Needs Review.
8. UI-7 — Value Objects List / Tree / Cloud.
9. UI-8 — Value Object Card.
10. UI-9 — Today / Timeline.
11. UI-10 — Calendar / Free Windows.
12. UI-11 — Analytics Dashboard.
13. UI-12 — Next Best Action.
14. UI-13 — Privacy / Audit / Corrections.
15. UI-14 — Commercial Core UI.
16. UI-15 — Contextual Right AI Column.
17. UI-16 — Mobile Shell.
18. UI-17 — No-write Preview Route Integration.
19. UI-18 — Full UI Acceptance and Release Readiness.

### Important boundary

UI-0 registers the roadmap only.

UI-0 does not implement UI-1 through UI-18.

UI-1 remains read-only.

UI-2 and later require separate implementation gates.

UI-4 is the first block where the user can expect a visible local Activity Capture MVP.

UI-17 is the first block where no-write route integration is expected.

Write-gated behavior remains closed until explicit future write gates.

### UI-0.7 result expectation

After UI-0.7:

UI-0 progress: 7/14  
Left in UI-0: 7  
C34-A–E: 25/25 complete  
UI blocks registered: UI-0 ... UI-18  
No UI code changed yet  
Next: UI-0.8 — Define gate taxonomy

## 12. Gate taxonomy — detailed rules

This section defines the official gate taxonomy for the UI implementation track.

The taxonomy is documentation-level only at UI-0.

No UI implementation is created by this section.

No runtime behavior is changed by this section.

No DB read or DB write is introduced by this section.

No SQL is executed by this section.

### 12.1 Gate type: read-only

Purpose:

- inspect existing files;
- search project structure;
- list routes;
- list components;
- identify current UI entry points;
- produce inventory reports.

Allowed:

- git status;
- git log;
- file listing;
- grep / Select-String;
- read files;
- inspect route/component structure;
- summarize findings.

Forbidden:

- file creation;
- file editing;
- commit;
- push;
- SQL;
- DB read;
- DB write;
- route creation;
- adapter creation;
- UI implementation;
- fixture creation;
- runtime behavior change.

Typical UI blocks:

- UI-1 — Current Next.js Interface Inventory.

### 12.2 Gate type: documentation-only

Purpose:

- create or update markdown documentation;
- define protocols;
- define counters;
- define allowed/forbidden scopes;
- define implementation plans;
- define acceptance criteria.

Allowed:

- markdown files under docs/;
- documentation-only verification;
- commit/push only when the step explicitly says so.

Forbidden:

- app/page.tsx changes;
- src/app changes;
- React component creation;
- route creation;
- adapter creation;
- fixture creation;
- SQL;
- DB reads;
- DB writes;
- runtime imports;
- OpenAI runtime connection;
- production behavior change.

Typical UI blocks:

- UI-0;
- documentation brief steps inside later UI blocks.

### 12.3 Gate type: fixture-only UI

Purpose:

- render UI from static fixture objects only;
- make visual components without backend dependency;
- prove layout and user understanding before runtime integration.

Allowed:

- UI components with static props;
- static local fixture objects inside allowed UI files;
- visual smoke checks;
- component rendering without route/DB calls.

Forbidden:

- DB imports;
- Supabase imports;
- API route calls;
- OpenAI runtime calls;
- persistence;
- audit row writes;
- correction row writes;
- feedback row writes;
- final NBA creation;
- action execution.

Typical UI blocks:

- UI-2 — Minimal UI-kit;
- early UI-5/UI-6 prototypes.

### 12.4 Gate type: local-state UI

Purpose:

- enable local interactive behavior without backend;
- use useState or local reducer state;
- show draft, preview, and candidate packages without persistence.

Allowed:

- local React state;
- deterministic local parser;
- disabled or local-only buttons;
- local preview cards;
- local activity draft;
- local candidate category/value-object display.

Forbidden:

- DB imports;
- Supabase imports;
- API route calls unless explicitly no-write;
- persistence;
- hidden writes;
- production semantic runtime;
- applied correction;
- final NBA;
- action execution.

Typical UI blocks:

- UI-3 — Master Workspace Shell;
- UI-4 — Activity Capture Local MVP;
- UI-5 — Activity Review Card.

### 12.5 Gate type: no-write route UI

Purpose:

- allow UI to call backend preview routes that are proven no-write;
- render semantic preview packages;
- verify that preview does not persist anything.

Allowed only after explicit gate:

- no-write API route calls;
- loading states;
- error states;
- no-rights states;
- preview package rendering;
- route smoke tests proving no writes.

Forbidden:

- mutation routes;
- DB writes;
- audit row writes;
- correction row writes;
- feedback row writes;
- Semantic Capital writes;
- final NBA persistence;
- action execution;
- hidden persistence.

Typical UI blocks:

- UI-17 — No-write Preview Route Integration.

### 12.6 Gate type: read-only DB UI

Purpose:

- allow UI to read existing DB data after explicit read gate;
- show timelines, objects, analytics, audit history, or commercial data without mutation.

Allowed only after explicit gate:

- RLS-safe reads;
- listed DB queries;
- read-only route/client access;
- privacy-filtered display;
- no mutation imports.

Forbidden:

- inserts;
- updates;
- deletes;
- upserts;
- RPC mutations;
- audit/correction/feedback persistence;
- Semantic Capital writes;
- final NBA writes;
- action execution.

Typical UI blocks:

- UI-7 — Value Objects List / Tree / Cloud;
- UI-8 — Value Object Card;
- UI-9 — Today / Timeline;
- UI-10 — Calendar / Free Windows;
- UI-11 — Analytics Dashboard;
- UI-13 — Privacy / Audit / Corrections.

### 12.7 Gate type: write-gated UI

Purpose:

- allow explicit persistence only after a separate write gate;
- apply confirmed user actions;
- write corrections, feedback, purchase confirmations, certificates, or other persistent records.

Allowed only after explicit write gate:

- exact allowed files;
- exact write route or mutation;
- explicit user confirmation;
- RLS/security review;
- audit trail definition;
- rollback or correction strategy;
- tests proving no hidden writes.

Forbidden without explicit write gate:

- any DB write;
- any mutation route;
- any persisted correction;
- any persisted feedback;
- any Semantic Capital write;
- any points/certificate write;
- any action execution;
- any final NBA persistence.

Typical UI blocks:

- late UI-13 write flows;
- UI-14 Commercial Core UI;
- future confirmed persistence flows.

### 12.8 Gate escalation rules

A UI step may move only upward through gates by explicit instruction.

Allowed escalation examples:

- read-only → documentation-only;
- fixture-only UI → local-state UI;
- local-state UI → no-write route UI;
- no-write route UI → read-only DB UI;
- read-only DB UI → write-gated UI.

Forbidden implicit escalation:

- read-only cannot silently become documentation-only;
- documentation-only cannot silently become UI implementation;
- fixture-only UI cannot silently call routes;
- local-state UI cannot silently call backend;
- no-write route UI cannot silently write DB;
- read-only DB UI cannot silently mutate data;
- write-gated UI cannot execute without explicit confirmation.

### 12.9 Required gate declaration in every future UI step

Every future UI step response must include:

- UI Block;
- Microstep;
- Done in current block;
- Left in current block;
- Global UI roadmap position;
- Current gate type;
- Allowed changes;
- Forbidden changes;
- Expected git status;
- Next checkpoint;
- Required confirmation phrase if commit/push is involved.

### 12.10 UI-0.8 result expectation

After UI-0.8:

UI-0 progress: 8/14  
Left in UI-0: 6  
C34-A–E: 25/25 complete  
Gate taxonomy defined  
No UI code changed yet  
Next: UI-0.9 — Lock forbidden scope for UI-0

## 13. Forbidden scope for UI-0 — locked rules

This section locks the forbidden scope for UI-0.

UI-0 is a documentation / gate / transition block.

UI-0 is not an implementation block.

UI-0 must not accidentally become UI coding, route coding, backend integration, DB integration, semantic runtime integration, or commercial core implementation.

### 13.1 Absolutely forbidden during UI-0

During UI-0 it is forbidden to change, create, or execute anything in the following categories:

- app/page.tsx;
- src/app/page.tsx;
- app/** route files;
- src/app/** route files;
- pages/** files;
- src/pages/** files;
- components/** files;
- src/components/** files;
- API routes;
- route handlers;
- adapters;
- UI adapters;
- React components;
- hooks;
- fixture files;
- Supabase files;
- migrations;
- SQL files;
- package.json;
- lockfiles;
- next.config files;
- tsconfig files;
- .env files;
- runtime configuration;
- OpenAI runtime code;
- commercial core runtime code.

### 13.2 Forbidden operations during UI-0

During UI-0 it is forbidden to perform the following operations:

- run SQL;
- create migration;
- read DB;
- write DB;
- import DB client;
- import Supabase client;
- create route;
- create API route;
- create adapter;
- create TypeScript implementation;
- create React component;
- create page;
- create click handler;
- create fixture file;
- call OpenAI runtime;
- connect semantic runtime;
- create production category derivation;
- create Value Object;
- create State Fact;
- create State Delta;
- create State Snapshot;
- write Semantic Capital;
- write audit row;
- write correction row;
- write feedback row;
- apply correction;
- create final Next Best Action;
- execute action;
- change commercial core behavior;
- change production behavior.

### 13.3 Forbidden conceptual shortcuts during UI-0

During UI-0 it is forbidden to treat:

- documentation readiness as runtime readiness;
- UI roadmap as implemented UI;
- UI-1 inventory as UI coding;
- UI-4 Activity Capture MVP as already started;
- no-write preview as persistence;
- candidate package as final Next Best Action;
- weak direction as automatic user choice;
- analytics as truth;
- Semantic Capital as money;
- Semantic Capital as points;
- Semantic Capital as productivity truth;
- correction preview as applied correction;
- feedback preview as persisted feedback;
- UI confirmation as DB write permission.

### 13.4 Allowed scope during UI-0

During UI-0 only the following is allowed:

- create/update markdown files under docs/ui/;
- verify git status;
- verify anchors;
- define roadmap numbering;
- define gate taxonomy;
- define forbidden scope;
- define Definition of Done;
- create countdown template;
- prepare UI-1 read-only inventory brief;
- commit/push UI-0 protocol only at UI-0.12 after explicit confirmation phrase.

### 13.5 File boundary for UI-0.6 to UI-0.11

Until UI-0.12 commit/push gate, the expected changed area is:

- docs/ui/

The main expected file is:

- docs/ui/ui-0-ui-implementation-track-protocol.md

No other project areas should be touched.

### 13.6 Stop conditions

Stop immediately if any of the following appears in git status during UI-0:

- app/
- src/app/
- components/
- src/components/
- pages/
- src/pages/
- api/
- supabase/
- migrations/
- package.json
- package-lock.json
- pnpm-lock.yaml
- yarn.lock
- next.config
- tsconfig
- .env

Stop immediately if a step requires:

- SQL;
- DB read;
- DB write;
- route creation;
- adapter creation;
- UI implementation;
- fixture creation;
- OpenAI runtime connection;
- production behavior change.

### 13.7 Commit/push boundary

No commit/push is allowed in UI-0.9.

The next commit/push gate is UI-0.12.

UI-0.12 must require the exact confirmation phrase before committing and pushing.

Expected future confirmation phrase:

EXECUTE UI-0 COMMIT AND PUSH

### 13.8 UI-0.9 result expectation

After UI-0.9:

UI-0 progress: 9/14  
Left in UI-0: 5  
C34-A–E: 25/25 complete  
Forbidden scope locked  
No UI code changed yet  
Next: UI-0.10 — Define UI-0 Definition of Done

## 14. UI-0 Definition of Done — detailed acceptance criteria

This section defines the final Definition of Done for UI-0.

UI-0 is complete only when all conditions below are true.

UI-0 completion means that the UI implementation track protocol is ready.

UI-0 completion does not mean that UI implementation has started.

UI-0 completion does not mean that runtime behavior has changed.

### 14.1 C34 readiness closure criteria

UI-0 requires that the previous semantic readiness block is fully closed.

Required conditions:

- C34-E.5 committed and pushed.
- C34-A–E = 25/25 complete.
- Final semantic readiness lock exists.
- C34-E.5 states documentation-level readiness.
- C34-E.5 states not implemented as runtime.
- C34-E.5 states UI implementation track selected.
- C34-E.5 states Track 0 — Implementation gate protocol.
- Final git status after C34-E.5 was clean.

### 14.2 UI-0 protocol criteria

UI-0 requires that the UI implementation track protocol is documented.

Required conditions:

- UI-0 transition document exists.
- UI-0 ... UI-18 numbering is registered.
- gate taxonomy is defined.
- forbidden scope for UI-0 is locked.
- UI-0 Definition of Done is documented.
- countdown template for future UI steps exists.
- UI-1 read-only inventory brief is prepared.
- UI-0 stops before UI-1.
- UI-0 commit/push happens only at UI-0.12.
- UI-0 final stop gate happens at UI-0.14.

### 14.3 UI-0 safety criteria

UI-0 requires that no implementation or runtime work is mixed into the transition block.

Required no-change conditions:

- No UI code changed.
- No runtime changes.
- No SQL.
- No DB reads.
- No DB writes.
- No route created.
- No API route created.
- No adapter created.
- No UI adapter created.
- No React component created.
- No page created.
- No click handler created.
- No fixture file created.
- No OpenAI runtime connection.
- No Supabase client import.
- No DB client import.
- No migration created.
- No package/config/runtime file changed.
- No commercial core runtime change.
- No production behavior changed.

### 14.4 UI-0 documentation content criteria

Before UI-0 can be considered complete, the protocol document must contain:

- purpose of UI-0;
- explanation why UI starts as a separate track;
- explanation why UI-1 is read-only inventory;
- microstep counter for UI-0.1 through UI-0.14;
- UI roadmap numbering UI-0 ... UI-18;
- gate taxonomy;
- forbidden scope for UI-0;
- Definition of Done;
- countdown template for future UI steps;
- UI-1 read-only inventory brief;
- stop gate before UI-1.

### 14.5 UI-0 commit/push criteria

The UI-0 protocol commit/push may happen only in UI-0.12.

Required UI-0.12 conditions:

- only docs/ui/ is changed;
- the main changed file is docs/ui/ui-0-ui-implementation-track-protocol.md;
- required anchors are present;
- no forbidden file category is touched;
- exact commit message is used;
- explicit confirmation phrase is required;
- push happens only after exact phrase match;
- final git status is clean after push.

Expected UI-0.12 confirmation phrase:

EXECUTE UI-0 COMMIT AND PUSH

Expected UI-0.12 commit message:

docs: add UI-0 implementation track protocol

### 14.6 UI-0 final stop criteria

UI-0.14 must stop before UI-1.

Required final result label:

UI-0 RESULT: UI_IMPLEMENTATION_TRACK_PROTOCOL_READY

Required final state:

- UI-0 progress: 14/14.
- C34-A–E = 25/25 complete.
- UI implementation track protocol ready.
- UI-1 selected as next block.
- UI-1 gate type: read-only.
- No UI code changed.
- No runtime changes.
- No SQL.
- No DB reads.
- No DB writes.
- No route created.
- No adapter created.
- No fixture file created.
- No production behavior changed.

### 14.7 Not included in UI-0 Definition of Done

The following are explicitly not part of UI-0 Definition of Done:

- working Activity Capture UI;
- workspace shell implementation;
- local-state UI implementation;
- fixture-only UI implementation;
- no-write route integration;
- read-only DB integration;
- write-gated persistence;
- commercial core UI implementation;
- final Next Best Action implementation;
- production semantic runtime;
- production analytics;
- production recommendation;
- user action execution.

### 14.8 UI-0.10 result expectation

After UI-0.10:

UI-0 progress: 10/14  
Left in UI-0: 4  
C34-A–E: 25/25 complete  
UI-0 Definition of Done defined  
No UI code changed yet  
Next: UI-0.11 — Create countdown template for future UI steps

## 15. Countdown template for future UI steps

This section defines the required response template for all future UI implementation-track steps.

Every future UI development response must include this countdown block before scripts, code, or instructions.

The purpose is to prevent scope creep, hidden implementation, accidental runtime changes, accidental DB access, and unclear progress.

### 15.1 Required countdown block

Every future UI step response must include:

UI Block: UI-X — <name>  
Microstep: UI-X.Y / N  
Done in current block: Y-1 / N  
Left in current block: N-Y+1  
Global UI roadmap: UI-X of UI-18  
Current gate type: read-only / documentation-only / fixture-only UI / local-state UI / no-write route UI / read-only DB UI / write-gated UI  
Allowed changes: <exact allowed files/actions>  
Forbidden changes: <exact forbidden files/actions>  
Expected git status: <expected status before and after>  
Next checkpoint: <next step>  
Required confirmation phrase: <only if commit/push or write-gated action is involved>

### 15.2 Required script preamble

Every future script must print:

- block name;
- microstep number;
- gate type;
- allowed change;
- forbidden change;
- expected git status;
- whether commit/push is allowed;
- whether SQL is allowed;
- whether DB read is allowed;
- whether DB write is allowed;
- whether runtime/UI implementation is allowed.

### 15.3 Required final result block

Every future script must end with:

============================================================
UI-X.Y FINAL RESULT
============================================================
UI-X.Y RESULT: <RESULT_LABEL>
Updated/created/verified file: <path or none>
Gate type: <gate type>
C34-A–E: 25 / 25 complete
UI-X progress: <done> / <total>
Left in UI-X: <left>
Next: <next checkpoint>
No SQL.
No DB reads.
No DB writes.
No runtime changes.
No UI implementation yet.
============================================================

The no-change lines must be adjusted only if a later explicit gate allows one of those actions.

For example:

- in read-only DB UI, "No DB reads" must be replaced by the exact DB read scope;
- in write-gated UI, "No DB writes" must be replaced by the exact write scope and confirmation phrase;
- in local-state UI, "No UI implementation yet" may be replaced by the exact local-state UI implementation scope;
- in no-write route UI, route calls must be described as no-write and verified.

### 15.4 Required confirmation phrase rule

Commit/push steps must always show the required confirmation phrase immediately in the assistant response.

The phrase must also be printed by the script before Read-Host.

The script must abort if the phrase does not match exactly.

For UI-0.12 the required phrase is:

EXECUTE UI-0 COMMIT AND PUSH

### 15.5 Required file-boundary rule

Every future step must state exact allowed file paths or directories.

For UI-0.6 through UI-0.11 the only allowed changed area is:

docs/ui/

The main file is:

docs/ui/ui-0-ui-implementation-track-protocol.md

For UI-0.12 the commit must include only this UI-0 protocol documentation area.

### 15.6 Required stop rule

Every future script must stop if unexpected files appear in git status.

During UI-0 stop immediately if git status contains:

- app/
- src/app/
- components/
- src/components/
- pages/
- src/pages/
- api/
- supabase/
- migrations/
- package.json
- package-lock.json
- pnpm-lock.yaml
- yarn.lock
- next.config
- tsconfig
- .env

### 15.7 Required progress language

Future assistant responses must keep progress visible.

For example:

UI Block: UI-4 — Activity Capture Local MVP  
Microstep: UI-4.3 / 12  
Done in current block: 2 / 12  
Left in current block: 10  
Global UI roadmap: UI-4 of UI-18  
Current gate type: local-state UI  
Allowed changes: <exact files>  
Forbidden changes: DB writes, SQL, OpenAI runtime, production route writes  
Expected git status: <expected status>  
Next checkpoint: UI-4.4 — <name>

### 15.8 UI-0.11 result expectation

After UI-0.11:

UI-0 progress: 11/14  
Left in UI-0: 3  
C34-A–E: 25/25 complete  
Countdown template created  
No UI code changed yet  
Next: UI-0.12 — Commit/push UI-0 protocol

