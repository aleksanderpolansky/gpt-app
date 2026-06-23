import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import { NextResponse } from "next/server";

import {
  STABLE_SEMANTIC_BUNDLE_PERSISTENCE_SERVICE_SANDBOX_WRITE_ADAPTER_MODE_V0,
  STABLE_SEMANTIC_BUNDLE_PERSISTENCE_SERVICE_SANDBOX_WRITE_ADAPTER_POLICY_V0,
  buildStableSemanticBundlePersistenceServiceSandboxWriteAdapterReadinessV0,
  runStableSemanticBundlePersistenceServiceSandboxWriteAdapterV0,
} from "../../../../../../lib/activity/categoryDerivation/stableSemanticBundlePersistenceServiceSandboxWriteAdapterV0";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ENDPOINT =
  "/api/activity/debug/stable-semantic-bundle-persistence-service-sandbox-write-adapter";
const ROUTE_CONTRACT_VERSION =
  "stable_semantic_bundle_persistence_service_sandbox_write_adapter_route_v0";

function withRouteMetadata(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(
    {
      ...payload,
      endpoint: ENDPOINT,
      routeContractVersion: ROUTE_CONTRACT_VERSION,
      sourceContracts: {
        adapterPolicy:
          STABLE_SEMANTIC_BUNDLE_PERSISTENCE_SERVICE_SANDBOX_WRITE_ADAPTER_POLICY_V0,
        adapterMode:
          STABLE_SEMANTIC_BUNDLE_PERSISTENCE_SERVICE_SANDBOX_WRITE_ADAPTER_MODE_V0,
        servicePolicy: "stable_semantic_bundle_persistence_service_v0",
        delegatedWriteGatePolicy:
          "stable_semantic_bundle_explicit_sandbox_write_gate_v0",
      },
    },
    { status }
  );
}

export async function GET() {
  const platformAdminGuard = await requirePlatformAdmin();

  if (!platformAdminGuard.ok) {
    return platformAdminErrorResponse(
      platformAdminGuard,
      "debug-api-platform-admin-guard-v1",
    );
  }

  return withRouteMetadata({
    ...buildStableSemanticBundlePersistenceServiceSandboxWriteAdapterReadinessV0(),
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

  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const requestOrigin = new URL(request.url).origin;
  const endpointBaseUrl =
    typeof body.endpointBaseUrl === "string" && body.endpointBaseUrl.trim() !== ""
      ? body.endpointBaseUrl.trim()
      : requestOrigin;

  const result =
    await runStableSemanticBundlePersistenceServiceSandboxWriteAdapterV0({
      adapterMode: "duplicate_fixture_only",
      endpointBaseUrl,
    });

  return withRouteMetadata(result, result.ok ? 200 : 500);
}
