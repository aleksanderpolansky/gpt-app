import { NextResponse } from "next/server";

import { rollbackStateFactControlled } from "../../../../../../lib/activity/stateFacts/controlledPersistence/rollback";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";

const STEP = "P4.10.0-C8-I-D4-L-L-L-A";
const PROOF_ROUTE_KIND = "debug_no_write_failure_proof_route";

const KNOWN_EXISTING_STATE_FACT_ID = "116d4866-0f89-4bb3-aae4-37e7e8860e85";
const WRONG_VALUE_OBJECT_ID = "00000000-0000-4000-8000-000000000111";
const DEBUG_USER_ID = "00000000-0000-4000-8000-000000000222";

type CountSnapshot = {
  stateFactRows: number;
  rolledBackStateFactRows: number;
  auditEventRows: number;
  rollbackAuditEventRows: number;
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
  };
}

function countsEqual(before: CountSnapshot, after: CountSnapshot): boolean {
  return (
    before.stateFactRows === after.stateFactRows &&
    before.rolledBackStateFactRows === after.rolledBackStateFactRows &&
    before.auditEventRows === after.auditEventRows &&
    before.rollbackAuditEventRows === after.rollbackAuditEventRows
  );
}

function buildWrongPairPayload(now: string) {
  return {
    userId: DEBUG_USER_ID,
    actorId: null,
    valueObjectId: WRONG_VALUE_OBJECT_ID,
    stateFactId: KNOWN_EXISTING_STATE_FACT_ID,
    reason: "D4-L-L-L-A wrong valueObjectId no-write failure proof",
    requestTraceId: `D4-L-L-L-A-wrong-pair-${Date.now()}`,
    idempotencyKey: `D4-L-L-L-A-wrong-pair-${Date.now()}`,
    sourceRoute: "/api/activity/debug/state-fact-rollback-no-write-proof",
    helperVersion: "P4.10.0-C8-I-D4-L-L-L-A",
    contractVersion: "P4.10.0-C8-I-D4-L-L-L-A",
    d4GateVersion: "P4.10.0-C8-I-D4-L-L-L-A",
    rollbackAt: now,
    evidenceJson: {
      proof: "wrong valueObjectId should reject before RPC write",
      expectedWrite: false,
    },
    metadataJson: {
      debugOnly: true,
      expectedWrite: false,
    },
  };
}

export async function GET() {
  const before = await getCounts();
  const now = new Date().toISOString();

  const missingAll = await rollbackStateFactControlled({} as never);

  const missingReason = await rollbackStateFactControlled({
    userId: DEBUG_USER_ID,
    actorId: null,
    valueObjectId: WRONG_VALUE_OBJECT_ID,
    stateFactId: KNOWN_EXISTING_STATE_FACT_ID,
    reason: "",
    requestTraceId: `D4-L-L-L-A-missing-reason-${Date.now()}`,
    idempotencyKey: `D4-L-L-L-A-missing-reason-${Date.now()}`,
    sourceRoute: "/api/activity/debug/state-fact-rollback-no-write-proof",
    helperVersion: "P4.10.0-C8-I-D4-L-L-L-A",
    contractVersion: "P4.10.0-C8-I-D4-L-L-L-A",
    d4GateVersion: "P4.10.0-C8-I-D4-L-L-L-A",
    rollbackAt: now,
    evidenceJson: {
      proof: "missing reason should reject before RPC write",
      expectedWrite: false,
    },
    metadataJson: {
      debugOnly: true,
      expectedWrite: false,
    },
  } as never);

  const wrongValueObjectPair = await rollbackStateFactControlled(
    buildWrongPairPayload(now) as never
  );

  const after = await getCounts();
  const noWriteObserved = countsEqual(before, after);

  const expectedFailures = {
    missingAllRejected: missingAll.ok === false,
    missingReasonRejected: missingReason.ok === false,
    wrongValueObjectPairRejected: wrongValueObjectPair.ok === false,
  };

  const pass =
    noWriteObserved &&
    expectedFailures.missingAllRejected &&
    expectedFailures.missingReasonRejected &&
    expectedFailures.wrongValueObjectPairRejected;

  return NextResponse.json(
    {
      ok: pass,
      step: STEP,
      routeKind: PROOF_ROUTE_KIND,
      status: pass
        ? "runtime_no_write_failure_proof_route_ready"
        : "runtime_no_write_failure_proof_route_failed",
      counts: {
        before,
        after,
        noWriteObserved,
      },
      cases: {
        missingAll,
        missingReason,
        wrongValueObjectPair,
      },
      expectedFailures,
      productionControlledRollbackRouteCreated: false,
      successfulRollbackExecuted: false,
      notes: [
        "This debug route is not the production controlled rollback endpoint.",
        "This route intentionally tests only failure/no-write cases.",
        "The wrong valueObjectId case should reject before a successful RPC write.",
        "A successful rollback proof must be a later dedicated step with a fresh state fact.",
      ],
    },
    { status: pass ? 200 : 500 }
  );
}
