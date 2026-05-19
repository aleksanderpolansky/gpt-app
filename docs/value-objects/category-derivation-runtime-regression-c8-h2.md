# P4.10.0-C8-H2 — Targeted Runtime Regression Result

Date: 2026-05-19
Project: gpt-app / AI-NAVIGATOR
Scope: Category Derivation Layer v1 / post-migration targeted runtime regression

## 1. Context

After applying and verifying the live SQL migration for Category Derivation Layer v1, a targeted runtime regression was executed against the already verified C7 free-text debug route.

This was not a global repo green-light, because global lint currently has known pre-existing lint debt.

The purpose of this check was to confirm that the live DB migration did not break the existing C7 free-text Value Object fallback pipeline.

## 2. Endpoint

Endpoint:

/api/activity/debug/free-text-value-object-test

Method:

POST

Payload:

- inputText: walked to work for 15 minutes
- durationMinutes: 15
- title: Walked to work
- description: P4.10.0-C8-H2 targeted post-migration regression of C7 free-text debug route

## 3. Result

HTTP status: 200
Content-Type: application/json
Result: PASS

Returned status:

created_and_bridge_processed

## 4. Passed checks

- http200: true
- okTrue: true
- statusCreatedAndBridgeProcessed: true
- eventExists: true
- templateNull: true
- inputTextOk: true
- durationOk: true
- bridgeOk: true
- bridgeNotSkipped: true
- mappingsCountPositive: true
- bridgeCreatedOrProcessed: true
- processingLogPresent: true

## 5. Important IDs

- eventId: 9608b44a-b628-483e-bf79-165e3aac2f07
- processingRunId: 5953a75b-d989-4722-8eb3-ee1086b6bcff
- valueObjectBridgeLogId: 8ef80cea-ef12-40d2-acbd-6418c429ef6e
- mappingsCount: 1
- bridgeCreatedCount: 1
- valueObjectId: 291b2613-0f5b-406f-8bfc-f57eb619c107
- valueObjectInstanceId: 1d8233b4-b720-41d7-827a-9ab63bf0c8f1
- activityEventValueObjectLinkId: 18067f37-4549-4641-a143-c93b8a9eb0f4
- stateDeltaId: cce79528-18dc-4618-845d-5dc462a9bf2d
- aggregateId: 2e799f65-5a38-4279-91ef-06dff9cbe7e7
- snapshotId: 360eac20-9cd2-426d-aea8-ccceae9f6f9d
- usageAggregateId: 8bbe137f-edf3-402b-ae90-f4c800eb78e2

## 6. Important interpretation

valueObjectCategoryLinkId was null.

This is expected in C8-H2.

C8-H2 only verifies that the C7 free-text route still works after the DB migration.

The runtime Category Derivation Layer has not been implemented yet, so category_derivation_runs and activity_category_derivations are not expected to be populated by this debug route yet.

Creating value_object_category_links from categoryCandidates[] is the next implementation layer.

## 7. Conclusion

P4.10.0-C8-H2 result: PASSED.

The live Category Derivation schema migration did not break the verified C7 free-text Value Object fallback route.

Proceed to P4.10.0-C8-I: implementation plan for rule-based Category Derivation extractor v1 and resolver integration.
