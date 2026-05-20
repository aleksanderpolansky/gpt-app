# P4.10.0-C8-P3-B4-A — Browser No-Flag Regression Test

Date: 2026-05-19
Project: gpt-app / AI-NAVIGATOR
Scope: Category Derivation Layer v1 / bridge regression after B3 loop call

## 1. Purpose

Prepare a browser-authenticated no-flag regression test after:

- P4.10.0-C8-P3-B3

## 2. Why browser-authenticated

The debug route requires authenticated app user and person actor context.

PowerShell fetch without browser session would return 401.

## 3. Test target

Endpoint:

- /api/activity/debug/free-text-value-object-test

Payload intentionally does not include:

- enableCategoryDerivation
- categoryDerivationDryRun
- categoryDerivationCreatePolicy
- additionalCategoryLinks

## 4. Expected result

- HTTP 200
- response ok true
- bridge-like result exists
- created items exist
- additionalValueObjectCategoryLinks is an empty array
- additionalValueObjectCategoryLinkErrors is an empty array
- Category Derivation is not enabled

## 5. Files

Browser test script:

- docs/browser-tests/P4.10.0-C8-P3-B4_no_flag_bridge_regression.js

## 6. Next step

Open the app in browser while authenticated, paste the browser test script into DevTools Console, and report the final Checks table and RESULT line.
