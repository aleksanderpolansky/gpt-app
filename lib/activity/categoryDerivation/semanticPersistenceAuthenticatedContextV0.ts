export type SemanticPersistenceAuthenticatedContextPolicyV0 =
  "semantic_persistence_authenticated_context_contract_v0";

export type SemanticPersistenceAuthenticatedContextModeV0 =
  "server_auth_context_missing_in_dry_run";

export type SemanticPersistenceAuthenticatedContextBlockerCodeV0 =
  | "dry_run_context_only"
  | "client_identity_not_trusted"
  | "missing_server_authenticated_user"
  | "missing_server_actor_resolution"
  | "missing_server_rls_verification"
  | "write_gate_must_remain_closed";

export type SemanticPersistenceAuthenticatedContextBlockerV0 = {
  code: SemanticPersistenceAuthenticatedContextBlockerCodeV0;
  severity: "info" | "warning" | "blocking";
  message: string;
};

export type SemanticPersistenceAuthenticatedContextDecisionV0 = {
  policy: SemanticPersistenceAuthenticatedContextPolicyV0;
  mode: SemanticPersistenceAuthenticatedContextModeV0;
  canTrustClientIdentity: false;
  authenticatedUserAvailable: false;
  actorAvailable: false;
  rlsVerificationAvailable: false;
  canResolveOwnerNow: false;
  canOpenWriteGate: false;
  clientProvided: {
    authenticatedUserId: string | null;
    actorId: string | null;
    rlsVerificationToken: string | null;
  };
  serverResolved: {
    authenticatedUserId: null;
    actorId: null;
    rlsVerificationToken: null;
  };
  blockers: SemanticPersistenceAuthenticatedContextBlockerV0[];
  requiredBeforeRealPersistence: string[];
  safetyNotes: string[];
};

export type BuildSemanticPersistenceAuthenticatedContextV0Params = {
  clientProvidedAuthenticatedUserId?: string | null;
  clientProvidedActorId?: string | null;
  clientProvidedRlsVerificationToken?: string | null;
};

function trimOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();

  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function addBlockerIfMissing(
  blockers: SemanticPersistenceAuthenticatedContextBlockerV0[],
  blocker: SemanticPersistenceAuthenticatedContextBlockerV0
): void {
  if (blockers.some((item) => item.code === blocker.code)) {
    return;
  }

  blockers.push(blocker);
}

export function buildSemanticPersistenceAuthenticatedContextV0(
  params: BuildSemanticPersistenceAuthenticatedContextV0Params
): SemanticPersistenceAuthenticatedContextDecisionV0 {
  const clientProvidedAuthenticatedUserId = trimOrNull(
    params.clientProvidedAuthenticatedUserId
  );
  const clientProvidedActorId = trimOrNull(params.clientProvidedActorId);
  const clientProvidedRlsVerificationToken = trimOrNull(
    params.clientProvidedRlsVerificationToken
  );

  const blockers: SemanticPersistenceAuthenticatedContextBlockerV0[] = [];

  addBlockerIfMissing(blockers, {
    code: "dry_run_context_only",
    severity: "blocking",
    message:
      "This context contract is dry-run only and must not open a write gate.",
  });

  addBlockerIfMissing(blockers, {
    code: "missing_server_authenticated_user",
    severity: "blocking",
    message:
      "A future real persistence route must read the authenticated user from server-side auth context.",
  });

  addBlockerIfMissing(blockers, {
    code: "missing_server_actor_resolution",
    severity: "blocking",
    message:
      "A future real persistence route must resolve actor_id/owner context server-side.",
  });

  addBlockerIfMissing(blockers, {
    code: "missing_server_rls_verification",
    severity: "blocking",
    message:
      "A future real persistence route must verify RLS/ownership context server-side.",
  });

  addBlockerIfMissing(blockers, {
    code: "write_gate_must_remain_closed",
    severity: "blocking",
    message:
      "Write gate must remain closed until server auth, actor resolution and RLS verification are available.",
  });

  if (
    clientProvidedAuthenticatedUserId ||
    clientProvidedActorId ||
    clientProvidedRlsVerificationToken
  ) {
    addBlockerIfMissing(blockers, {
      code: "client_identity_not_trusted",
      severity: "blocking",
      message:
        "Client-provided user, actor or RLS values are recorded only as untrusted input and must not authorize persistence.",
    });
  }

  return {
    policy: "semantic_persistence_authenticated_context_contract_v0",
    mode: "server_auth_context_missing_in_dry_run",
    canTrustClientIdentity: false,
    authenticatedUserAvailable: false,
    actorAvailable: false,
    rlsVerificationAvailable: false,
    canResolveOwnerNow: false,
    canOpenWriteGate: false,
    clientProvided: {
      authenticatedUserId: clientProvidedAuthenticatedUserId,
      actorId: clientProvidedActorId,
      rlsVerificationToken: clientProvidedRlsVerificationToken,
    },
    serverResolved: {
      authenticatedUserId: null,
      actorId: null,
      rlsVerificationToken: null,
    },
    blockers,
    requiredBeforeRealPersistence: [
      "Read authenticated user from server-side auth/session context.",
      "Resolve actor_id and owner scope on the server.",
      "Verify RLS/ownership before any insert/update.",
      "Ignore client-provided user_id, actor_id and RLS tokens as authorization evidence.",
      "Open write execution only through an explicit server-side gate.",
      "Keep audit trail for all semantic persistence decisions.",
    ],
    safetyNotes: [
      "This contract intentionally does not call Auth0, Supabase or SQL.",
      "Client-provided identity fields are treated as untrusted diagnostic input only.",
      "Future real persistence must not trust IDs passed from the browser body.",
    ],
  };
}
