(async () => {
  const STEP = "P4.10.0-C8-I-D4-L-L-N-A";
  const endpoint = "/api/activity/debug/state-fact-rollback-success-proof";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const json = await response.json();

  const proof = {
    step: STEP,
    httpStatus: response.status,
    ok: json.ok,
    status: json.status,
    freshStateFactId: json.freshStateFactId,
    historicalProofStateFactId: json.historicalProofStateFactId,
    successfulRollbackExecuted: json.successfulRollbackExecuted,
    productionControlledRollbackRouteCreated:
      json.productionControlledRollbackRouteCreated,
    target: json.target,
    historicalProofFact: json.historicalProofFact,
    counts: json.counts,
    rollbackResult: json.rollbackResult,
    raw: json,
  };

  console.log("D4-L-L-N-A successful rollback proof result:");
  console.log(JSON.stringify(proof, null, 2));

  return proof;
})();
