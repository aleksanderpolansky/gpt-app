import { NextResponse } from "next/server";

import { buildSemanticServerAuthReadinessGateV0 } from "../../../../../../lib/activity/categoryDerivation/semanticServerAuthReadinessGateV0";

export const dynamic = "force-dynamic";

type ServerAuthReadinessBody = {
  authenticatedUserId?: unknown;
  actorId?: unknown;
  organizationId?: unknown;
  rlsVerificationToken?: unknown;
  requestedIntent?: unknown;
  requestedTargetKey?: unknown;
};

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

export async function GET() {
  const gate = buildSemanticServerAuthReadinessGateV0({});

  return NextResponse.json({
    ok: true,
    endpoint: "/api/activity/semantic/server-auth-readiness",
    method: "GET|POST",
    policy: "semantic_server_auth_integration_design_gate_v0",
    mode: "read_only_server_auth_design_gate_no_write",
    gate,
    writes: gate.writes,
    example: {
      authenticatedUserId: "client-user-untrusted",
      actorId: "client-actor-untrusted",
      organizationId: "client-organization-untrusted",
      rlsVerificationToken: "client-rls-token-untrusted",
      requestedIntent: "persist_value_object_candidate",
      requestedTargetKey: "vo:personal:child-learning-support",
    },
  });
}

export async function POST(request: Request) {
  let body: ServerAuthReadinessBody;

  try {
    body = (await request.json()) as ServerAuthReadinessBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid JSON body.",
      },
      { status: 400 }
    );
  }

  const gate = buildSemanticServerAuthReadinessGateV0({
    clientProvidedAuthenticatedUserId: asString(body.authenticatedUserId),
    clientProvidedActorId: asString(body.actorId),
    clientProvidedOrganizationId: asString(body.organizationId),
    clientProvidedRlsVerificationToken: asString(body.rlsVerificationToken),
    requestedIntent: asString(body.requestedIntent),
    requestedTargetKey: asString(body.requestedTargetKey),
  });

  return NextResponse.json({
    ok: true,
    endpoint: "/api/activity/semantic/server-auth-readiness",
    policy: "semantic_server_auth_integration_design_gate_v0",
    mode: "read_only_server_auth_design_gate_no_write",
    gate,
    writes: gate.writes,
  });
}
