import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import crypto from "crypto";
import { NextResponse } from "next/server";

import { auth0 } from "../../../../../../lib/auth0";
import { getSupabaseAdminClient } from "../../../../../../lib/supabase/admin";

export const dynamic = "force-dynamic";

type MappingReadinessWritesV0 = {
  sqlExecuted: false;
  dbReadExecuted: boolean;
  dbWriteExecuted: false;
  supabaseReadExecuted: boolean;
  supabaseWriteExecuted: false;
  activityEventInserted: false;
  valueObjectCreated: false;
  activityValueObjectLinkCreated: false;
  stateDeltaCreated: false;
  stateFactCreated: false;
  stateSnapshotCreated: false;
};

type ProbeResultV0 = {
  key: string;
  table: string;
  selectedColumns: string;
  attempted: boolean;
  ok: boolean;
  rowCount: number | null;
  errorCode: string | null;
  errorMessage: string | null;
};

type MappingOutcomeV0 =
  | "not_attempted_no_session"
  | "mapped"
  | "not_found"
  | "duplicate"
  | "query_error"
  | "shape_error"
  | "client_creation_error";

type AppUserRowV0 = {
  id?: string | null;
  auth0_sub?: string | null;
};

type AppUserMappingResultV0 = {
  attempted: boolean;
  outcome: MappingOutcomeV0;
  appUserRowCount: number | null;
  appUserIdSha256Prefix: string | null;
  errorCode: string | null;
  errorMessage: string | null;
};

type ActorCandidateResultV0 = {
  candidateTablesChecked: number;
  readableCandidateTables: number;
  candidateTables: ProbeResultV0[];
  actorResolutionProven: false;
  actorResolutionReason: string;
};

function buildWrites(supabaseReadExecuted: boolean): MappingReadinessWritesV0 {
  return {
    sqlExecuted: false,
    dbReadExecuted: supabaseReadExecuted,
    dbWriteExecuted: false,
    supabaseReadExecuted,
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readStringProperty(value: unknown, key: string): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const fieldValue = value[key];

  return typeof fieldValue === "string" && fieldValue.length > 0
    ? fieldValue
    : null;
}

function readAuthSubjectFromSession(session: unknown): string | null {
  if (!isRecord(session)) {
    return null;
  }

  const user = session.user;

  if (!isRecord(user)) {
    return null;
  }

  return readStringProperty(user, "sub");
}

function getSupabaseUrlConfigured(): boolean {
  return Boolean(
    (
      process.env.SUPABASE_URL ??
      process.env.NEXT_PUBLIC_SUPABASE_URL ??
      ""
    ).trim()
  );
}

function getServiceRoleKeyConfigured(): boolean {
  return Boolean((process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim());
}

function sanitizeErrorMessage(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return value.slice(0, 220);
}

type SupabaseAdminClientV0 = ReturnType<typeof getSupabaseAdminClient>;

async function probeTableShape(
  supabase: SupabaseAdminClientV0,
  key: string,
  table: string,
  selectedColumns: string
): Promise<ProbeResultV0> {
  try {
    const { data, error } = await supabase
      .from(table)
      .select(selectedColumns)
      .limit(2);

    if (error) {
      return {
        key,
        table,
        selectedColumns,
        attempted: true,
        ok: false,
        rowCount: null,
        errorCode: error.code ?? "unknown",
        errorMessage: sanitizeErrorMessage(error.message),
      };
    }

    return {
      key,
      table,
      selectedColumns,
      attempted: true,
      ok: true,
      rowCount: Array.isArray(data) ? data.length : null,
      errorCode: null,
      errorMessage: null,
    };
  } catch (error) {
    return {
      key,
      table,
      selectedColumns,
      attempted: true,
      ok: false,
      rowCount: null,
      errorCode: "unexpected_probe_error",
      errorMessage:
        error instanceof Error
          ? sanitizeErrorMessage(error.message)
          : "Unexpected probe error.",
    };
  }
}

async function queryAppUserByAuthSubject(
  supabase: SupabaseAdminClientV0,
  trustedAuthSubject: string | null
): Promise<AppUserMappingResultV0> {
  if (!trustedAuthSubject) {
    return {
      attempted: false,
      outcome: "not_attempted_no_session",
      appUserRowCount: null,
      appUserIdSha256Prefix: null,
      errorCode: null,
      errorMessage: null,
    };
  }

  try {
    const { data, error } = await supabase
      .from("app_users")
      .select("id, auth0_sub")
      .eq("auth0_sub", trustedAuthSubject)
      .limit(2);

    if (error) {
      return {
        attempted: true,
        outcome: "query_error",
        appUserRowCount: null,
        appUserIdSha256Prefix: null,
        errorCode: error.code ?? "unknown",
        errorMessage: sanitizeErrorMessage(error.message),
      };
    }

    const rows = Array.isArray(data) ? (data as AppUserRowV0[]) : [];

    if (rows.length === 0) {
      return {
        attempted: true,
        outcome: "not_found",
        appUserRowCount: 0,
        appUserIdSha256Prefix: null,
        errorCode: null,
        errorMessage: null,
      };
    }

    if (rows.length > 1) {
      return {
        attempted: true,
        outcome: "duplicate",
        appUserRowCount: rows.length,
        appUserIdSha256Prefix: null,
        errorCode: null,
        errorMessage: null,
      };
    }

    const appUserId = rows[0]?.id ?? null;

    return {
      attempted: true,
      outcome: appUserId ? "mapped" : "shape_error",
      appUserRowCount: rows.length,
      appUserIdSha256Prefix: hashDiagnosticValue(appUserId),
      errorCode: null,
      errorMessage: appUserId ? null : "Mapped row has no id.",
    };
  } catch (error) {
    return {
      attempted: true,
      outcome: "query_error",
      appUserRowCount: null,
      appUserIdSha256Prefix: null,
      errorCode: "unexpected_mapping_error",
      errorMessage:
        error instanceof Error
          ? sanitizeErrorMessage(error.message)
          : "Unexpected mapping error.",
    };
  }
}

async function probeActorCandidateTables(
  supabase: SupabaseAdminClientV0
): Promise<ActorCandidateResultV0> {
  const candidateTables: ProbeResultV0[] = [];

  candidateTables.push(
    await probeTableShape(
      supabase,
      "actors",
      "actors",
      "id"
    )
  );

  candidateTables.push(
    await probeTableShape(
      supabase,
      "actorSpaceRoles",
      "actor_space_roles",
      "id"
    )
  );

  candidateTables.push(
    await probeTableShape(
      supabase,
      "activityParticipants",
      "activity_participants",
      "id"
    )
  );

  candidateTables.push(
    await probeTableShape(
      supabase,
      "organizations",
      "organizations",
      "id"
    )
  );

  const readableCandidateTables = candidateTables.filter(
    (result) => result.ok
  ).length;

  return {
    candidateTablesChecked: candidateTables.length,
    readableCandidateTables,
    candidateTables,
    actorResolutionProven: false,
    actorResolutionReason:
      "This step only proves candidate table readability and app user mapping readiness. It does not bind actor_id to semantic persistence yet.",
  };
}

export async function GET() {
  const platformAdminGuard = await requirePlatformAdmin();

  if (!platformAdminGuard.ok) {
    return platformAdminErrorResponse(
      platformAdminGuard,
      "debug-api-platform-admin-guard-v1",
    );
  }

  let session: unknown = null;
  let sessionReadOk = true;
  let sessionReadErrorName: string | null = null;
  let sessionReadErrorMessage: string | null = null;

  try {
    session = await auth0.getSession();
  } catch (error) {
    sessionReadOk = false;
    sessionReadErrorName =
      error instanceof Error ? error.name : "UnknownAuth0SessionError";
    sessionReadErrorMessage =
      error instanceof Error
        ? sanitizeErrorMessage(error.message)
        : "Unknown Auth0 session diagnostic error.";
  }

  const trustedAuthSubject = readAuthSubjectFromSession(session);
  const trustedAuthSubjectPresent = Boolean(trustedAuthSubject);
  const trustedAuthSubjectSha256Prefix =
    hashDiagnosticValue(trustedAuthSubject);

  const supabaseUrlConfigured = getSupabaseUrlConfigured();
  const serviceRoleKeyConfigured = getServiceRoleKeyConfigured();

  let supabaseAdminClientCreated = false;
  let appUsersShapeProbe: ProbeResultV0 = {
    key: "appUsers",
    table: "app_users",
    selectedColumns: "id, auth0_sub",
    attempted: false,
    ok: false,
    rowCount: null,
    errorCode: null,
    errorMessage: null,
  };

  let appUserMapping: AppUserMappingResultV0 = {
    attempted: false,
    outcome: "client_creation_error",
    appUserRowCount: null,
    appUserIdSha256Prefix: null,
    errorCode: null,
    errorMessage: null,
  };

  let actorCandidateReadiness: ActorCandidateResultV0 = {
    candidateTablesChecked: 0,
    readableCandidateTables: 0,
    candidateTables: [],
    actorResolutionProven: false,
    actorResolutionReason:
      "Supabase admin client was not created, so actor candidate tables were not probed.",
  };

  let supabaseReadExecuted = false;

  if (supabaseUrlConfigured && serviceRoleKeyConfigured) {
    try {
      const supabase = getSupabaseAdminClient();
      supabaseAdminClientCreated = true;

      appUsersShapeProbe = await probeTableShape(
        supabase,
        "appUsers",
        "app_users",
        "id, auth0_sub"
      );
      supabaseReadExecuted = true;

      appUserMapping = await queryAppUserByAuthSubject(
        supabase,
        trustedAuthSubject
      );
      supabaseReadExecuted = true;

      actorCandidateReadiness = await probeActorCandidateTables(supabase);
      supabaseReadExecuted = true;
    } catch (error) {
      appUserMapping = {
        attempted: false,
        outcome: "client_creation_error",
        appUserRowCount: null,
        appUserIdSha256Prefix: null,
        errorCode: "client_creation_error",
        errorMessage:
          error instanceof Error
            ? sanitizeErrorMessage(error.message)
            : "Supabase admin client creation error.",
      };
    }
  }

  const appUsersShapeReady = appUsersShapeProbe.ok;
  const appUserMappingReady =
    appUserMapping.outcome === "mapped" ||
    appUserMapping.outcome === "not_attempted_no_session" ||
    appUserMapping.outcome === "not_found";

  const actorCandidateTablesReadable =
    actorCandidateReadiness.readableCandidateTables > 0;

  return NextResponse.json({
    ok: true,
    endpoint: "/api/activity/debug/internal-user-actor-mapping-readiness",
    policy: "internal_user_actor_mapping_readiness_proof_v0",
    mode: "read_only_internal_user_actor_mapping_readiness_no_write",
    countdownBeforeRealIntegrationChanges: "2/3",
    auth0Session: {
      readAttempted: true,
      readOk: sessionReadOk,
      readErrorName: sessionReadErrorName,
      readErrorMessage: sessionReadErrorMessage,
      sessionAvailable: Boolean(session),
      trustedAuthSubjectPresent,
      trustedAuthSubjectSha256Prefix,
    },
    supabaseReadiness: {
      supabaseUrlConfigured,
      serviceRoleKeyConfigured,
      supabaseAdminClientCreated,
      appUsersShapeReady,
      appUsersShapeProbe,
      appUserMapping,
      actorCandidateTablesReadable,
      actorCandidateReadiness,
    },
    readinessDecision: {
      provesAuth0SessionReadPath: sessionReadOk,
      provesAppUsersTableShape: appUsersShapeReady,
      provesInternalUserMappingWhenSessionAvailable:
        appUserMapping.outcome === "mapped",
      provesActorResolution: false,
      provesRlsVerification: false,
      appUserMappingReadyForNextGate: appUsersShapeReady && appUserMappingReady,
      canOpenWriteGate: false,
      canTrustClientIdentity: false,
    },
    forbiddenInThisStep: [
      "No SQL call.",
      "No Supabase write.",
      "No activity persistence.",
      "No user/actor mapping write.",
      "No existing auth route modification.",
      "No existing persistence route modification.",
      "No write gate opening.",
    ],
    nextVerificationStep: {
      step: "C8-I-IMPLEMENT-27",
      countdownBeforeRealIntegrationChanges: "1/3",
      goal: "RLS / ownership verification proof.",
    },
    writes: buildWrites(supabaseReadExecuted),
  });
}
