import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import { NextResponse } from "next/server";

import {
  EXTERNAL_CONCEPT_STUB_MODE_V0,
  EXTERNAL_CONCEPT_STUB_POLICY_V0,
  buildExternalConceptStubReadinessV0,
  buildExternalConceptStubV0,
  type ExternalConceptStubRawInputV0,
} from "../../../../../../lib/activity/categoryDerivation/externalConceptStubV0";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ENDPOINT = "/api/activity/debug/external-concept-stub";
const ROUTE_CONTRACT_VERSION = "external_concept_stub_route_v0";

export async function GET() {
  const platformAdminGuard = await requirePlatformAdmin();

  if (!platformAdminGuard.ok) {
    return platformAdminErrorResponse(
      platformAdminGuard,
      "debug-api-platform-admin-guard-v1",
    );
  }

  return NextResponse.json({
    ...buildExternalConceptStubReadinessV0(),
    endpoint: ENDPOINT,
    routeContractVersion: ROUTE_CONTRACT_VERSION,
    sourceContracts: {
      externalConceptStubPolicy: EXTERNAL_CONCEPT_STUB_POLICY_V0,
      externalConceptStubMode: EXTERNAL_CONCEPT_STUB_MODE_V0,
      unknownTermDetectorPolicy: "unknown_term_detector_v0",
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

  let body: ExternalConceptStubRawInputV0;

  try {
    body = (await request.json()) as ExternalConceptStubRawInputV0;
  } catch {
    const result = buildExternalConceptStubV0({});

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

  const result = buildExternalConceptStubV0(body);

  return NextResponse.json(
    {
      ...result,
      endpoint: ENDPOINT,
      routeContractVersion: ROUTE_CONTRACT_VERSION,
      sourceContracts: {
        externalConceptStubPolicy: EXTERNAL_CONCEPT_STUB_POLICY_V0,
        externalConceptStubMode: EXTERNAL_CONCEPT_STUB_MODE_V0,
        unknownTermDetectorPolicy: "unknown_term_detector_v0",
        localControlledCategoryLookupPolicy:
          "local_controlled_category_lookup_v0",
      },
      execution: {
        externalConceptStubExecuted: result.ok,
        unknownTermDetectorExecuted: true,
        localControlledCategoryLookupExecuted: true,
        externalOntologyCalled: false,
        externalNetworkCallExecuted: false,
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
