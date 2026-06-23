import { NextResponse } from "next/server";

import { auth0 } from "../../../lib/auth0";
import { supabase } from "../../../lib/supabase";

export type PlatformAdminRole = "owner" | "admin" | "moderator" | "viewer";

export type PlatformAdminAppUser = {
  readonly id: string;
  readonly auth0_sub: string | null;
  readonly email: string | null;
  readonly name: string | null;
};

export type PlatformAdminRow = {
  readonly id: string;
  readonly app_user_id: string;
  readonly role: PlatformAdminRole;
  readonly status: string;
};

export type RequirePlatformAdminSuccess = {
  readonly ok: true;
  readonly status: 200;
  readonly appUser: PlatformAdminAppUser;
  readonly platformAdmin: PlatformAdminRow;
};

export type RequirePlatformAdminFailure = {
  readonly ok: false;
  readonly status: 401 | 403 | 409 | 500;
  readonly errorCode: string;
  readonly errorMessage: string;
  readonly appUser: PlatformAdminAppUser | null;
  readonly platformAdmin: PlatformAdminRow | null;
};

export type RequirePlatformAdminResult =
  | RequirePlatformAdminSuccess
  | RequirePlatformAdminFailure;

export type RequirePlatformAdminOptions = {
  readonly allowedRoles?: readonly PlatformAdminRole[];
};

const DEFAULT_ALLOWED_ROLES: readonly PlatformAdminRole[] = ["owner", "admin"];

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeAllowedRoles(
  roles: readonly PlatformAdminRole[] | undefined,
): readonly PlatformAdminRole[] {
  if (!roles || roles.length === 0) {
    return DEFAULT_ALLOWED_ROLES;
  }

  return roles;
}

export async function requirePlatformAdmin(
  options: RequirePlatformAdminOptions = {},
): Promise<RequirePlatformAdminResult> {
  const allowedRoles = normalizeAllowedRoles(options.allowedRoles);
  const session = await auth0.getSession();
  const auth0Sub = asTrimmedString(session?.user?.sub);

  if (!auth0Sub) {
    return {
      ok: false,
      status: 401,
      errorCode: "PLATFORM_ADMIN_UNAUTHENTICATED",
      errorMessage: "Authentication is required.",
      appUser: null,
      platformAdmin: null,
    };
  }

  const { data: appUserRows, error: appUserError } = await supabase
    .from("app_users")
    .select("id, auth0_sub, email, name")
    .eq("auth0_sub", auth0Sub)
    .limit(1);

  if (appUserError) {
    return {
      ok: false,
      status: 500,
      errorCode: "PLATFORM_ADMIN_APP_USER_LOOKUP_FAILED",
      errorMessage: appUserError.message,
      appUser: null,
      platformAdmin: null,
    };
  }

  const appUsers =
    (appUserRows as unknown as PlatformAdminAppUser[] | null) ?? [];
  const appUser = appUsers[0] ?? null;

  if (!appUser) {
    return {
      ok: false,
      status: 409,
      errorCode: "PLATFORM_ADMIN_APP_USER_NOT_FOUND",
      errorMessage: "Current Auth0 user is not linked to app_users.",
      appUser: null,
      platformAdmin: null,
    };
  }

  const { data: adminRows, error: adminError } = await supabase
    .from("platform_admins")
    .select("id, app_user_id, role, status")
    .eq("app_user_id", appUser.id)
    .eq("status", "active")
    .in("role", [...allowedRoles])
    .limit(1);

  if (adminError) {
    return {
      ok: false,
      status: 500,
      errorCode: "PLATFORM_ADMIN_LOOKUP_FAILED",
      errorMessage: adminError.message,
      appUser,
      platformAdmin: null,
    };
  }

  const platformAdmins =
    (adminRows as unknown as PlatformAdminRow[] | null) ?? [];
  const platformAdmin = platformAdmins[0] ?? null;

  if (!platformAdmin) {
    return {
      ok: false,
      status: 403,
      errorCode: "PLATFORM_ADMIN_REQUIRED",
      errorMessage: "Only active platform admins can access this internal resource.",
      appUser,
      platformAdmin: null,
    };
  }

  return {
    ok: true,
    status: 200,
    appUser,
    platformAdmin,
  };
}

export function platformAdminErrorResponse(
  guard: RequirePlatformAdminFailure,
  routeMarker: string,
): NextResponse<any> {
  return NextResponse.json(
    {
      ok: false,
      routeMarker,
      errorCode: guard.errorCode,
      errorMessage: guard.errorMessage,
      adminAccess: false,
      sideEffects: {
        dbWriteExecuted: false,
        openAiCallExecuted: false,
      },
    },
    { status: guard.status },
  );
}
