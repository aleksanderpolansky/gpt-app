import type { ControlledActivityIntakeTrustedContext } from "./idempotency";

export const CONTROLLED_ACTIVITY_INTAKE_SERVER_SIDE_APP_USER_MAPPING_LAYER =
  "controlled-activity-intake-server-side-app-user-mapping-static-helper-v1" as const;

export type ControlledActivityIntakeServerSideMappingSource =
  | "server_side_app_user_mapping"
  | "test_static_helper";

export type ControlledActivityIntakeServerSideIdentity = {
  readonly authSubject?: string | null;
  readonly provider?: string | null;
  readonly email?: string | null;
  readonly sessionId?: string | null;
  readonly requestSource?: string | null;
};

export type ControlledActivityIntakeServerSideAppUserMappingSource =
  | "user_profile"
  | "auth_user_sync"
  | "manual_verified_mapping"
  | "test_injected_read_model";

export type ControlledActivityIntakeServerSideAppUserMappingStatus =
  | "active"
  | "blocked"
  | "missing"
  | "ambiguous";

export type ControlledActivityIntakeServerSideAppUserReadModel = {
  readonly appUserId?: string | null;
  readonly internalUserId?: string | null;
  readonly authSubject?: string | null;
  readonly mappingSource:
    | ControlledActivityIntakeServerSideAppUserMappingSource
    | string;
  readonly mappingStatus:
    | ControlledActivityIntakeServerSideAppUserMappingStatus
    | string;
  readonly email?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
};

export type ControlledActivityIntakeServerSideMembershipStatus =
  | "active"
  | "blocked"
  | "missing"
  | "not_allowed";

export type ControlledActivityIntakeServerSideMembershipSource =
  | "organization_membership"
  | "space_membership"
  | "actor_space_role"
  | "test_injected_read_model";

export type ControlledActivityIntakeServerSideMembershipReadModel = {
  readonly actorId?: string | null;
  readonly organizationId?: string | null;
  readonly spaceId?: string | null;
  readonly actorStatus?:
    | ControlledActivityIntakeServerSideMembershipStatus
    | string
    | null;
  readonly organizationMembershipStatus?:
    | ControlledActivityIntakeServerSideMembershipStatus
    | string
    | null;
  readonly spaceMembershipStatus?:
    | ControlledActivityIntakeServerSideMembershipStatus
    | string
    | null;
  readonly role?: string | null;
  readonly membershipSource?:
    | ControlledActivityIntakeServerSideMembershipSource
    | string
    | null;
};

export type ControlledActivityIntakeServerSideRequestedContext = {
  readonly actorId?: string | null;
  readonly organizationId?: string | null;
  readonly spaceId?: string | null;
};

export type ControlledActivityIntakeServerSideAppUserMappingGuardrails = {
  readonly staticHelperOnly: true;
  readonly serverSideMappingOnly: true;
  readonly serverSideContextRequired: true;
  readonly clientOwnershipAccepted: false;
  readonly previewHeaderAcceptedForProductionWrite: false;
  readonly dbReadExecuted: false;
  readonly dbWriteExecuted: false;
  readonly sqlExecuted: false;
  readonly aiCallExecuted: false;
  readonly semanticCandidatesPersisted: false;
  readonly valueObjectsCreated: false;
  readonly stateFactsCreated: false;
  readonly stateDeltasCreated: false;
  readonly stateSnapshotsCreated: false;
};

export type ControlledActivityIntakeServerSideAppUserMappingInput = {
  readonly source?: ControlledActivityIntakeServerSideMappingSource;
  readonly identity?: ControlledActivityIntakeServerSideIdentity | null;
  readonly appUserReadModel?:
    | ControlledActivityIntakeServerSideAppUserReadModel
    | null;
  readonly membershipReadModel?:
    | ControlledActivityIntakeServerSideMembershipReadModel
    | null;
  readonly requestedContext?:
    | ControlledActivityIntakeServerSideRequestedContext
    | null;
  readonly requestSource?: string | null;
};

export type ControlledActivityIntakeServerSideAppUserMappingFailureCode =
  | "CONTROLLED_INTAKE_SERVER_SESSION_REQUIRED"
  | "CONTROLLED_INTAKE_AUTH_SUBJECT_REQUIRED"
  | "CONTROLLED_INTAKE_APP_USER_MAPPING_REQUIRED"
  | "CONTROLLED_INTAKE_APP_USER_MAPPING_AMBIGUOUS"
  | "CONTROLLED_INTAKE_APP_USER_MAPPING_BLOCKED"
  | "CONTROLLED_INTAKE_AUTH_SUBJECT_MISMATCH"
  | "CONTROLLED_INTAKE_CONTEXT_NOT_VERIFIED"
  | "CONTROLLED_INTAKE_ACTOR_NOT_ALLOWED"
  | "CONTROLLED_INTAKE_ORGANIZATION_NOT_ALLOWED"
  | "CONTROLLED_INTAKE_SPACE_NOT_ALLOWED";

export type ControlledActivityIntakeServerSideAppUserMappingEvidence = {
  readonly identityEvidence: "server_session";
  readonly appUserMappingEvidence: string;
  readonly membershipEvidence?: string;
};

export type ControlledActivityIntakeServerSideAppUserMappingSuccess = {
  readonly ok: true;
  readonly layer: typeof CONTROLLED_ACTIVITY_INTAKE_SERVER_SIDE_APP_USER_MAPPING_LAYER;
  readonly source: ControlledActivityIntakeServerSideMappingSource;
  readonly authSubject: string;
  readonly appUserId: string;
  readonly internalUserId?: string;
  readonly trustedContext: ControlledActivityIntakeTrustedContext;
  readonly evidence: ControlledActivityIntakeServerSideAppUserMappingEvidence;
  readonly guardrails: ControlledActivityIntakeServerSideAppUserMappingGuardrails;
};

export type ControlledActivityIntakeServerSideAppUserMappingFailure = {
  readonly ok: false;
  readonly layer: typeof CONTROLLED_ACTIVITY_INTAKE_SERVER_SIDE_APP_USER_MAPPING_LAYER;
  readonly source: ControlledActivityIntakeServerSideMappingSource;
  readonly code: ControlledActivityIntakeServerSideAppUserMappingFailureCode;
  readonly message: string;
  readonly guardrails: ControlledActivityIntakeServerSideAppUserMappingGuardrails;
};

export type ControlledActivityIntakeServerSideAppUserMappingResult =
  | ControlledActivityIntakeServerSideAppUserMappingSuccess
  | ControlledActivityIntakeServerSideAppUserMappingFailure;

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function buildGuardrails(): ControlledActivityIntakeServerSideAppUserMappingGuardrails {
  return {
    staticHelperOnly: true,
    serverSideMappingOnly: true,
    serverSideContextRequired: true,
    clientOwnershipAccepted: false,
    previewHeaderAcceptedForProductionWrite: false,
    dbReadExecuted: false,
    dbWriteExecuted: false,
    sqlExecuted: false,
    aiCallExecuted: false,
    semanticCandidatesPersisted: false,
    valueObjectsCreated: false,
    stateFactsCreated: false,
    stateDeltasCreated: false,
    stateSnapshotsCreated: false,
  };
}

function buildFailure(
  source: ControlledActivityIntakeServerSideMappingSource,
  code: ControlledActivityIntakeServerSideAppUserMappingFailureCode,
  message: string,
): ControlledActivityIntakeServerSideAppUserMappingFailure {
  return {
    ok: false,
    layer: CONTROLLED_ACTIVITY_INTAKE_SERVER_SIDE_APP_USER_MAPPING_LAYER,
    source,
    code,
    message,
    guardrails: buildGuardrails(),
  };
}

function normalizeMappingStatus(
  value: unknown,
): ControlledActivityIntakeServerSideAppUserMappingStatus | undefined {
  const normalized = normalizeOptionalString(value);

  if (
    normalized === "active" ||
    normalized === "blocked" ||
    normalized === "missing" ||
    normalized === "ambiguous"
  ) {
    return normalized;
  }

  return undefined;
}

function isActiveMembershipStatus(value: unknown): boolean {
  return normalizeOptionalString(value) === "active";
}

function buildMembershipEvidence(
  membershipReadModel:
    | ControlledActivityIntakeServerSideMembershipReadModel
    | null
    | undefined,
): string | undefined {
  const membershipSource = normalizeOptionalString(
    membershipReadModel?.membershipSource,
  );

  if (membershipSource) {
    return membershipSource;
  }

  if (
    normalizeOptionalString(membershipReadModel?.actorId) ||
    normalizeOptionalString(membershipReadModel?.organizationId) ||
    normalizeOptionalString(membershipReadModel?.spaceId)
  ) {
    return "injected_membership_read_model";
  }

  return undefined;
}

function resolveActorId(
  requestedContext: ControlledActivityIntakeServerSideRequestedContext | null | undefined,
  membershipReadModel: ControlledActivityIntakeServerSideMembershipReadModel | null | undefined,
): { readonly ok: true; readonly value?: string } | { readonly ok: false } {
  const requestedActorId = normalizeOptionalString(requestedContext?.actorId);
  const verifiedActorId = normalizeOptionalString(membershipReadModel?.actorId);
  const actorIsActive = isActiveMembershipStatus(membershipReadModel?.actorStatus);

  if (requestedActorId) {
    if (verifiedActorId === requestedActorId && actorIsActive) {
      return { ok: true, value: requestedActorId };
    }

    return { ok: false };
  }

  if (verifiedActorId && actorIsActive) {
    return { ok: true, value: verifiedActorId };
  }

  return { ok: true };
}

function resolveOrganizationId(
  requestedContext: ControlledActivityIntakeServerSideRequestedContext | null | undefined,
  membershipReadModel: ControlledActivityIntakeServerSideMembershipReadModel | null | undefined,
): { readonly ok: true; readonly value?: string } | { readonly ok: false } {
  const requestedOrganizationId = normalizeOptionalString(
    requestedContext?.organizationId,
  );
  const verifiedOrganizationId = normalizeOptionalString(
    membershipReadModel?.organizationId,
  );
  const organizationIsActive = isActiveMembershipStatus(
    membershipReadModel?.organizationMembershipStatus,
  );

  if (requestedOrganizationId) {
    if (
      verifiedOrganizationId === requestedOrganizationId &&
      organizationIsActive
    ) {
      return { ok: true, value: requestedOrganizationId };
    }

    return { ok: false };
  }

  if (verifiedOrganizationId && organizationIsActive) {
    return { ok: true, value: verifiedOrganizationId };
  }

  return { ok: true };
}

function resolveSpaceId(
  requestedContext: ControlledActivityIntakeServerSideRequestedContext | null | undefined,
  membershipReadModel: ControlledActivityIntakeServerSideMembershipReadModel | null | undefined,
): { readonly ok: true; readonly value?: string } | { readonly ok: false } {
  const requestedSpaceId = normalizeOptionalString(requestedContext?.spaceId);
  const verifiedSpaceId = normalizeOptionalString(membershipReadModel?.spaceId);
  const spaceIsActive = isActiveMembershipStatus(
    membershipReadModel?.spaceMembershipStatus,
  );

  if (requestedSpaceId) {
    if (verifiedSpaceId === requestedSpaceId && spaceIsActive) {
      return { ok: true, value: requestedSpaceId };
    }

    return { ok: false };
  }

  if (verifiedSpaceId && spaceIsActive) {
    return { ok: true, value: verifiedSpaceId };
  }

  return { ok: true };
}

export function isControlledActivityIntakeServerSideAppUserMappingFailure(
  result: ControlledActivityIntakeServerSideAppUserMappingResult,
): result is ControlledActivityIntakeServerSideAppUserMappingFailure {
  return result.ok === false;
}

export function buildControlledActivityIntakeServerSideAppUserMapping(
  input: ControlledActivityIntakeServerSideAppUserMappingInput,
): ControlledActivityIntakeServerSideAppUserMappingResult {
  const source = input.source ?? "server_side_app_user_mapping";
  const identity = input.identity ?? null;

  if (!identity) {
    return buildFailure(
      source,
      "CONTROLLED_INTAKE_SERVER_SESSION_REQUIRED",
      "Controlled intake requires authenticated server-side session identity.",
    );
  }

  const authSubject = normalizeOptionalString(identity.authSubject);

  if (!authSubject) {
    return buildFailure(
      source,
      "CONTROLLED_INTAKE_AUTH_SUBJECT_REQUIRED",
      "Controlled intake requires non-empty server-side auth subject.",
    );
  }

  const appUserReadModel = input.appUserReadModel ?? null;

  if (!appUserReadModel) {
    return buildFailure(
      source,
      "CONTROLLED_INTAKE_APP_USER_MAPPING_REQUIRED",
      "Controlled intake requires server-side app user mapping read model.",
    );
  }

  const mappingStatus = normalizeMappingStatus(appUserReadModel.mappingStatus);

  if (mappingStatus === "ambiguous") {
    return buildFailure(
      source,
      "CONTROLLED_INTAKE_APP_USER_MAPPING_AMBIGUOUS",
      "Controlled intake app user mapping is ambiguous.",
    );
  }

  if (mappingStatus === "blocked") {
    return buildFailure(
      source,
      "CONTROLLED_INTAKE_APP_USER_MAPPING_BLOCKED",
      "Controlled intake app user mapping is blocked.",
    );
  }

  if (mappingStatus !== "active") {
    return buildFailure(
      source,
      "CONTROLLED_INTAKE_APP_USER_MAPPING_REQUIRED",
      "Controlled intake requires active app user mapping.",
    );
  }

  const mappedAuthSubject = normalizeOptionalString(appUserReadModel.authSubject);

  if (!mappedAuthSubject) {
    return buildFailure(
      source,
      "CONTROLLED_INTAKE_APP_USER_MAPPING_REQUIRED",
      "Controlled intake app user mapping must include auth subject evidence.",
    );
  }

  if (mappedAuthSubject !== authSubject) {
    return buildFailure(
      source,
      "CONTROLLED_INTAKE_AUTH_SUBJECT_MISMATCH",
      "Controlled intake app user mapping auth subject does not match server identity.",
    );
  }

  const appUserId = normalizeOptionalString(appUserReadModel.appUserId);

  if (!appUserId) {
    return buildFailure(
      source,
      "CONTROLLED_INTAKE_APP_USER_MAPPING_REQUIRED",
      "Controlled intake app user mapping must include appUserId.",
    );
  }

  const actorResult = resolveActorId(
    input.requestedContext,
    input.membershipReadModel,
  );

  if (!actorResult.ok) {
    return buildFailure(
      source,
      "CONTROLLED_INTAKE_ACTOR_NOT_ALLOWED",
      "Controlled intake actor context was requested but not verified.",
    );
  }

  const organizationResult = resolveOrganizationId(
    input.requestedContext,
    input.membershipReadModel,
  );

  if (!organizationResult.ok) {
    return buildFailure(
      source,
      "CONTROLLED_INTAKE_ORGANIZATION_NOT_ALLOWED",
      "Controlled intake organization context was requested but not verified.",
    );
  }

  const spaceResult = resolveSpaceId(
    input.requestedContext,
    input.membershipReadModel,
  );

  if (!spaceResult.ok) {
    return buildFailure(
      source,
      "CONTROLLED_INTAKE_SPACE_NOT_ALLOWED",
      "Controlled intake space context was requested but not verified.",
    );
  }

  const requestSource =
    normalizeOptionalString(input.requestSource) ??
    normalizeOptionalString(identity.requestSource) ??
    "controlled-intake-server-side-app-user-mapping";

  const trustedContext: ControlledActivityIntakeTrustedContext = {
    appUserId,
    ...(actorResult.value ? { actorId: actorResult.value } : {}),
    ...(organizationResult.value
      ? { organizationId: organizationResult.value }
      : {}),
    ...(spaceResult.value ? { spaceId: spaceResult.value } : {}),
    requestSource,
  };

  const appUserMappingEvidence =
    normalizeOptionalString(appUserReadModel.mappingSource) ??
    "injected_app_user_read_model";

  const membershipEvidence = buildMembershipEvidence(input.membershipReadModel);
  const internalUserId = normalizeOptionalString(appUserReadModel.internalUserId);

  return {
    ok: true,
    layer: CONTROLLED_ACTIVITY_INTAKE_SERVER_SIDE_APP_USER_MAPPING_LAYER,
    source,
    authSubject,
    appUserId,
    ...(internalUserId ? { internalUserId } : {}),
    trustedContext,
    evidence: {
      identityEvidence: "server_session",
      appUserMappingEvidence,
      ...(membershipEvidence ? { membershipEvidence } : {}),
    },
    guardrails: buildGuardrails(),
  };
}

export function assertControlledActivityIntakeServerSideAppUserMapping(
  result: ControlledActivityIntakeServerSideAppUserMappingResult,
): ControlledActivityIntakeTrustedContext {
  if (isControlledActivityIntakeServerSideAppUserMappingFailure(result)) {
    throw new Error(
      `${result.code}: ${result.message}`,
    );
  }

  return result.trustedContext;
}