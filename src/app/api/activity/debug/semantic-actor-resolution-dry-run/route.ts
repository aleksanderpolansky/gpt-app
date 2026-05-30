import { NextResponse } from "next/server";

import { buildSemanticActorResolutionDryRunV0 } from "../../../../../../lib/activity/categoryDerivation/semanticActorResolutionDryRunV0";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const result = await buildSemanticActorResolutionDryRunV0();

  return NextResponse.json({
    ok: true,
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
