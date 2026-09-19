# ARCTOR_CONSEQUENCE_CURRENT_TARGET_COUNT_V1_20260919

Date: 2026-09-19T15:33:32.961Z

## Problem

The lightweight consequence queue counted all historical target selections. The detail page already filtered selections through the current active related-leaf candidate set, so a task could show Targets: 2 in the queue but only one valid target in detail.

## Fix

The queue keeps historical target-selection logs untouched but filters them through the same current active global system leaf relationship eligibility used by the detail page. Formula contexts are still not loaded for the queue.

## Scope

No DB migration. No deletion of target-selection history. No formula change. No executor activation. No fact writes. No analytics change.

## Baseline validation

BASELINE_ESLINT_TARGET=PASS
BASELINE_TYPECHECK=PASS
BASELINE_BUILD=PASS
BASELINE_DIFF_CHECK=PASS

## Postpatch validation

POSTPATCH_ESLINT_TARGET=PASS
POSTPATCH_TYPECHECK=PASS
POSTPATCH_BUILD=PASS
POSTPATCH_DIFF_CHECK=PASS

## Implementation commit

3f9d267be4868219cf7fc2058915720912c9bee9

## Baseline

bb388dd33e83415e0d86325c9622fa3fec26cad0
