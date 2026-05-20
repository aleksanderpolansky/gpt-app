# P4.10.0-C8-P3-B6-A — Browser Regression Suite After Route Integration

Date: 2026-05-20
Project: gpt-app / AI-NAVIGATOR
Scope: Category Derivation Layer v1 / route-to-bridge browser regression

## 1. Purpose

Prepare a browser-authenticated regression suite after B5-B3-fix2.

## 2. Test cases

Browser script runs three cases:

1. no flag regression
2. Category Derivation enabled with dryRun=true
3. Category Derivation enabled with dryRun=false

## 3. Expected behavior

Case 1:

- old bridge behavior remains stable
- Category Derivation disabled
- additionalValueObjectCategoryLinks empty

Case 2:

- Category Derivation enabled
- dryRun=true
- no additional links passed to bridge
- additionalValueObjectCategoryLinks empty

Case 3:

- Category Derivation enabled
- dryRun=false
- resolved candidates should be passed as additionalCategoryLinks if resolution produces valid categoryId
- additionalValueObjectCategoryLinks should be positive
- additionalValueObjectCategoryLinkErrors should be empty

## 4. File

- docs/browser-tests/P4.10.0-C8-P3-B6_route_integration_regression_suite.js

## 5. Next step

Run the script in an authenticated browser DevTools Console and report:

- SUITE SUMMARY
- SUITE RESULT
- failed checks if any
