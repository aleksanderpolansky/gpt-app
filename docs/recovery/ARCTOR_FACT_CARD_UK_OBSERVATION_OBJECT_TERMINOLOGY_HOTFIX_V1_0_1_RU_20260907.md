# ARCTor - Ukrainian observation-object terminology in the fact card

Date: 2026-09-07
Release: `ARCTOR_FACT_CARD_UK_OBSERVATION_OBJECT_TERMINOLOGY_HOTFIX_V1_0_1`
Baseline Git: `b366cd2bb95afb4a02e268b1af57ef53ef76fa1e`
Code commit: `88f881d2a38990df02ab3381b1a77efb9ebfc718`
Status: CODE_RELEASED_AWAITING_LIVE_ACCEPTANCE

## What changed

On `/activity-facts?locale=uk`, the remaining Russian label for linked observation objects was replaced with Ukrainian terminology. Legacy value-object wording in the same locale was also replaced with observation-object wording.

Expected UI labels:
- linked observation objects: Ukrainian `Poviazani ON` equivalent stored in source as `Пов’язані ОН`;
- observation object ID: `ID об’єкта спостереження`;
- observation object: `Об’єкт спостереження`.

## Scope

- Only `src/app/activity-facts/page.tsx`.
- DB/schema/API/facts unchanged.
- SQL, Supabase writes and OpenAI not executed.
- Other locales unchanged.

## Evidence

Runner must confirm exact baseline/hash, TypeScript pre/post, touched ESLint 0/0, full ESLint no regression, production build, git diff --check and changed-file allowlist.

## Failure lesson

The first V1 runner did not start because Windows PowerShell 5.1 treats smart quotation marks as quote delimiters. A literal U+2019 apostrophe inside a single-quoted PowerShell string broke parsing. V1.0.1 removes non-ASCII literals from executable PowerShell source and decodes UTF-8 labels from Base64 at runtime.

## Live acceptance

Open `/activity-facts?locale=uk` and verify there is no Russian label and no legacy value-object wording in the affected fields.
