import { createHmac, timingSafeEqual } from "node:crypto";

const GOOGLE_PLACES_AUTOCOMPLETE_URL =
  "https://places.googleapis.com/v1/places:autocomplete";
const GOOGLE_PLACES_DETAILS_URL = "https://places.googleapis.com/v1/places";
const ADDRESS_SELECTION_TOKEN_TTL_MS = 30 * 60 * 1000;

export type GoogleAddressSuggestion = {
  placeId: string;
  text: string;
  mainText: string | null;
  secondaryText: string | null;
};

export type VerifiedGoogleAddressSelection = {
  provider: "GOOGLE_PLACES_NEW";
  placeId: string;
  formattedAddress: string;
  countryCode: string;
  countryName: string | null;
  city: string | null;
  district: string | null;
  postalCode: string | null;
  streetAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  issuedAt: string;
  expiresAt: string;
};

type GoogleAutocompleteResponse = {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: { text?: string };
      structuredFormat?: {
        mainText?: { text?: string };
        secondaryText?: { text?: string };
      };
    };
  }>;
  error?: {
    message?: string;
    status?: string;
  };
};

type GoogleAddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

type GooglePlaceDetailsResponse = {
  id?: string;
  formattedAddress?: string;
  addressComponents?: GoogleAddressComponent[];
  location?: {
    latitude?: number;
    longitude?: number;
  };
  error?: {
    message?: string;
    status?: string;
  };
};

type AddressSelectionTokenEnvelope = {
  version: 1;
  selection: VerifiedGoogleAddressSelection;
};

export class GooglePlacesAddressError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "GooglePlacesAddressError";
    this.code = code;
    this.status = status;
  }
}

function getGooglePlacesApiKey() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();

  if (!apiKey) {
    throw new GooglePlacesAddressError(
      "GOOGLE_PLACES_NOT_CONFIGURED",
      "Address search is not configured. Enter the country and city manually.",
      503,
    );
  }

  return apiKey;
}

function getAddressSelectionSigningSecret() {
  const secret =
    process.env.ARCTOR_ADDRESS_SELECTION_SECRET?.trim() ||
    process.env.AUTH0_SECRET?.trim();

  if (!secret) {
    throw new GooglePlacesAddressError(
      "ADDRESS_SELECTION_SIGNING_NOT_CONFIGURED",
      "Address selection signing is not configured.",
      503,
    );
  }

  return secret;
}

function normalizeLanguageCode(value: unknown) {
  if (typeof value !== "string") {
    return "en";
  }

  const normalized = value.trim().toLowerCase();

  if (/^[a-z]{2}(?:-[a-z]{2})?$/.test(normalized)) {
    return normalized;
  }

  return "en";
}

function normalizeRegionCode(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (!/^[a-z]{2}$/.test(normalized)) {
    return null;
  }

  return normalized;
}

function normalizeSessionToken(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (!/^[A-Za-z0-9_-]{8,80}$/.test(normalized)) {
    return null;
  }

  return normalized;
}

function getComponent(
  components: GoogleAddressComponent[],
  types: string[],
) {
  for (const type of types) {
    const component = components.find((candidate) =>
      candidate.types?.includes(type),
    );

    if (component) {
      return component;
    }
  }

  return null;
}

function getComponentLongText(
  components: GoogleAddressComponent[],
  types: string[],
) {
  const value = getComponent(components, types)?.longText?.trim();
  return value || null;
}

function parseStreetAddress(components: GoogleAddressComponent[]) {
  const route = getComponentLongText(components, ["route"]);
  const streetNumber = getComponentLongText(components, ["street_number"]);

  if (route && streetNumber) {
    return `${route} ${streetNumber}`;
  }

  return route ?? streetNumber;
}

function buildVerifiedSelection(
  place: GooglePlaceDetailsResponse,
  requestedPlaceId: string,
): VerifiedGoogleAddressSelection {
  const components = place.addressComponents ?? [];
  const countryComponent = getComponent(components, ["country"]);
  const countryCode = countryComponent?.shortText?.trim().toUpperCase() ?? "";

  if (!/^[A-Z]{2}$/.test(countryCode)) {
    throw new GooglePlacesAddressError(
      "ADDRESS_COUNTRY_NOT_FOUND",
      "The selected address does not contain a reliable country code.",
      422,
    );
  }

  const formattedAddress = place.formattedAddress?.trim();

  if (!formattedAddress) {
    throw new GooglePlacesAddressError(
      "ADDRESS_FORMATTED_VALUE_NOT_FOUND",
      "The selected address does not contain a formatted address.",
      422,
    );
  }

  const city = getComponentLongText(components, [
    "locality",
    "postal_town",
    "administrative_area_level_3",
    "administrative_area_level_2",
  ]);
  const districtCandidate = getComponentLongText(components, [
    "sublocality_level_1",
    "sublocality",
    "neighborhood",
    "administrative_area_level_3",
  ]);
  const district = districtCandidate && districtCandidate !== city
    ? districtCandidate
    : null;
  const postalCode = getComponentLongText(components, ["postal_code"]);
  const streetAddress = parseStreetAddress(components);
  const latitude = Number.isFinite(place.location?.latitude)
    ? Math.round(Number(place.location?.latitude) * 1_000_000) / 1_000_000
    : null;
  const longitude = Number.isFinite(place.location?.longitude)
    ? Math.round(Number(place.location?.longitude) * 1_000_000) / 1_000_000
    : null;
  const now = Date.now();

  return {
    provider: "GOOGLE_PLACES_NEW",
    placeId: place.id?.trim() || requestedPlaceId,
    formattedAddress,
    countryCode,
    countryName: countryComponent?.longText?.trim() || null,
    city,
    district,
    postalCode,
    streetAddress,
    latitude,
    longitude,
    issuedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ADDRESS_SELECTION_TOKEN_TTL_MS).toISOString(),
  };
}

async function readGoogleJson<T>(response: Response): Promise<T> {
  return (await response.json().catch(() => ({}))) as T;
}

function createGoogleUpstreamError(
  payload: { error?: { message?: string; status?: string } },
  fallbackMessage: string,
) {
  return new GooglePlacesAddressError(
    payload.error?.status || "GOOGLE_PLACES_REQUEST_FAILED",
    payload.error?.message || fallbackMessage,
    502,
  );
}

export async function searchGooglePlacesAddresses(input: {
  query: string;
  sessionToken: string;
  languageCode?: string | null;
  regionCode?: string | null;
}): Promise<GoogleAddressSuggestion[]> {
  const query = input.query.trim();

  if (query.length < 3 || query.length > 160) {
    throw new GooglePlacesAddressError(
      "INVALID_ADDRESS_QUERY",
      "Address query must contain between 3 and 160 characters.",
      400,
    );
  }

  const sessionToken = normalizeSessionToken(input.sessionToken);

  if (!sessionToken) {
    throw new GooglePlacesAddressError(
      "INVALID_ADDRESS_SESSION_TOKEN",
      "Address session token is invalid.",
      400,
    );
  }

  const apiKey = getGooglePlacesApiKey();
  const regionCode = normalizeRegionCode(input.regionCode);
  const requestBody: Record<string, unknown> = {
    input: query,
    languageCode: normalizeLanguageCode(input.languageCode),
    sessionToken,
    includeQueryPredictions: false,
  };

  if (regionCode) {
    requestBody.regionCode = regionCode;
  }

  const response = await fetch(GOOGLE_PLACES_AUTOCOMPLETE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": [
        "suggestions.placePrediction.placeId",
        "suggestions.placePrediction.text.text",
        "suggestions.placePrediction.structuredFormat.mainText.text",
        "suggestions.placePrediction.structuredFormat.secondaryText.text",
      ].join(","),
    },
    body: JSON.stringify(requestBody),
    cache: "no-store",
  });

  const payload = await readGoogleJson<GoogleAutocompleteResponse>(response);

  if (!response.ok) {
    throw createGoogleUpstreamError(
      payload,
      "Google address suggestions are temporarily unavailable.",
    );
  }

  return (payload.suggestions ?? [])
    .map((suggestion) => suggestion.placePrediction)
    .filter((prediction): prediction is NonNullable<typeof prediction> =>
      Boolean(prediction?.placeId && prediction.text?.text),
    )
    .slice(0, 5)
    .map((prediction) => ({
      placeId: prediction.placeId!.trim(),
      text: prediction.text!.text!.trim(),
      mainText: prediction.structuredFormat?.mainText?.text?.trim() || null,
      secondaryText:
        prediction.structuredFormat?.secondaryText?.text?.trim() || null,
    }));
}

export async function resolveGooglePlaceAddress(input: {
  placeId: string;
  sessionToken: string;
  languageCode?: string | null;
}): Promise<VerifiedGoogleAddressSelection> {
  const placeId = input.placeId.trim();

  if (!placeId || placeId.length > 220) {
    throw new GooglePlacesAddressError(
      "INVALID_GOOGLE_PLACE_ID",
      "Selected address identifier is invalid.",
      400,
    );
  }

  const sessionToken = normalizeSessionToken(input.sessionToken);

  if (!sessionToken) {
    throw new GooglePlacesAddressError(
      "INVALID_ADDRESS_SESSION_TOKEN",
      "Address session token is invalid.",
      400,
    );
  }

  const apiKey = getGooglePlacesApiKey();
  const url = new URL(
    `${GOOGLE_PLACES_DETAILS_URL}/${encodeURIComponent(placeId)}`,
  );
  url.searchParams.set(
    "languageCode",
    normalizeLanguageCode(input.languageCode),
  );
  url.searchParams.set("sessionToken", sessionToken);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "id,formattedAddress,addressComponents,location",
    },
    cache: "no-store",
  });

  const payload = await readGoogleJson<GooglePlaceDetailsResponse>(response);

  if (!response.ok) {
    throw createGoogleUpstreamError(
      payload,
      "The selected address could not be resolved.",
    );
  }

  return buildVerifiedSelection(payload, placeId);
}

function signEncodedPayload(encodedPayload: string) {
  return createHmac("sha256", getAddressSelectionSigningSecret())
    .update(encodedPayload)
    .digest("base64url");
}

export function createAddressSelectionToken(
  selection: VerifiedGoogleAddressSelection,
) {
  const envelope: AddressSelectionTokenEnvelope = {
    version: 1,
    selection,
  };
  const encodedPayload = Buffer.from(
    JSON.stringify(envelope),
    "utf8",
  ).toString("base64url");
  const signature = signEncodedPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyAddressSelectionToken(
  token: string,
): VerifiedGoogleAddressSelection {
  const [encodedPayload, suppliedSignature, extraPart] = token.split(".");

  if (!encodedPayload || !suppliedSignature || extraPart) {
    throw new GooglePlacesAddressError(
      "INVALID_ADDRESS_SELECTION_TOKEN",
      "Address selection token is invalid.",
      400,
    );
  }

  const expectedSignature = signEncodedPayload(encodedPayload);
  const suppliedBuffer = Buffer.from(suppliedSignature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  if (
    suppliedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(suppliedBuffer, expectedBuffer)
  ) {
    throw new GooglePlacesAddressError(
      "INVALID_ADDRESS_SELECTION_SIGNATURE",
      "Address selection signature is invalid.",
      400,
    );
  }

  let envelope: AddressSelectionTokenEnvelope;

  try {
    envelope = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as AddressSelectionTokenEnvelope;
  } catch {
    throw new GooglePlacesAddressError(
      "INVALID_ADDRESS_SELECTION_PAYLOAD",
      "Address selection payload is invalid.",
      400,
    );
  }

  if (envelope.version !== 1 || !envelope.selection) {
    throw new GooglePlacesAddressError(
      "UNSUPPORTED_ADDRESS_SELECTION_TOKEN",
      "Address selection token version is not supported.",
      400,
    );
  }

  const selection = envelope.selection;
  const expiresAt = Date.parse(selection.expiresAt);

  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    throw new GooglePlacesAddressError(
      "ADDRESS_SELECTION_EXPIRED",
      "Address selection has expired. Select the address again.",
      400,
    );
  }

  if (
    selection.provider !== "GOOGLE_PLACES_NEW" ||
    !/^[A-Z]{2}$/.test(selection.countryCode) ||
    !selection.formattedAddress ||
    !selection.placeId
  ) {
    throw new GooglePlacesAddressError(
      "INVALID_ADDRESS_SELECTION_DATA",
      "Address selection data is incomplete.",
      400,
    );
  }

  return selection;
}
