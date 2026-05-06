import { NextResponse } from "next/server";
import { auth0 } from "../../../../../lib/auth0";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type GeoAreaType = "region" | "city" | "district" | "neighborhood";

type GeoAreaStatus = "approved" | "suggested" | "needs_review" | "rejected";

type GeoAreaSource =
  | "manual_seed"
  | "user_suggestion"
  | "admin"
  | "ai_suggestion"
  | "external_geo_provider";

type GeoAreaRow = {
  id: string;
  parent_id: string | null;
  area_type: GeoAreaType | "country" | "custom_zone";
  country_code: string | null;
  name: string;
  slug: string;
  latitude: number | null;
  longitude: number | null;
  sort_order: number;
  is_active: boolean;
  status: GeoAreaStatus;
  source: GeoAreaSource;
  created_by_user_id: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const ALLOWED_SUGGESTION_AREA_TYPES: GeoAreaType[] = [
  "region",
  "city",
  "district",
  "neighborhood",
];

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  ґ: "g",
  д: "d",
  е: "e",
  ё: "e",
  є: "ye",
  ж: "zh",
  з: "z",
  и: "i",
  і: "i",
  ї: "yi",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

const SPECIAL_LATIN_CHARS: Record<string, string> = {
  ą: "a",
  ć: "c",
  ę: "e",
  ł: "l",
  ń: "n",
  ó: "o",
  ś: "s",
  ź: "z",
  ż: "z",
  ä: "a",
  ö: "o",
  ü: "u",
  ß: "ss",
  á: "a",
  à: "a",
  â: "a",
  ã: "a",
  é: "e",
  è: "e",
  ê: "e",
  í: "i",
  ì: "i",
  î: "i",
  ñ: "n",
  ú: "u",
  ù: "u",
  û: "u",
};

async function getCurrentAppUser() {
  const session = await auth0.getSession();

  if (!session?.user) {
    return {
      appUser: null,
      errorResponse: NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      ),
    };
  }

  const { data: appUser, error: appUserError } = await supabase
    .from("app_users")
    .select("*")
    .eq("auth0_sub", session.user.sub)
    .single();

  if (appUserError || !appUser) {
    return {
      appUser: null,
      errorResponse: NextResponse.json(
        { error: appUserError?.message ?? "App user not found" },
        { status: 500 }
      ),
    };
  }

  return {
    appUser,
    errorResponse: null,
  };
}

function parseOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    return null;
  }

  return trimmedValue;
}

function normalizeCountryCode(value: string | null) {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim().toUpperCase();

  if (!/^[A-Z]{2}$/.test(normalizedValue)) {
    return null;
  }

  return normalizedValue;
}

function normalizeAreaType(value: string | null): GeoAreaType | null {
  if (!value) {
    return null;
  }

  if (
    value === "region" ||
    value === "city" ||
    value === "district" ||
    value === "neighborhood"
  ) {
    return value;
  }

  return null;
}

function transliterateToLatin(value: string) {
  return value
    .toLowerCase()
    .split("")
    .map((char) => {
      if (CYRILLIC_TO_LATIN[char] !== undefined) {
        return CYRILLIC_TO_LATIN[char];
      }

      if (SPECIAL_LATIN_CHARS[char] !== undefined) {
        return SPECIAL_LATIN_CHARS[char];
      }

      return char;
    })
    .join("");
}

function createSlug(value: string) {
  const transliteratedValue = transliterateToLatin(value);

  const normalizedValue = transliteratedValue
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalizedValue || "geo-area";
}

function validateSuggestionInput(input: {
  areaType: GeoAreaType | null;
  countryCode: string | null;
  name: string | null;
  parentId: string | null;
}) {
  if (!input.areaType || !ALLOWED_SUGGESTION_AREA_TYPES.includes(input.areaType)) {
    return "areaType must be one of: region, city, district, neighborhood";
  }

  if (!input.countryCode) {
    return "countryCode must be a valid 2-letter country code, for example PL, ES, DE";
  }

  if (!input.name) {
    return "name is required";
  }

  if (input.name.length < 2) {
    return "name must contain at least 2 characters";
  }

  if (input.name.length > 120) {
    return "name must be shorter than 120 characters";
  }

  if (
    (input.areaType === "district" || input.areaType === "neighborhood") &&
    !input.parentId
  ) {
    return "parentId is required for district and neighborhood suggestions";
  }

  return null;
}

async function getParentGeoArea(parentId: string | null) {
  if (!parentId) {
    return {
      parentGeoArea: null,
      errorResponse: null,
    };
  }

  const { data: parentGeoArea, error: parentGeoAreaError } = await supabase
    .from("geo_areas")
    .select(
      "id, parent_id, area_type, country_code, name, slug, status, is_active"
    )
    .eq("id", parentId)
    .single();

  if (parentGeoAreaError || !parentGeoArea) {
    return {
      parentGeoArea: null,
      errorResponse: NextResponse.json(
        { error: parentGeoAreaError?.message ?? "Parent geo area not found" },
        { status: 404 }
      ),
    };
  }

  if (parentGeoArea.is_active === false) {
    return {
      parentGeoArea: null,
      errorResponse: NextResponse.json(
        { error: "Parent geo area is not active" },
        { status: 400 }
      ),
    };
  }

  return {
    parentGeoArea,
    errorResponse: null,
  };
}

function validateParentRelation(input: {
  areaType: GeoAreaType;
  countryCode: string;
  parentGeoArea:
    | {
        id: string;
        area_type: string;
        country_code: string | null;
      }
    | null;
}) {
  if (!input.parentGeoArea) {
    if (input.areaType === "region" || input.areaType === "city") {
      return null;
    }

    return "parentId is required for this area type";
  }

  if (
    input.parentGeoArea.country_code &&
    input.parentGeoArea.country_code !== input.countryCode
  ) {
    return "Parent geo area country_code does not match suggestion countryCode";
  }

  if (input.areaType === "region") {
    if (input.parentGeoArea.area_type !== "country") {
      return "Region parent must be a country";
    }

    return null;
  }

  if (input.areaType === "city") {
    if (
      input.parentGeoArea.area_type !== "country" &&
      input.parentGeoArea.area_type !== "region"
    ) {
      return "City parent must be a country or region";
    }

    return null;
  }

  if (input.areaType === "district") {
    if (input.parentGeoArea.area_type !== "city") {
      return "District parent must be a city";
    }

    return null;
  }

  if (input.areaType === "neighborhood") {
    if (
      input.parentGeoArea.area_type !== "city" &&
      input.parentGeoArea.area_type !== "district"
    ) {
      return "Neighborhood parent must be a city or district";
    }

    return null;
  }

  return null;
}

async function findExistingGeoArea(input: {
  areaType: GeoAreaType;
  countryCode: string;
  slug: string;
  parentId: string | null;
}) {
  let query = supabase
    .from("geo_areas")
    .select(
      `
      id,
      parent_id,
      area_type,
      country_code,
      name,
      slug,
      latitude,
      longitude,
      sort_order,
      is_active,
      status,
      source,
      created_by_user_id,
      reviewed_by_user_id,
      reviewed_at,
      notes,
      created_at,
      updated_at
    `
    )
    .eq("area_type", input.areaType)
    .eq("country_code", input.countryCode)
    .eq("slug", input.slug)
    .limit(1);

  if (input.parentId) {
    query = query.eq("parent_id", input.parentId);
  } else {
    query = query.is("parent_id", null);
  }

  const { data, error } = await query;

  if (error) {
    return {
      existingGeoArea: null,
      errorResponse: NextResponse.json({ error: error.message }, { status: 500 }),
    };
  }

  return {
    existingGeoArea: ((data ?? [])[0] as GeoAreaRow | undefined) ?? null,
    errorResponse: null,
  };
}

export async function GET() {
  const { appUser, errorResponse } = await getCurrentAppUser();

  if (errorResponse) {
    return errorResponse;
  }

  if (!appUser) {
    return NextResponse.json(
      { error: "User context not found" },
      { status: 500 }
    );
  }

  const { data: suggestions, error: suggestionsError } = await supabase
    .from("geo_areas")
    .select(
      `
      id,
      parent_id,
      area_type,
      country_code,
      name,
      slug,
      latitude,
      longitude,
      sort_order,
      is_active,
      status,
      source,
      created_by_user_id,
      reviewed_by_user_id,
      reviewed_at,
      notes,
      created_at,
      updated_at
    `
    )
    .eq("created_by_user_id", appUser.id)
    .eq("source", "user_suggestion")
    .order("created_at", { ascending: false })
    .limit(100);

  if (suggestionsError) {
    return NextResponse.json(
      { error: suggestionsError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    suggestions: suggestions ?? [],
  });
}

export async function POST(request: Request) {
  const { appUser, errorResponse } = await getCurrentAppUser();

  if (errorResponse) {
    return errorResponse;
  }

  if (!appUser) {
    return NextResponse.json(
      { error: "User context not found" },
      { status: 500 }
    );
  }

  const body = await request.json();

  const areaType = normalizeAreaType(parseOptionalText(body.areaType));
  const countryCode = normalizeCountryCode(parseOptionalText(body.countryCode));
  const name = parseOptionalText(body.name);
  const parentId = parseOptionalText(body.parentId);
  const notes = parseOptionalText(body.notes);

  const validationError = validateSuggestionInput({
    areaType,
    countryCode,
    name,
    parentId,
  });

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  if (!areaType || !countryCode || !name) {
    return NextResponse.json(
      { error: "Invalid geo suggestion input" },
      { status: 400 }
    );
  }

  const { parentGeoArea, errorResponse: parentErrorResponse } =
    await getParentGeoArea(parentId);

  if (parentErrorResponse) {
    return parentErrorResponse;
  }

  const parentRelationError = validateParentRelation({
    areaType,
    countryCode,
    parentGeoArea,
  });

  if (parentRelationError) {
    return NextResponse.json({ error: parentRelationError }, { status: 400 });
  }

  const slug = createSlug(name);

  const { existingGeoArea, errorResponse: existingGeoAreaErrorResponse } =
    await findExistingGeoArea({
      areaType,
      countryCode,
      slug,
      parentId,
    });

  if (existingGeoAreaErrorResponse) {
    return existingGeoAreaErrorResponse;
  }

  if (existingGeoArea) {
    return NextResponse.json({
      ok: true,
      alreadyExists: true,
      geoArea: existingGeoArea,
      message:
        existingGeoArea.status === "approved"
          ? "Такая географическая область уже есть в справочнике."
          : "Такая географическая область уже была предложена ранее.",
    });
  }

  const { data: insertedGeoArea, error: insertError } = await supabase
    .from("geo_areas")
    .insert({
      parent_id: parentId,
      area_type: areaType,
      country_code: countryCode,
      name,
      slug,
      status: "suggested",
      source: "user_suggestion",
      created_by_user_id: appUser.id,
      reviewed_by_user_id: null,
      reviewed_at: null,
      notes,
      is_active: true,
      sort_order: 1000,
    })
    .select(
      `
      id,
      parent_id,
      area_type,
      country_code,
      name,
      slug,
      latitude,
      longitude,
      sort_order,
      is_active,
      status,
      source,
      created_by_user_id,
      reviewed_by_user_id,
      reviewed_at,
      notes,
      created_at,
      updated_at
    `
    )
    .single();

  if (insertError || !insertedGeoArea) {
    return NextResponse.json(
      { error: insertError?.message ?? "Geo suggestion was not created" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    alreadyExists: false,
    geoArea: insertedGeoArea,
  });
}