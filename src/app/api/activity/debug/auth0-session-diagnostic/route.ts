import crypto from "crypto";
import { NextResponse } from "next/server";

import { auth0 } from "../../../../../../lib/auth0";

export const dynamic = "force-dynamic";

type Auth0DiagnosticWritesV0 = {
  sqlExecuted: false;
  dbWriteExecuted: false;
  supabaseReadExecuted: false;
  supabaseWriteExecuted: false;
  activityEventInserted: false;
  valueObjectCreated: false;
  activityValueObjectLinkCreated: false;
  stateDeltaCreated: false;
  stateFactCreated: false;
  stateSnapshotCreated: false;
};

type Auth0SessionDiagnosticUserSummaryV0 = {
  userObjectAvailable: boolean;
  hasSub: boolean;
  subSha256Prefix: string | null;
  hasEmail: boolean;
  hasName: boolean;
  hasNickname: boolean;
  claimKeys: string[];
};

function buildNoWrites(): Auth0DiagnosticWritesV0 {
  return {
    sqlExecuted: false,
    dbWriteExecuted: false,
    supabaseReadExecuted: false,
    supabaseWriteExecuted: false,
    activityEventInserted: false,
    valueObjectCreated: false,
    activityValueObjectLinkCreated: false,
    stateDeltaCreated: false,
    stateFactCreated: false,
    stateSnapshotCreated: false,
  };
}

function hashDiagnosticValue(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  return crypto
    .createHash("sha256")
    .update(value.trim())
    .digest("hex")
    .slice(0, 16);
}

function getObjectKeys(value: unknown): string[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.keys(value as Record<string, unknown>).sort();
}

function hasStringField(value: unknown, fieldName: string): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  const fieldValue = record[fieldName];

  return typeof fieldValue === "string" && fieldValue.length > 0;
}

function getStringField(value: unknown, fieldName: string): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const fieldValue = record[fieldName];

  return typeof fieldValue === "string" && fieldValue.length > 0
    ? fieldValue
    : null;
}

function buildUserSummary(user: unknown): Auth0SessionDiagnosticUserSummaryV0 {
  const subject = getStringField(user, "sub");

  return {
    userObjectAvailable: Boolean(user),
    hasSub: hasStringField(user, "sub"),
    subSha256Prefix: hashDiagnosticValue(subject),
    hasEmail: hasStringField(user, "email"),
    hasName: hasStringField(user, "name"),
    hasNickname: hasStringField(user, "nickname"),
    claimKeys: getObjectKeys(user),
  };
}

export async function GET() {
  let session: { user?: unknown } | null = null;
  let sessionReadOk = true;
  let sessionReadErrorName: string | null = null;
  let sessionReadErrorMessage: string | null = null;

  try {
    const auth0Session = await auth0.getSession();
    session = auth0Session ? { user: auth0Session.user } : null;
  } catch (error) {
    sessionReadOk = false;
    sessionReadErrorName =
      error instanceof Error ? error.name : "UnknownAuth0SessionError";
    sessionReadErrorMessage =
      error instanceof Error
        ? error.message.slice(0, 240)
        : "Unknown Auth0 session diagnostic error.";
  }

  const user = session?.user ?? null;

  return NextResponse.json({
    ok: true,
    endpoint: "/api/activity/debug/auth0-session-diagnostic",
    policy: "auth0_session_diagnostic_v0",
    mode: "read_only_auth0_session_diagnostic_no_write",
    countdownBeforeRealIntegrationChanges: "3/3",
    auth0SessionReadAttempted: true,
    auth0SessionReadOk: sessionReadOk,
    auth0SessionReadErrorName: sessionReadErrorName,
    auth0SessionReadErrorMessage: sessionReadErrorMessage,
    sessionAvailable: Boolean(session),
    userSummary: buildUserSummary(user),
    serverAuthReadinessImpact: {
      provesAuth0ClientImportWorks: sessionReadOk,
      provesSessionCanBeReadOnServer: sessionReadOk,
      provesInternalUserMapping: false,
      provesActorResolution: false,
      provesRlsVerification: false,
      canOpenWriteGate: false,
      canTrustClientIdentity: false,
    },
    forbiddenInThisStep: [
      "No Supabase call.",
      "No SQL call.",
      "No activity persistence.",
      "No user/actor mapping write.",
      "No existing auth route modification.",
      "No write gate opening.",
    ],
    nextVerificationStep: {
      step: "C8-I-IMPLEMENT-26",
      countdownBeforeRealIntegrationChanges: "2/3",
      goal: "Internal user / actor mapping readiness proof.",
    },
    writes: buildNoWrites(),
  });
}
