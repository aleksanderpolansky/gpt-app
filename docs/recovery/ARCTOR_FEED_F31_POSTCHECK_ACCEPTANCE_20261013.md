# ARCTor FEED F3.1A — acceptance report

Date: 2026-10-13
Baseline: cb57b6450f024c57c7b1896ac047e06c5f9ba150
Contract: ARCTOR_FEED_F31_POSTCHECK_V1

Supabase POSTCHECK: PASS
Result supplied by the administrator.

- Confirmed Lidl facts: 3
- Lidl publication links: 3
- Search 20-40 EUR: 1
- Search 0-20 EUR: 0
- Search 20-40 PLN: 0
- Reverse leaf index: present
- service_role EXECUTE: true
- authenticated EXECUTE: false
- anon EXECUTE: false
- Commercial automatic writing: disabled
- Database writes during POSTCHECK: false

Scope:
- SQL-only server-side semantic search.
- No changes to the fact writer or F1.2 triggers.
- No feed UI changes.
- No automatic commercial fact writing.

Next: F3.1B server adapter and feed integration.

Limitations:
- Native commercial publications only.
- Multiple offer items inside one event require
  additional item-level scoping before general use.
## Global ESLint exception

Global npm run lint: FAIL on the unchanged project baseline.

The administrator's run reported:
- 264 errors
- 110 warnings
- Example: pre-existing no-explicit-any errors in
  src/lib/goal-world/api/goalWorldPersistence.server.ts

F3.1A changes only SQL and recovery documentation.
No TypeScript or JavaScript source files are changed.

Global ESLint is NOT claimed as PASS.
This exception is limited to recording the SQL-only F3.1A change.

TypeScript and production build must pass separately.

The SQL migration was already applied manually in the
Supabase SQL Editor and passed POSTCHECK.

Do not reapply this migration through Supabase CLI without
first reconciling the remote migration history.
