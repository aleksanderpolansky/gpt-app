import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type ProbeResult = {
  label: string;
  durationMs: number;
  ok: boolean;
  rows?: number;
  status?: number;
  error?: string | null;
};

const DIRECTORY_LEAN_SELECT = `
  id,
  organization_name,
  organization_type,
  description,
  short_description,
  public_slug,
  country_code,
  default_currency,
  directory_status,
  verification_status,
  is_public_profile_enabled,
  is_listed_in_directory,
  public_email,
  public_phone,
  website_url,
  booking_url,
  logo_url,
  cover_image_url,
  social_links_json,
  metadata_json,
  directory_published_at,
  created_at,
  updated_at
`;

function roundMs(value: number) {
  return Math.round(value * 10) / 10;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown error";
}

async function runSdkSimpleProbe(label: string): Promise<ProbeResult> {
  const startedAt = performance.now();

  try {
    const { data, error } = await supabase
      .from("organizations")
      .select("id")
      .limit(1);

    const durationMs = roundMs(performance.now() - startedAt);

    return {
      label,
      durationMs,
      ok: !error,
      rows: Array.isArray(data) ? data.length : 0,
      error: error?.message ?? null,
    };
  } catch (error) {
    return {
      label,
      durationMs: roundMs(performance.now() - startedAt),
      ok: false,
      error: getErrorMessage(error),
    };
  }
}

async function runRawRestSimpleProbe(): Promise<ProbeResult> {
  const startedAt = performance.now();
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      label: "rawRestSimple",
      durationMs: roundMs(performance.now() - startedAt),
      ok: false,
      error: "Supabase server environment is not configured.",
    };
  }

  try {
    const url = new URL("/rest/v1/organizations", supabaseUrl);
    url.searchParams.set("select", "id");
    url.searchParams.set("limit", "1");

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      cache: "no-store",
    });

    const body = await response.text();

    return {
      label: "rawRestSimple",
      durationMs: roundMs(performance.now() - startedAt),
      ok: response.ok,
      status: response.status,
      rows: response.ok && body.trim() ? 1 : 0,
      error: response.ok ? null : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      label: "rawRestSimple",
      durationMs: roundMs(performance.now() - startedAt),
      ok: false,
      error: getErrorMessage(error),
    };
  }
}

async function runSdkDirectoryLeanProbe(): Promise<ProbeResult> {
  const startedAt = performance.now();

  try {
    const { data, error } = await supabase
      .from("organizations")
      .select(DIRECTORY_LEAN_SELECT)
      .eq("status", "active")
      .eq("directory_status", "published")
      .eq("is_public_profile_enabled", true)
      .eq("is_listed_in_directory", true)
      .order("directory_published_at", { ascending: false })
      .limit(500);

    return {
      label: "sdkDirectoryLean",
      durationMs: roundMs(performance.now() - startedAt),
      ok: !error,
      rows: Array.isArray(data) ? data.length : 0,
      error: error?.message ?? null,
    };
  } catch (error) {
    return {
      label: "sdkDirectoryLean",
      durationMs: roundMs(performance.now() - startedAt),
      ok: false,
      error: getErrorMessage(error),
    };
  }
}

export async function GET(request: NextRequest) {
  const requestStartedAt = performance.now();

  if (request.nextUrl.searchParams.get("run") !== "1") {
    return NextResponse.json(
      {
        ok: false,
        error: "Diagnostic probe is idle. Add ?run=1 to execute it.",
      },
      {
        status: 400,
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
        },
      },
    );
  }

  const localStartedAt = performance.now();
  const localDurationMs = roundMs(performance.now() - localStartedAt);

  // First request is intentionally isolated to expose potential cold DNS/TLS/connection cost.
  const sdkFirst = await runSdkSimpleProbe("sdkSimpleFirst");

  // The repeat SDK call, raw PostgREST fetch and realistic lean directory query are
  // intentionally concurrent. This reveals whether the delay is shared network/REST
  // latency rather than PostgreSQL execution time.
  const parallelStartedAt = performance.now();
  const [sdkRepeat, rawRest, sdkDirectoryLean] = await Promise.all([
    runSdkSimpleProbe("sdkSimpleRepeat"),
    runRawRestSimpleProbe(),
    runSdkDirectoryLeanProbe(),
  ]);
  const parallelDurationMs = roundMs(performance.now() - parallelStartedAt);

  const totalDurationMs = roundMs(performance.now() - requestStartedAt);
  const vercelRegion =
    process.env.VERCEL_REGION ??
    process.env.AWS_REGION ??
    process.env.VERCEL_REGION_ID ??
    null;

  const probes = {
    local: {
      label: "local",
      durationMs: localDurationMs,
      ok: true,
    },
    sdkFirst,
    sdkRepeat,
    rawRest,
    sdkDirectoryLean,
    parallel: {
      label: "parallelPhase",
      durationMs: parallelDurationMs,
      ok: sdkRepeat.ok && rawRest.ok && sdkDirectoryLean.ok,
    },
    total: {
      label: "total",
      durationMs: totalDurationMs,
      ok: sdkFirst.ok && sdkRepeat.ok && rawRest.ok && sdkDirectoryLean.ok,
    },
  };

  const serverTiming = [
    `local;dur=${localDurationMs}`,
    `sdk_first;dur=${sdkFirst.durationMs}`,
    `sdk_repeat;dur=${sdkRepeat.durationMs}`,
    `raw_rest;dur=${rawRest.durationMs}`,
    `full_lean;dur=${sdkDirectoryLean.durationMs}`,
    `parallel;dur=${parallelDurationMs}`,
    `total;dur=${totalDurationMs}`,
  ].join(", ");

  return NextResponse.json(
    {
      ok: probes.total.ok,
      diagnostic: "ARCTOR_INFRA_LATENCY_PROBE_V1",
      runtime: {
        vercelRegion,
        vercelEnvironment: process.env.VERCEL_ENV ?? null,
        nodeVersion: process.version,
        supabaseConfigured: Boolean(
          process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
        ),
      },
      probes,
      notes: {
        databaseExplainExecutionMsObservedBeforeProbe: 0.033,
        purpose:
          "Compare Vercel handler + Supabase SDK + direct PostgREST latency. No data is mutated.",
      },
    },
    {
      status: probes.total.ok ? 200 : 503,
      headers: {
        "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
        "Server-Timing": serverTiming,
        "X-ARCTor-Infra-Probe-Total-Ms": String(totalDurationMs),
        ...(vercelRegion ? { "X-ARCTor-Vercel-Region": vercelRegion } : {}),
      },
    },
  );
}
