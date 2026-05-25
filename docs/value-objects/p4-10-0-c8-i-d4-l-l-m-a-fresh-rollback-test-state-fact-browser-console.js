(async () => {
  const STEP = "P4.10.0-C8-I-D4-L-L-M-A";
  const endpoint = "/api/activity/state-facts/controlled-persist";

  const sourceId = "f30b0ea7-40bd-406b-95e4-ef93e985ee95";
  const candidateTraceId = "d4-l-l-m-a-fresh-rollback-test-f30b0ea7-40bd-406b-95e4-ef93e985ee95";
  const idempotencyKey = "d4-l-l-m-a-fresh-rollback-test-f30b0ea7-40bd-406b-95e4-ef93e985ee95";
  const now = new Date().toISOString();

  const body = {
    mode: "controlled_persist",
    confirmControlledPersistence: true,
    contractVersion: "D4-C-D4-F-A-controlled-state-fact-contract",
    helperVersion: "P4.10.0-C8-I-D4-F-B-D-H-v1",
    d4GateVersion: "D4-F-controlled-persistence-gate",
    request: {
      candidateTraceId,
      valueObjectId: "9177fea8-de25-446b-b418-b55a766d53db",
      dimensionKey: "language_practice_balance",
      idempotencyKey,
      userConfirmation: {
        isExplicitlyConfirmed: true,
        confirmedAt: now,
        confirmationText:
          "I explicitly confirm controlled persistence of a fresh test state fact for rollback proof.",
      },
      candidate: {
        sourceType: "system",
        sourceId,
        proposedValue: {
          minutes: 3,
          activity: "fresh_rollback_success_proof_test_state_fact",
          sourceId,
          proofStep: STEP,
          sourceType: "system",
          dimensionKey: "language_practice_balance",
          valueObjectId: "9177fea8-de25-446b-b418-b55a766d53db",
          valueObjectTitle: "Business German writing practice",
          rollbackProofCandidate: true,
        },
        safeWording:
          "Fresh rollback proof test state fact for Business German writing practice.",
        evidenceJson: {
          proof: "D4-L-L-M-A fresh controlled state fact for later successful rollback proof",
          sourceId,
          createdAt: now,
          sourceType: "system",
          dimensionKey: "language_practice_balance",
          valueObjectId: "9177fea8-de25-446b-b418-b55a766d53db",
          valueObjectTitle: "Business German writing practice",
          browserSessionAuthenticated: true,
          historicalProofStateFactNotUsed: "116d4866-0f89-4bb3-aae4-37e7e8860e85",
        },
        confidence: 0.85,
        claimStrength: 1,
        privacyLevel: "private",
        validityWindow: {
          validFrom: now,
          validTo: null,
        },
        metadataJson: {
          rollbackable: true,
          source_route: endpoint,
          runtime_proof: STEP,
          helper_version: "P4.10.0-C8-I-D4-F-B-D-H-v1",
          d4_gate_version: "D4-F-controlled-persistence-gate",
          contract_version: "D4-C-D4-F-A-controlled-state-fact-contract",
          idempotency_key: idempotencyKey,
          candidate_trace_id: candidateTraceId,
          expected_result: "persisted",
          expected_state_facts_created: 1,
          created_from_candidate: true,
          not_created_by_ai_directly: true,
          created_from_browser_console: true,
          freshRollbackProofTestStateFact: true,
          doNotRollbackHistoricalProofFact: "116d4866-0f89-4bb3-aae4-37e7e8860e85",
        },
      },
    },
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await response.json();

  const proof = {
    step: STEP,
    httpStatus: response.status,
    ok: json.ok,
    decision: json.decision,
    stateFactId: json.stateFactId,
    stateFactsCreated: json.stateFactsCreated,
    writesAttempted: json.writesAttempted,
    idempotencyStatus: json.idempotencyStatus,
    sourceId,
    candidateTraceId,
    idempotencyKey,
    valueObjectId: "9177fea8-de25-446b-b418-b55a766d53db",
    dimensionKey: "language_practice_balance",
    raw: json,
  };

  console.log("D4-L-L-M-A fresh rollback test state fact result:");
  console.log(JSON.stringify(proof, null, 2));

  return proof;
})();
