import { NextRequest, NextResponse } from "next/server";

import { auth0 } from "../../../../../../lib/auth0";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_MARKER = "admin-ai-eur-billing-grant-route-step17i-v1" as const;
const MAX_ADMIN_GRANT_EUR = 100000;

type JsonRecord = Record<string, unknown>;

type AppUserRow = {
  id: string;
  auth0_sub: string | null;
  email: string | null;
  name: string | null;
};

type PlatformAdminRow = {
  id: string;
  app_user_id: string;
  role: "owner" | "admin" | "moderator" | "viewer";
  status: string;
};

type GrantAiCreditResultRow = {
  wallet_id: string;
  ledger_id: string;
  app_user_id: string;
  balance_before_eur: number | string | null;
  balance_after_eur: number | string | null;
  amount_eur: number | string | null;
  currency: string | null;
  idempotency_key: string | null;
  ledger_created_at: string | null;
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asOptionalObject(value: unknown): JsonRecord {
  return isRecord(value) ? value : {};
}

function normalizeEmail(value: unknown): string {
  return asTrimmedString(value).toLowerCase();
}

function normalizeUuid(value: unknown): string {
  const text = asTrimmedString(value);

  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      text,
    )
  ) {
    return text;
  }

  return "";
}

function parseAmountEur(value: unknown): number | null {
  const raw =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.replace(",", "."))
        : Number.NaN;

  if (!Number.isFinite(raw)) {
    return null;
  }

  const rounded = Math.round(raw * 1_000_000) / 1_000_000;

  if (rounded <= 0 || rounded > MAX_ADMIN_GRANT_EUR) {
    return null;
  }

  return rounded;
}

function generateIdempotencyKey(input: {
  readonly adminId: string;
  readonly targetUserId: string;
  readonly amountEur: number;
}) {
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return [
    "admin_ai_credit_grant",
    input.adminId,
    input.targetUserId,
    input.amountEur.toFixed(6),
    randomPart,
  ].join(":");
}

async function getCurrentAppUser() {
  const session = await auth0.getSession();
  const auth0Sub = asTrimmedString(session?.user?.sub);

  if (!auth0Sub) {
    return {
      appUser: null,
      errorResponse: NextResponse.json(
        {
          ok: false,
          routeMarker: ROUTE_MARKER,
          errorCode: "ADMIN_AI_BILLING_GRANT_UNAUTHENTICATED",
          errorMessage: "Authentication is required.",
          sideEffects: {
            dbReadExecuted: false,
            dbWriteExecuted: false,
            rpcExecuted: false,
            rowsActuallyWritten: 0,
            openAiCallExecuted: false,
          },
        },
        { status: 401 },
      ),
    };
  }

  const { data, error } = await supabase
    .from("app_users")
    .select("id, auth0_sub, email, name")
    .eq("auth0_sub", auth0Sub)
    .limit(1);

  if (error) {
    return {
      appUser: null,
      errorResponse: NextResponse.json(
        {
          ok: false,
          routeMarker: ROUTE_MARKER,
          errorCode: "ADMIN_AI_BILLING_GRANT_APP_USER_LOOKUP_FAILED",
          errorMessage: error.message,
          sideEffects: {
            dbReadExecuted: true,
            dbWriteExecuted: false,
            rpcExecuted: false,
            rowsActuallyWritten: 0,
            openAiCallExecuted: false,
          },
        },
        { status: 500 },
      ),
    };
  }

  const rows = (data as unknown as AppUserRow[] | null) ?? [];

  if (!rows[0]) {
    return {
      appUser: null,
      errorResponse: NextResponse.json(
        {
          ok: false,
          routeMarker: ROUTE_MARKER,
          errorCode: "ADMIN_AI_BILLING_GRANT_APP_USER_NOT_FOUND",
          errorMessage: "Current Auth0 user is not linked to app_users. Run /api/sync-user first.",
          sideEffects: {
            dbReadExecuted: true,
            dbWriteExecuted: false,
            rpcExecuted: false,
            rowsActuallyWritten: 0,
            openAiCallExecuted: false,
          },
        },
        { status: 409 },
      ),
    };
  }

  return {
    appUser: rows[0],
    errorResponse: null,
  };
}

async function getCurrentPlatformAdmin(appUserId: string) {
  const { data, error } = await supabase
    .from("platform_admins")
    .select("id, app_user_id, role, status")
    .eq("app_user_id", appUserId)
    .eq("status", "active")
    .in("role", ["owner", "admin"])
    .limit(1);

  if (error) {
    return {
      platformAdmin: null,
      errorResponse: NextResponse.json(
        {
          ok: false,
          routeMarker: ROUTE_MARKER,
          errorCode: "ADMIN_AI_BILLING_GRANT_ADMIN_LOOKUP_FAILED",
          errorMessage: error.message,
          sideEffects: {
            dbReadExecuted: true,
            dbWriteExecuted: false,
            rpcExecuted: false,
            rowsActuallyWritten: 0,
            openAiCallExecuted: false,
          },
        },
        { status: 500 },
      ),
    };
  }

  const rows = (data as unknown as PlatformAdminRow[] | null) ?? [];

  if (!rows[0]) {
    return {
      platformAdmin: null,
      errorResponse: NextResponse.json(
        {
          ok: false,
          routeMarker: ROUTE_MARKER,
          errorCode: "ADMIN_AI_BILLING_GRANT_OWNER_OR_ADMIN_REQUIRED",
          errorMessage: "Only active platform admins with role owner/admin can grant AI EUR credit.",
          sideEffects: {
            dbReadExecuted: true,
            dbWriteExecuted: false,
            rpcExecuted: false,
            rowsActuallyWritten: 0,
            openAiCallExecuted: false,
          },
        },
        { status: 403 },
      ),
    };
  }

  return {
    platformAdmin: rows[0],
    errorResponse: null,
  };
}

async function getTargetAppUser(input: {
  readonly targetAppUserId: string;
  readonly targetEmail: string;
}) {
  if (input.targetAppUserId) {
    const { data, error } = await supabase
      .from("app_users")
      .select("id, auth0_sub, email, name")
      .eq("id", input.targetAppUserId)
      .limit(1);

    if (error) {
      throw new Error(error.message);
    }

    const rows = (data as unknown as AppUserRow[] | null) ?? [];

    return rows[0] ?? null;
  }

  if (input.targetEmail) {
    const { data, error } = await supabase
      .from("app_users")
      .select("id, auth0_sub, email, name")
      .eq("email", input.targetEmail)
      .limit(1);

    if (error) {
      throw new Error(error.message);
    }

    const rows = (data as unknown as AppUserRow[] | null) ?? [];

    return rows[0] ?? null;
  }

  return null;
}

export async function GET() {
  const { appUser, errorResponse } = await getCurrentAppUser();

  if (errorResponse) {
    return errorResponse;
  }

  if (!appUser) {
    return NextResponse.json(
      {
        ok: false,
        routeMarker: ROUTE_MARKER,
        errorCode: "ADMIN_AI_BILLING_GRANT_APP_USER_CONTEXT_MISSING",
      },
      { status: 500 },
    );
  }

  const { platformAdmin, errorResponse: adminErrorResponse } =
    await getCurrentPlatformAdmin(appUser.id);

  if (adminErrorResponse) {
    return adminErrorResponse;
  }

  return NextResponse.json({
    ok: true,
    routeMarker: ROUTE_MARKER,
    routeStatus: "admin_ai_billing_grant_route_ready",
    currentAdmin: platformAdmin
      ? {
          id: platformAdmin.id,
          role: platformAdmin.role,
          status: platformAdmin.status,
        }
      : null,
    allowedMethod: "POST",
    requiredBody: {
      targetAppUserId: "uuid optional when targetEmail is provided",
      targetEmail: "email optional when targetAppUserId is provided",
      amountEur: "positive numeric value",
      reason: "optional text",
      idempotencyKey: "optional text; strongly recommended for UI submits",
      metadata: "optional object",
    },
    sideEffects: {
      dbReadExecuted: true,
      dbWriteExecuted: false,
      rpcExecuted: false,
      rowsActuallyWritten: 0,
      openAiCallExecuted: false,
    },
  });
}

export async function POST(request: NextRequest) {
  const { appUser, errorResponse } = await getCurrentAppUser();

  if (errorResponse) {
    return errorResponse;
  }

  if (!appUser) {
    return NextResponse.json(
      {
        ok: false,
        routeMarker: ROUTE_MARKER,
        errorCode: "ADMIN_AI_BILLING_GRANT_APP_USER_CONTEXT_MISSING",
        errorMessage: "App user context missing.",
      },
      { status: 500 },
    );
  }

  const { platformAdmin, errorResponse: adminErrorResponse } =
    await getCurrentPlatformAdmin(appUser.id);

  if (adminErrorResponse) {
    return adminErrorResponse;
  }

  if (!platformAdmin) {
    return NextResponse.json(
      {
        ok: false,
        routeMarker: ROUTE_MARKER,
        errorCode: "ADMIN_AI_BILLING_GRANT_ADMIN_CONTEXT_MISSING",
        errorMessage: "Platform admin context missing.",
      },
      { status: 500 },
    );
  }

  let body: JsonRecord;

  try {
    const parsed = await request.json();
    body = isRecord(parsed) ? parsed : {};
  } catch {
    return NextResponse.json(
      {
        ok: false,
        routeMarker: ROUTE_MARKER,
        errorCode: "ADMIN_AI_BILLING_GRANT_INVALID_JSON",
        errorMessage: "Invalid JSON body.",
        sideEffects: {
          dbReadExecuted: true,
          dbWriteExecuted: false,
          rpcExecuted: false,
          rowsActuallyWritten: 0,
          openAiCallExecuted: false,
        },
      },
      { status: 400 },
    );
  }

  const targetAppUserId = normalizeUuid(body.targetAppUserId);
  const targetEmail = normalizeEmail(body.targetEmail);
  const amountEur = parseAmountEur(body.amountEur);
  const reason = asTrimmedString(body.reason).slice(0, 1000);
  const providedIdempotencyKey = asTrimmedString(body.idempotencyKey).slice(0, 200);
  const metadata = asOptionalObject(body.metadata);

  if (!targetAppUserId && !targetEmail) {
    return NextResponse.json(
      {
        ok: false,
        routeMarker: ROUTE_MARKER,
        errorCode: "ADMIN_AI_BILLING_GRANT_TARGET_REQUIRED",
        errorMessage: "Provide targetAppUserId or targetEmail.",
      },
      { status: 400 },
    );
  }

  if (amountEur === null) {
    return NextResponse.json(
      {
        ok: false,
        routeMarker: ROUTE_MARKER,
        errorCode: "ADMIN_AI_BILLING_GRANT_INVALID_AMOUNT_EUR",
        errorMessage: `amountEur must be greater than 0 and not greater than ${MAX_ADMIN_GRANT_EUR}.`,
      },
      { status: 400 },
    );
  }

  try {
    const targetAppUser = await getTargetAppUser({
      targetAppUserId,
      targetEmail,
    });

    if (!targetAppUser) {
      return NextResponse.json(
        {
          ok: false,
          routeMarker: ROUTE_MARKER,
          errorCode: "ADMIN_AI_BILLING_GRANT_TARGET_APP_USER_NOT_FOUND",
          errorMessage: "Target app_user was not found.",
          lookup: {
            targetAppUserId: targetAppUserId || null,
            targetEmail: targetEmail || null,
          },
          sideEffects: {
            dbReadExecuted: true,
            dbWriteExecuted: false,
            rpcExecuted: false,
            rowsActuallyWritten: 0,
            openAiCallExecuted: false,
          },
        },
        { status: 404 },
      );
    }

    const idempotencyKey =
      providedIdempotencyKey ||
      generateIdempotencyKey({
        adminId: platformAdmin.id,
        targetUserId: targetAppUser.id,
        amountEur,
      });

    const { data, error } = await supabase.rpc("grant_ai_credit_eur", {
      p_target_app_user_id: targetAppUser.id,
      p_platform_admin_id: platformAdmin.id,
      p_amount_eur: amountEur,
      p_reason: reason || null,
      p_idempotency_key: idempotencyKey,
      p_metadata: {
        ...metadata,
        routeMarker: ROUTE_MARKER,
        requestedByAppUserId: appUser.id,
        targetEmail: targetAppUser.email,
      },
    });

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          routeMarker: ROUTE_MARKER,
          errorCode: "ADMIN_AI_BILLING_GRANT_RPC_FAILED",
          errorMessage: error.message,
          sideEffects: {
            dbReadExecuted: true,
            dbWriteExecuted: false,
            rpcExecuted: true,
            rowsActuallyWritten: 0,
            openAiCallExecuted: false,
          },
        },
        { status: 500 },
      );
    }

    const rows = (data as unknown as GrantAiCreditResultRow[] | null) ?? [];
    const grant = rows[0] ?? null;

    return NextResponse.json({
      ok: true,
      routeMarker: ROUTE_MARKER,
      routeStatus: "admin_ai_credit_grant_completed",
      targetUser: {
        id: targetAppUser.id,
        email: targetAppUser.email,
        name: targetAppUser.name,
      },
      admin: {
        id: platformAdmin.id,
        role: platformAdmin.role,
      },
      grant,
      sideEffects: {
        dbReadExecuted: true,
        dbWriteExecuted: true,
        rpcExecuted: true,
        rowsActuallyWritten: grant ? 2 : 0,
        openAiCallExecuted: false,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        routeMarker: ROUTE_MARKER,
        errorCode: "ADMIN_AI_BILLING_GRANT_ROUTE_FAILED",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        sideEffects: {
          dbReadExecuted: true,
          dbWriteExecuted: false,
          rpcExecuted: false,
          rowsActuallyWritten: 0,
          openAiCallExecuted: false,
        },
      },
      { status: 500 },
    );
  }
}
