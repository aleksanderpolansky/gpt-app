import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import { NextResponse } from "next/server";

import { buildSemanticActorResolutionDryRunV0 } from "../../../../../../lib/activity/categoryDerivation/semanticActorResolutionDryRunV0";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const platformAdminGuard = await requirePlatformAdmin();

  if (!platformAdminGuard.ok) {
    return platformAdminErrorResponse(
      platformAdminGuard,
      "debug-api-platform-admin-guard-v1",
    );
  }

  const url = new URL(request.url);
  const selectedSpaceIdSha256Prefix = url.searchParams.get(
    "selectedSpaceIdSha256Prefix"
  );

  const result = await buildSemanticActorResolutionDryRunV0({
    selectedSpaceIdSha256Prefix,
  });

  return NextResponse.json({
    ok: true,
    selectedSpaceIdSha256Prefix,
    endpoint: "/api/activity/debug/semantic-actor-resolution-dry-run",
    policy: result.endpointPolicy,
    mode: result.mode,
    countdownBeforeFirstDbWrite: result.countdownBeforeFirstDbWrite,
    auth0Session: result.auth0Session,
    supabaseReadiness: result.supabaseReadiness,
    appUserMapping: result.appUserMapping,
    actorResolution: result.actorResolution,
    readinessDecision: result.readinessDecision,
    forbiddenInThisStep: result.forbiddenInThisStep,
    nextStep: result.nextStep,
    writes: result.writes,
  });
}

