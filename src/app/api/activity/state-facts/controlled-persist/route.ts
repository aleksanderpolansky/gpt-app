/**
 * GPT-APP / AI-NAVIGATOR
 * P4.10.0-C8-I-D4-F-B-D-I
 *
 * Controlled state fact persistence - controlled persist API route.
 *
 * Status:
 * - CONTROLLED PERSIST ROUTE ONLY
 * - ROUTE DELEGATES TO CONTROLLED HELPER
 * - NO DIRECT DATABASE ACCESS IN ROUTE
 * - NO DIRECT INSERT IN ROUTE
 * - NO DIRECT STATE FACT STORAGE TABLE ACCESS IN ROUTE
 *
 * Core rules preserved:
 * - The route does not build state facts directly.
 * - The route does not call the database client directly.
 * - The route delegates all gates to persistStateFactControlled.
 * - A shadow candidate is not a state fact.
 * - AI-only direct persistence remains blocked by the helper.
 */

import { NextRequest, NextResponse } from "next/server";

import { persistStateFactControlled } from "../../../../../../lib/activity/stateFacts/controlledPersistence/persist";

import type { StateFactPersistenceRequest } from "../../../../../../lib/activity/stateFacts/controlledPersistence/types";

export const dynamic = "force-dynamic";

const CONTROLLED_PERSIST_ROUTE = "/api/activity/state-facts/controlled-persist";
const REQUIRED_MODE = "controlled_persist";

type ControlledPersistRouteBody = {
  mode?: unknown;
  confirmControlledPersistence?: unknown;
  request?: unknown;
  contractVersion?: unknown;
  helperVersion?: unknown;
  d4GateVersion?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toStringOrUndefined(value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }

  return value.trim();
}

function toPersistenceRequest(value: unknown): StateFactPersistenceRequest | null {
  if (!isRecord(value)) {
    return null;
  }

  return value as StateFactPersistenceRequest;
}

function jsonResponse(body: unknown, status: number): NextResponse {
  return NextResponse.json(body, { status });
}

/**
 * POST /api/activity/state-facts/controlled-persist
 *
 * The route intentionally performs only request-level checks:
 * - explicit mode check;
 * - explicit confirmation check;
 * - request envelope check;
 * - delegation to the controlled helper.
 *
 * The helper re-runs authentication, target access, dimension resolution,
 * candidate validation, payload building, idempotency, and the guarded write.
 */
export async function POST(incomingRequest: NextRequest): Promise<NextResponse> {
  let body: ControlledPersistRouteBody;

  try {
    body = await incomingRequest.json() as ControlledPersistRouteBody;
  } catch {
    return jsonResponse(
      {
        ok: false,
        decision: "rejected",
        rejectionCode: "SOURCE_EVIDENCE_MISSING",
        safeMessage: "Request body must be valid JSON.",
        route: CONTROLLED_PERSIST_ROUTE,
        stateFactsCreated: 0,
        writesAttempted: false,
      },
      400
    );
  }

  if (body.mode !== REQUIRED_MODE) {
    return jsonResponse(
      {
        ok: false,
        decision: "rejected",
        rejectionCode: "SOURCE_TYPE_NOT_ALLOWED",
        safeMessage: "Controlled persist mode is required.",
        route: CONTROLLED_PERSIST_ROUTE,
        stateFactsCreated: 0,
        writesAttempted: false,
      },
      400
    );
  }

  if (body.confirmControlledPersistence !== true) {
    return jsonResponse(
      {
        ok: false,
        decision: "rejected",
        rejectionCode: "USER_CONFIRMATION_REQUIRED",
        safeMessage: "Explicit controlled persistence confirmation is required.",
        route: CONTROLLED_PERSIST_ROUTE,
        stateFactsCreated: 0,
        writesAttempted: false,
      },
      400
    );
  }

  const persistenceRequest = toPersistenceRequest(body.request);

  if (!persistenceRequest) {
    return jsonResponse(
      {
        ok: false,
        decision: "rejected",
        rejectionCode: "SOURCE_EVIDENCE_MISSING",
        safeMessage: "Controlled persistence request envelope is required.",
        route: CONTROLLED_PERSIST_ROUTE,
        stateFactsCreated: 0,
        writesAttempted: false,
      },
      400
    );
  }

  const result = await persistStateFactControlled({
    request: persistenceRequest,
    sourceRoute: CONTROLLED_PERSIST_ROUTE,
    contractVersion: toStringOrUndefined(body.contractVersion),
    helperVersion: toStringOrUndefined(body.helperVersion),
    d4GateVersion: toStringOrUndefined(body.d4GateVersion),
  });

  if (result.ok) {
    const status = result.decision === "persisted" ? 201 : 200;

    return jsonResponse(
      {
        ...result,
        route: CONTROLLED_PERSIST_ROUTE,
        routeDirectDatabaseAccess: false,
        delegatedToControlledHelper: true,
      },
      status
    );
  }

  if (result.decision === "shadow_only_not_persisted") {
    return jsonResponse(
      {
        ...result,
        route: CONTROLLED_PERSIST_ROUTE,
        routeDirectDatabaseAccess: false,
        delegatedToControlledHelper: true,
      },
      202
    );
  }

  return jsonResponse(
    {
      ...result,
      route: CONTROLLED_PERSIST_ROUTE,
      routeDirectDatabaseAccess: false,
      delegatedToControlledHelper: true,
    },
    400
  );
}
