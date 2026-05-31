import { NextResponse } from "next/server";

import {
  LOCAL_CONTROLLED_CATEGORY_LOOKUP_MODE_V0,
  LOCAL_CONTROLLED_CATEGORY_LOOKUP_POLICY_V0,
  buildLocalControlledCategoryLookupReadinessV0,
  buildLocalControlledCategoryLookupV0,
  type LocalControlledCategoryLookupRawInputV0,
} from "../../../../../../lib/activity/categoryDerivation/localControlledCategoryLookupV0";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ENDPOINT = "/api/activity/debug/local-controlled-category-lookup";
const ROUTE_CONTRACT_VERSION = "local_controlled_category_lookup_route_v0";

export async function GET() {
  return NextResponse.json({
    ...buildLocalControlledCategoryLookupReadinessV0(),
    endpoint: ENDPOINT,
    routeContractVersion: ROUTE_CONTRACT_VERSION,
    sourceContracts: {
      localControlledCategoryLookupPolicy:
        LOCAL_CONTROLLED_CATEGORY_LOOKUP_POLICY_V0,
      localControlledCategoryLookupMode:
        LOCAL_CONTROLLED_CATEGORY_LOOKUP_MODE_V0,
    },
  });
}

export async function POST(request: Request) {
  let body: LocalControlledCategoryLookupRawInputV0;

  try {
    body = (await request.json()) as LocalControlledCategoryLookupRawInputV0;
  } catch {
    const result = buildLocalControlledCategoryLookupV0({});

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

  const result = buildLocalControlledCategoryLookupV0(body);

  return NextResponse.json(
    {
      ...result,
      endpoint: ENDPOINT,
      routeContractVersion: ROUTE_CONTRACT_VERSION,
      sourceContracts: {
        localControlledCategoryLookupPolicy:
          LOCAL_CONTROLLED_CATEGORY_LOOKUP_POLICY_V0,
        localControlledCategoryLookupMode:
          LOCAL_CONTROLLED_CATEGORY_LOOKUP_MODE_V0,
      },
      execution: {
        localControlledCategoryLookupExecuted: result.ok,
        externalOntologyCalled: false,
        unknownTermCandidatePersisted: false,
        resolverPersisted: false,
        stableBundlePersisted: false,
        persistenceAttempted: false,
        statePersistenceAttempted: false,
      },
    },
    { status: result.ok ? 200 : 400 }
  );
}
