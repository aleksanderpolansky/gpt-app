export type SemanticServerAuthReadinessGatePolicyV0 =
  "semantic_server_auth_integration_design_gate_v0";

export type SemanticServerAuthReadinessGateModeV0 =
  "read_only_server_auth_design_gate_no_write";

export type SemanticServerAuthReadinessGateBlockerCodeV0 =
  | "server_auth_not_integrated"
  | "server_actor_resolution_not_integrated"
  | "server_rls_verification_not_integrated"
  | "write_gate_closed_by_design"
  | "client_identity_not_trusted"
  | "persistence_route_not_allowed_to_write";

export type SemanticServerAuthReadinessGateBlockerV0 = {
  code: SemanticServerAuthReadinessGateBlockerCodeV0;
  severity: "info" | "warning" | "blocking";
  message: string;
};

export type SemanticServerAuthReadinessGateInputV0 = {
  clientProvidedAuthenticatedUserId?: string | null;
  clientProvidedActorId?: string | null;
  clientProvidedOrganizationId?: string | null;
  clientProvidedRlsVerificationToken?: string | null;
  requestedIntent?: string | null;
  requestedTargetKey?: string | null;
};

export type SemanticServerAuthReadinessGateDecisionV0 = {
  policy: SemanticServerAuthReadinessGatePolicyV0;
  mode: SemanticServerAuthReadinessGateModeV0;
  readyForRealPersistence: false;
  canOpenWriteGate: false;
  canTrustClientIdentity: false;
  canResolveOwnerNow: false;
  serverAuthenticatedUserAvailable: false;
  serverActorResolutionAvailable: false;
  serverOrganizationResolutionAvailable: false;
  serverRlsVerificationAvailable: false;
  serverWriteGateAvailable: false;
  sqlAllowedNow: false;
  supabaseInsertAllowedNow: false;
  canCreateActivityEventNow: false;
  canCreateValueObjectNow: false;
  canCreateActivityValueObjectLinkNow: false;
  canCreateStateDeltaNow: false;
  canCreateStateFactNow: false;
  clientProvided: {
    authenticatedUserId: string | null;
    actorId: string | null;
    organizationId: string | null;
    rlsVerificationToken: string | null;
    requestedIntent: string | null;
    requestedTargetKey: string | null;
  };
  serverResolved: {
    authenticatedUserId: null;
    actorId: null;
    organizationId: null;
    rlsVerificationToken: null;
    ownerScope: null;
  };
  blockers: SemanticServerAuthReadinessGateBlockerV0[];
  requiredBeforeRealPersistence: string[];
  futureIntegrationChecklist: string[];
  forbiddenShortcuts: string[];
  writes: {
    sqlExecuted: false;
    dbWriteExecuted: false;
    activityEventInserted: false;
    valueObjectCreated: false;
    activityValueObjectLinkCreated: false;
    stateDeltaCreated: false;
    stateFactCreated: false;
    stateSnapshotCreated: false;
  };
  safetyNotes: string[];
};

function trimOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();

  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function addBlockerIfMissing(
  blockers: SemanticServerAuthReadinessGateBlockerV0[],
  blocker: SemanticServerAuthReadinessGateBlockerV0
): void {
  if (blockers.some((item) => item.code === blocker.code)) {
    return;
  }

  blockers.push(blocker);
}

export function buildSemanticServerAuthReadinessGateV0(
  input: SemanticServerAuthReadinessGateInputV0
): SemanticServerAuthReadinessGateDecisionV0 {
  const clientProvidedAuthenticatedUserId = trimOrNull(
    input.clientProvidedAuthenticatedUserId
  );
  const clientProvidedActorId = trimOrNull(input.clientProvidedActorId);
  const clientProvidedOrganizationId = trimOrNull(
    input.clientProvidedOrganizationId
  );
  const clientProvidedRlsVerificationToken = trimOrNull(
    input.clientProvidedRlsVerificationToken
  );
  const requestedIntent = trimOrNull(input.requestedIntent);
  const requestedTargetKey = trimOrNull(input.requestedTargetKey);

  const blockers: SemanticServerAuthReadinessGateBlockerV0[] = [];

  addBlockerIfMissing(blockers, {
    code: "server_auth_not_integrated",
    severity: "blocking",
    message:
      "Server-side authenticated user context is not integrated into this semantic persistence gate yet.",
  });

  addBlockerIfMissing(blockers, {
    code: "server_actor_resolution_not_integrated",
    severity: "blocking",
    message:
      "Server-side actor/owner resolution is not integrated into this semantic persistence gate yet.",
  });

  addBlockerIfMissing(blockers, {
    code: "server_rls_verification_not_integrated",
    severity: "blocking",
    message:
      "Server-side RLS/ownership verification is not integrated into this semantic persistence gate yet.",
  });

  addBlockerIfMissing(blockers, {
    code: "write_gate_closed_by_design",
    severity: "blocking",
    message:
      "Write gate is closed by design until server auth, actor resolution and RLS verification are proven.",
  });

  addBlockerIfMissing(blockers, {
    code: "persistence_route_not_allowed_to_write",
    severity: "blocking",
    message:
      "Current semantic persistence route remains dry-run/no-write only.",
  });

  if (
    clientProvidedAuthenticatedUserId ||
    clientProvidedActorId ||
    clientProvidedOrganizationId ||
    clientProvidedRlsVerificationToken
  ) {
    addBlockerIfMissing(blockers, {
      code: "client_identity_not_trusted",
      severity: "blocking",
      message:
        "Client-provided user, actor, organization and RLS fields are diagnostic only and must not authorize persistence.",
    });
  }

  return {
    policy: "semantic_server_auth_integration_design_gate_v0",
    mode: "read_only_server_auth_design_gate_no_write",
    readyForRealPersistence: false,
    canOpenWriteGate: false,
    canTrustClientIdentity: false,
    canResolveOwnerNow: false,
    serverAuthenticatedUserAvailable: false,
    serverActorResolutionAvailable: false,
    serverOrganizationResolutionAvailable: false,
    serverRlsVerificationAvailable: false,
    serverWriteGateAvailable: false,
    sqlAllowedNow: false,
    supabaseInsertAllowedNow: false,
    canCreateActivityEventNow: false,
    canCreateValueObjectNow: false,
    canCreateActivityValueObjectLinkNow: false,
    canCreateStateDeltaNow: false,
    canCreateStateFactNow: false,
    clientProvided: {
      authenticatedUserId: clientProvidedAuthenticatedUserId,
      actorId: clientProvidedActorId,
      organizationId: clientProvidedOrganizationId,
      rlsVerificationToken: clientProvidedRlsVerificationToken,
      requestedIntent,
      requestedTargetKey,
    },
    serverResolved: {
      authenticatedUserId: null,
      actorId: null,
      organizationId: null,
      rlsVerificationToken: null,
      ownerScope: null,
    },
    blockers,
    requiredBeforeRealPersistence: [
      "Read authenticated user from server-side Auth0/session context.",
      "Map server authenticated user to internal app user / actor.",
      "Resolve actor_id and owner scope server-side.",
      "Resolve organization_id server-side when organization-owned persistence is requested.",
      "Verify RLS/ownership before any insert/update.",
      "Use explicit server-side write gate, not client JSON, to enable persistence.",
      "Persist raw Activity Event before derived semantic links.",
      "Keep semantic persistence audit trail.",
    ],
    futureIntegrationChecklist: [
      "Identify current Auth0 helper used in this Next.js app.",
      "Create read-only server route that returns authenticated user diagnostics without exposing secrets.",
      "Map Auth0 subject/email to internal user profile safely.",
      "Define actor resolution strategy for personal actor and organization actor.",
      "Define RLS verification proof route or RPC contract.",
      "Only after proof: add gated write route in dry-run-first mode.",
    ],
    forbiddenShortcuts: [
      "Do not trust authenticatedUserId from request body.",
      "Do not trust actorId from request body.",
      "Do not trust organizationId from request body.",
      "Do not trust rlsVerificationToken from request body.",
      "Do not open write gate from debug routes.",
      "Do not create state facts/snapshots from semantic preview candidates.",
      "Do not create active global categories directly from AI or external concept output.",
    ],
    writes: {
      sqlExecuted: false,
      dbWriteExecuted: false,
      activityEventInserted: false,
      valueObjectCreated: false,
      activityValueObjectLinkCreated: false,
      stateDeltaCreated: false,
      stateFactCreated: false,
      stateSnapshotCreated: false,
    },
    safetyNotes: [
      "This is a design gate only.",
      "No Auth0, Supabase, SQL or persistence call is executed here.",
      "The gate intentionally remains closed even if client sends identity-like values.",
      "Future real persistence must be server-authenticated and RLS-verified.",
    ],
  };
}
