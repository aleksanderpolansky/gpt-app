import { NextResponse } from "next/server";

import { rollbackStateFactControlled } from "../../../../../../lib/activity/stateFacts/controlledPersistence/rollback";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";

const STEP = "P4.10.0-C8-I-D4-L-L-N-A";
const PROOF_ROUTE_KIND = "debug_successful_rollback_proof_route";

const FRESH_STATE_FACT_ID = "f0a41488-17e1-4b5d-89f4-9512adeb788d";
const HISTORICAL_PROOF_STATE_FACT_ID =
  "116d4866-0f89-4bb3-aae4-37e7e8860e85";
const TARGET_VALUE_OBJECT_ID = "9177fea8-de25-446b-b418-b55a766d53db";
const TARGET_DIMENSION_KEY = "language_practice_balance";

const SOURCE_ROUTE =
  "/api/activity/debug/state-fact-rollback-success-proof";

const ROLLBACK_REASON =
  "D4-L-L-N successful rollback proof for fresh test state fact only.";

const REQUEST_TRACE_ID =
  "d4-l-l-n-successful-rollback-proof-f0a41488-17e1-4b5d-89f4-9512adeb788d";

const IDEMPOTENCY_KEY =
  "d4-l-l-n-successful-rollback-proof-f0a41488-17e1-4b5d-89f4-9512adeb788d";

type StateFactRow = {
  id: string;
  user_id: string;
  value_object_id: string;
  dimension_key: string;
  correction_status: string;
  valid_to: string | null;
  metadata_json: Record<string, unknown> | null;
};

type CountSnapshot = {
  stateFactRows: number;
  rolledBackStateFactRows: number;
  auditEventRows: number;
  rollbackAuditEventRows: number;
  freshRollbackAuditRows: number;
};

type SupabaseCountResult = {
  count: number | null;
  error: { message?: string } | null;
};

function readCount(result: SupabaseCountResult, label: string): number {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message ?? "count failed"}`);
  }

  return result.count ?? 0;
}

async function readStateFact(
  stateFactId: string
): Promise<StateFactRow | null> {
  const result = await supabase
    .from("value_object_state_facts")
    .select(
      "id,user_id,value_object_id,dimension_key,correction_status,valid_to,metadata_json"
    )
    .eq("id", stateFactId)
    .maybeSingle();

  if (result.error) {
    throw new Error(
      `readStateFact ${stateFactId}: ${result.error.message}`
    );
  }

  return result.data as StateFactRow | null;
}

async function getCounts(): Promise<CountSnapshot> {
  const stateFacts = await supabase
    .from("value_object_state_facts")
    .select("id", { count: "exact", head: true });

  const rolledBackStateFacts = await supabase
    .from("value_object_state_facts")
    .select("id", { count: "exact", head: true })
    .eq("correction_status", "rolled_back");

  const auditEvents = await supabase
    .from("value_object_state_fact_audit_events")
    .select("id", { count: "exact", head: true });

  const rollbackAuditEvents = await supabase
    .from("value_object_state_fact_audit_events")
    .select("id", { count: "exact", head: true })
    .eq("action_type", "rolled_back");

  const freshRollbackAuditEvents = await supabase
    .from("value_object_state_fact_audit_events")
    .select("id", { count: "exact", head: true })
    .eq("state_fact_id", FRESH_STATE_FACT_ID)
    .eq("action_type", "rolled_back");

  return {
    stateFactRows: readCount(stateFacts, "stateFactRows"),
    rolledBackStateFactRows: readCount(
      rolledBackStateFacts,
      "rolledBackStateFactRows"
    ),
    auditEventRows: readCount(auditEvents, "auditEventRows"),
    rollbackAuditEventRows: readCount(
      rollbackAuditEvents,
      "rollbackAuditEventRows"
    ),
    freshRollbackAuditRows: readCount(
      freshRollbackAuditEvents,
      "freshRollbackAuditRows"
    ),
  };
}

function verifyTargetBeforeRollback(freshBefore: StateFactRow | null) {
  if (!freshBefore) {
    return {
      ok: false,
      code: "FRESH_STATE_FACT_NOT_FOUND",
      message: "Fresh rollback test state fact was not found.",
    };
  }

  if (freshBefore.id !== FRESH_STATE_FACT_ID) {
    return {
      ok: false,
      code: "FRESH_STATE_FACT_ID_MISMATCH",
      message: "Fresh state fact id mismatch.",
    };
  }

  if (freshBefore.value_object_id !== TARGET_VALUE_OBJECT_ID) {
    return {
      ok: false,
      code: "VALUE_OBJECT_ID_MISMATCH",
      message: "Fresh state fact value_object_id mismatch.",
    };
  }

  if (freshBefore.dimension_key !== TARGET_DIMENSION_KEY) {
    return {
      ok: false,
      code: "DIMENSION_KEY_MISMATCH",
      message: "Fresh state fact dimension_key mismatch.",
    };
  }

  if (freshBefore.correction_status !== "active") {
    return {
      ok: false,
      code: "FRESH_STATE_FACT_NOT_ACTIVE",
      message:
        "Fresh state fact must be active before successful rollback proof.",
    };
  }

  return {
    ok: true,
    code: "FRESH_STATE_FACT_READY",
    message: "Fresh rollback test state fact is ready.",
  };
}

export async function POST() {
  const before = await getCounts();
  const freshBefore = await readStateFact(FRESH_STATE_FACT_ID);
  const historicalBefore = await readStateFact(HISTORICAL_PROOF_STATE_FACT_ID);

  const targetPrecheck = verifyTargetBeforeRollback(freshBefore);

  if (!targetPrecheck.ok || !freshBefore) {
    return NextResponse.json(
      {
        ok: false,
        step: STEP,
        routeKind: PROOF_ROUTE_KIND,
        status: "rollback_success_proof_precheck_failed",
        targetPrecheck,
        counts: {
          before,
          after: before,
        },
        freshStateFactId: FRESH_STATE_FACT_ID,
        historicalProofStateFactId: HISTORICAL_PROOF_STATE_FACT_ID,
        successfulRollbackExecuted: false,
        productionControlledRollbackRouteCreated: false,
      },
      { status: 409 }
    );
  }

  const rollbackAt = new Date().toISOString();

  const rollbackResult = await rollbackStateFactControlled({
    userId: freshBefore.user_id,
    actorId: null,
    valueObjectId: TARGET_VALUE_OBJECT_ID,
    stateFactId: FRESH_STATE_FACT_ID,
    reason: ROLLBACK_REASON,
    requestTraceId: REQUEST_TRACE_ID,
    idempotencyKey: IDEMPOTENCY_KEY,
    sourceRoute: SOURCE_ROUTE,
    helperVersion: "P4.10.0-C8-I-D4-L-L-N-A",
    contractVersion: "P4.10.0-C8-I-D4-L-L-N-A",
    d4GateVersion: "P4.10.0-C8-I-D4-L-L-N-A",
    rollbackAt,
    evidenceJson: {
      proof: "D4-L-L-N successful rollback proof",
      freshStateFactId: FRESH_STATE_FACT_ID,
      historicalProofStateFactId: HISTORICAL_PROOF_STATE_FACT_ID,
      expectedWrite: true,
      expectedActionType: "rolled_back",
      expectedNewCorrectionStatus: "rolled_back",
    },
    metadataJson: {
      debugOnly: true,
      routeKind: PROOF_ROUTE_KIND,
      freshRollbackProofTestStateFact: true,
      successfulRollbackProof: true,
      doNotRollbackHistoricalProofFact: HISTORICAL_PROOF_STATE_FACT_ID,
      expectedWrite: true,
    },
  } as never);

  const after = await getCounts();
  const freshAfter = await readStateFact(FRESH_STATE_FACT_ID);
  const historicalAfter = await readStateFact(HISTORICAL_PROOF_STATE_FACT_ID);

  const rollbackResultOk =
    typeof rollbackResult === "object" &&
    rollbackResult !== null &&
    "ok" in rollbackResult &&
    rollbackResult.ok === true;

  const freshStatusChangedToRolledBack =
    freshBefore.correction_status === "active" &&
    freshAfter?.correction_status === "rolled_back";

  const freshValidToSet =
    freshBefore.valid_to === null && freshAfter?.valid_to !== null;

  const countsChangedAsExpected =
    after.stateFactRows === before.stateFactRows &&
    after.rolledBackStateFactRows === before.rolledBackStateFactRows + 1 &&
    after.auditEventRows === before.auditEventRows + 1 &&
    after.rollbackAuditEventRows === before.rollbackAuditEventRows + 1 &&
    after.freshRollbackAuditRows === before.freshRollbackAuditRows + 1;

  const historicalProofFactUnchanged =
    historicalBefore?.correction_status === historicalAfter?.correction_status &&
    historicalBefore?.valid_to === historicalAfter?.valid_to;

  const pass =
    rollbackResultOk &&
    freshStatusChangedToRolledBack &&
    freshValidToSet &&
    countsChangedAsExpected &&
    historicalProofFactUnchanged;

  return NextResponse.json(
    {
      ok: pass,
      step: STEP,
      routeKind: PROOF_ROUTE_KIND,
      status: pass
        ? "successful_rollback_proof_passed"
        : "successful_rollback_proof_failed",
      freshStateFactId: FRESH_STATE_FACT_ID,
      historicalProofStateFactId: HISTORICAL_PROOF_STATE_FACT_ID,
      target: {
        before: freshBefore,
        after: freshAfter,
        precheck: targetPrecheck,
        freshStatusChangedToRolledBack,
        freshValidToSet,
      },
      historicalProofFact: {
        before: historicalBefore,
        after: historicalAfter,
        unchanged: historicalProofFactUnchanged,
      },
      counts: {
        before,
        after,
        countsChangedAsExpected,
      },
      rollbackResult,
      successfulRollbackExecuted: rollbackResultOk,
      productionControlledRollbackRouteCreated: false,
      notes: [
        "This debug route is not the production controlled rollback endpoint.",
        "This route executes a successful rollback proof only for the fresh test state fact.",
        "The historical proof state fact must remain unchanged.",
      ],
    },
    { status: pass ? 200 : 500 }
  );
}
