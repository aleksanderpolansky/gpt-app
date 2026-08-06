import { NextResponse } from "next/server";

import {
  createAddressSelectionToken,
  GooglePlacesAddressError,
  resolveGooglePlaceAddress,
  searchGooglePlacesAddresses,
} from "@/lib/geo/google-places-address";
import { auth0 } from "../../../../../lib/auth0";

export const dynamic = "force-dynamic";

type RequestBody = {
  action?: unknown;
  input?: unknown;
  placeId?: unknown;
  sessionToken?: unknown;
  languageCode?: unknown;
  regionCode?: unknown;
};

function parseText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue || null;
}

function errorResponse(error: unknown) {
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
