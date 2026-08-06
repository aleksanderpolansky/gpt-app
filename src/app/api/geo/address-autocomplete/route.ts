import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import {
  createAddressSelectionToken,
  GooglePlacesAddressError,
  resolveGooglePlaceAddress,
  searchGooglePlacesAddresses,
} from "@/lib/geo/google-places-address";
import { auth0 } from "../../../../../lib/auth0";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type RequestBody = {
  action?: unknown;
  input?: unknown;
  placeId?: unknown;
  sessionToken?: unknown;
  languageCode?: unknown;
  regionCode?: unknown;
};


type AddressRateLimitOperation = "search" | "resolve";

type AddressRateLimitRow = {
  allowed?: unknown;
  retry_after_seconds?: unknown;
  limit_scope?: unknown;
  user_count?: unknown;
  user_limit?: unknown;
  global_day_count?: unknown;
  global_day_limit?: unknown;
  global_month_count?: unknown;
  global_month_limit?: unknown;
};

class AddressRateLimitError extends Error {
  code: string;
  status: number;
  retryAfterSeconds: number;
  limitScope: string | null;

  constructor(input: {
    code: string;
    message: string;
    retryAfterSeconds: number;
    limitScope?: string | null;
  }) {
    super(input.message);
    this.name = "AddressRateLimitError";
    this.code = input.code;
    this.status = 429;
    this.retryAfterSeconds = Math.max(
      1,
      Math.floor(input.retryAfterSeconds),
    );
    this.limitScope = input.limitScope ?? null;
  }
}

function parseText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue || null;
}

function errorResponse(error: unknown) {
  if (error instanceof AddressRateLimitError) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        code: error.code,
        retryAfterSeconds: error.retryAfterSeconds,
        limitScope: error.limitScope,
      },
      {
        status: error.status,
        headers: {
          "Retry-After": String(error.retryAfterSeconds),
        },
      },
    );
  }

  if (error instanceof GooglePlacesAddressError) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        code: error.code,
      },
      { status: error.status },
    );
  }

  return NextResponse.json(
    {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Address service request failed.",
      code: "ADDRESS_SERVICE_UNKNOWN_ERROR",
    },
    { status: 500 },
  );
}

function createRateLimitUserKey(userSubject: string) {
  return createHash("sha256")
    .update(`ARCTOR_GOOGLE_PLACES:${userSubject}`, "utf8")
    .digest("hex");
}

function parseRateLimitNumber(value: unknown) {
  const parsedValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

async function enforceGooglePlacesRateLimit(input: {
  userSubject: string;
  operation: AddressRateLimitOperation;
}) {
  const { data, error } = await supabase.rpc(
    "consume_google_places_rate_limit_v1",
    {
      p_user_key: createRateLimitUserKey(input.userSubject),
      p_operation: input.operation,
    },
  );

  if (error) {
    throw new GooglePlacesAddressError(
      "ADDRESS_RATE_LIMIT_UNAVAILABLE",
      "Address search protection is temporarily unavailable. Enter the country and city manually.",
      503,
    );
  }

  const firstRow = Array.isArray(data) ? data[0] : data;
  const row =
    firstRow && typeof firstRow === "object"
      ? (firstRow as AddressRateLimitRow)
      : null;

  if (!row || typeof row.allowed !== "boolean") {
    throw new GooglePlacesAddressError(
      "ADDRESS_RATE_LIMIT_INVALID_RESPONSE",
      "Address search protection returned an invalid response. Enter the country and city manually.",
      503,
    );
  }

  if (row.allowed) {
    return;
  }

  const retryAfterSeconds =
    parseRateLimitNumber(row.retry_after_seconds) ?? 60;
  const limitScope =
    typeof row.limit_scope === "string" ? row.limit_scope : null;

  throw new AddressRateLimitError({
    code: "ADDRESS_RATE_LIMITED",
    message:
      "Address search limit reached. Enter the country and city manually or try again later.",
    retryAfterSeconds,
    limitScope,
  });
}

export async function POST(request: Request) {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated", code: "NOT_AUTHENTICATED" },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as RequestBody | null;

  if (!body) {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body", code: "INVALID_JSON" },
      { status: 400 },
    );
  }

  const action = parseText(body.action);
  const sessionToken = parseText(body.sessionToken);

  if (!sessionToken) {
    return NextResponse.json(
      {
        ok: false,
        error: "sessionToken is required.",
        code: "ADDRESS_SESSION_TOKEN_REQUIRED",
      },
      { status: 400 },
    );
  }

  try {
    if (action === "search") {
      const query = parseText(body.input);

      if (!query) {
        return NextResponse.json(
          {
            ok: false,
            error: "input is required.",
            code: "ADDRESS_QUERY_REQUIRED",
          },
          { status: 400 },
        );
      }

      await enforceGooglePlacesRateLimit({
        userSubject: session.user.sub,
        operation: "search",
      });

      const suggestions = await searchGooglePlacesAddresses({
        query,
        sessionToken,
        languageCode: parseText(body.languageCode),
        regionCode: parseText(body.regionCode),
      });

      return NextResponse.json({
        ok: true,
        suggestions,
      });
    }

    if (action === "resolve") {
      const placeId = parseText(body.placeId);

      if (!placeId) {
        return NextResponse.json(
          {
            ok: false,
            error: "placeId is required.",
            code: "GOOGLE_PLACE_ID_REQUIRED",
          },
          { status: 400 },
        );
      }

      await enforceGooglePlacesRateLimit({
        userSubject: session.user.sub,
        operation: "resolve",
      });

      const selection = await resolveGooglePlaceAddress({
        placeId,
        sessionToken,
        languageCode: parseText(body.languageCode),
      });
      const addressSelectionToken = createAddressSelectionToken(selection);

      return NextResponse.json({
        ok: true,
        selection,
        addressSelectionToken,
      });
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Unsupported action.",
        code: "UNSUPPORTED_ADDRESS_ACTION",
      },
      { status: 400 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
