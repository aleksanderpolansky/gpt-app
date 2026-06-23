import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import { NextResponse } from "next/server";

import {
  UNKNOWN_TERM_DETECTOR_MODE_V0,
  UNKNOWN_TERM_DETECTOR_POLICY_V0,
  buildUnknownTermDetectorReadinessV0,
  buildUnknownTermDetectorV0,
  type UnknownTermDetectorRawInputV0,
} from "../../../../../../lib/activity/categoryDerivation/unknownTermDetectorV0";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ENDPOINT = "/api/activity/debug/unknown-term-detector";
const ROUTE_CONTRACT_VERSION = "unknown_term_detector_route_v0";

export async function GET() {
  const platformAdminGuard = await requirePlatformAdmin();

  if (!platformAdminGuard.ok) {
    return platformAdminErrorResponse(
      platformAdminGuard,
      "debug-api-platform-admin-guard-v1",
    );
  }

  return NextResponse.json({
    ...buildUnknownTermDetectorReadinessV0(),
    endpoint: ENDPOINT,
    routeContractVersion: ROUTE_CONTRACT_VERSION,
    sourceContracts: {
      unknownTermDetectorPolicy: UNKNOWN_TERM_DETECTOR_POLICY_V0,
      unknownTermDetectorMode: UNKNOWN_TERM_DETECTOR_MODE_V0,
      localControlledCategoryLookupPolicy:
        "local_controlled_category_lookup_v0",
    },
  });
}

export async function POST(request: Request) {
  const platformAdminGuard = await requirePlatformAdmin();

  if (!platformAdminGuard.ok) {
    return platformAdminErrorResponse(
      platformAdminGuard,
      "debug-api-platform-admin-guard-v1",
    );
  }

  let body: UnknownTermDetectorRawInputV0;

  try {
    body = (await request.json()) as UnknownTermDetectorRawInputV0;
  } catch {
    const result = buildUnknownTermDetectorV0({});

    return NextResponse.json(
      {
        ...result,
        endpoint: ENDPOINT,
        routeContractVersion: ROUTE_CONTRACT_VERSION,
        error: "Invalid JSON body.",
      },
      { status: 400 }
    );
  }

  const result = buildUnknownTermDetectorV0(body);

  return NextResponse.json(
    {
      ...result,
      endpoint: ENDPOINT,
      routeContractVersion: ROUTE_CONTRACT_VERSION,
      sourceContracts: {
        unknownTermDetectorPolicy: UNKNOWN_TERM_DETECTOR_POLICY_V0,
        unknownTermDetectorMode: UNKNOWN_TERM_DETECTOR_MODE_V0,
        localControlledCategoryLookupPolicy:
          "local_controlled_category_lookup_v0",
      },
      execution: {
        unknownTermDetectorExecuted: result.ok,
        localControlledCategoryLookupExecuted: true,
        externalOntologyCalled: false,
        unknownTermCandidatePersisted: false,
        externalConceptCandidatePersisted: false,
        resolverPersisted: false,
        stableBundlePersisted: false,
        persistenceAttempted: false,
        statePersistenceAttempted: false,
      },
    },
    { status: result.ok ? 200 : 400 }
  );
}
