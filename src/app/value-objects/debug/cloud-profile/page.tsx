"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

type JsonRecord = Record<string, unknown>;

type NormalizedHierarchyProfile = {
  id: string;
  title: string;
  hierarchyRole: string;
  parentValueObjectId: string | null;
  parentTitle: string | null;
  parentExists: boolean;
  usageCount: number;
  totalExposureMinutes: number;
  lastUsedAt: string | null;
  raw: JsonRecord;
};

type CheckStatus = "pass" | "fail" | "warn" | "pending";

type VerificationCheck = {
  label: string;
  status: CheckStatus;
  details: string;
};

const EXPECTED_PARENT_ID = "112bab0b-2a53-4f7a-bd62-b9fe760d0b54";
const EXPECTED_CHILD_ID = "9177fea8-de25-446b-b418-b55a766d53db";
const EXPECTED_ROOT_ID = "b7acc958-7966-42c2-82c5-35c4de26d7ea";

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRecord(source: JsonRecord | null | undefined, keys: string[]): JsonRecord | null {
  if (!source) return null;

  for (const key of keys) {
    const value = source[key];
    if (isRecord(value)) return value;
  }

  return null;
}

function getArray(source: JsonRecord | null | undefined, keys: string[]): JsonRecord[] {
  if (!source) return [];

  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value)) {
      return value.filter(isRecord);
    }
  }

  return [];
}

function getNullableString(source: JsonRecord | null | undefined, keys: string[]): string | null {
  if (!source) return null;

  for (const key of keys) {
    const value = source[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return null;
}

function getString(source: JsonRecord | null | undefined, keys: string[], fallback = "—"): string {
  return getNullableString(source, keys) ?? fallback;
}

function getNumber(source: JsonRecord | null | undefined, keys: string[], fallback = 0): number {
  if (!source) return fallback;

  for (const key of keys) {
    const value = source[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return fallback;
}

function getBoolean(source: JsonRecord | null | undefined, keys: string[], fallback = false): boolean {
  if (!source) return fallback;

  for (const key of keys) {
    const value = source[key];

    if (typeof value === "boolean") return value;

    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "true") return true;
      if (normalized === "false") return false;
    }
  }

  return fallback;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatMinutes(value: number): string {
  return `${formatNumber(value)} min`;
}

function formatDate(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

function normalizeHierarchyProfile(row: JsonRecord): NormalizedHierarchyProfile {
  const parent = getRecord(row, [
    "parent",
    "parentValueObject",
    "parent_value_object",
    "parent_value_object_profile",
  ]);

  const id = getString(row, [
    "valueObjectId",
    "value_object_id",
    "id",
    "valueObjectID",
  ]);

  const parentValueObjectId =
    getNullableString(row, [
      "parentValueObjectId",
      "parent_value_object_id",
      "parentId",
      "parent_id",
    ]) ??
    getNullableString(parent, [
      "id",
      "valueObjectId",
      "value_object_id",
    ]);

  const parentTitle =
    getNullableString(row, [
      "parentTitle",
      "parent_title",
      "parentValueObjectTitle",
      "parent_value_object_title",
    ]) ??
    getNullableString(parent, [
      "title",
      "name",
      "valueObjectTitle",
      "value_object_title",
    ]);

  const rawRole = getNullableString(row, [
    "hierarchyRole",
    "hierarchy_role",
    "role",
  ]);

  const hierarchyRole = rawRole ?? (parentValueObjectId ? "child" : "root");

  const parentExists = getBoolean(
    row,
    ["parentExists", "parent_exists"],
    Boolean(parentValueObjectId),
  );

  return {
    id,
    title: getString(row, [
      "title",
      "valueObjectTitle",
      "value_object_title",
      "name",
    ]),
    hierarchyRole,
    parentValueObjectId,
    parentTitle,
    parentExists,
    usageCount: getNumber(row, [
      "usageCount",
      "usage_count",
      "eventCount",
      "event_count",
    ]),
    totalExposureMinutes: getNumber(row, [
      "totalExposureMinutes",
      "total_exposure_minutes",
      "exposureMinutes",
      "exposure_minutes",
    ]),
    lastUsedAt: getNullableString(row, [
      "lastUsedAt",
      "last_used_at",
      "updatedAt",
      "updated_at",
      "createdAt",
      "created_at",
    ]),
    raw: row,
  };
}

function buildVerificationChecks(
  payload: JsonRecord | null,
  hierarchyProfiles: NormalizedHierarchyProfile[],
): VerificationCheck[] {
  if (!payload) {
    return [
      {
        label: "API payload loaded",
        status: "pending",
        details: "Waiting for /api/value-objects/debug/cloud-profile response.",
      },
    ];
  }

  const expectedChild =
    hierarchyProfiles.find((profile) => profile.id === EXPECTED_CHILD_ID) ??
    hierarchyProfiles.find((profile) =>
      profile.title.toLowerCase().includes("business german"),
    );

  const expectedRoot =
    hierarchyProfiles.find((profile) => profile.id === EXPECTED_ROOT_ID) ??
    hierarchyProfiles.find((profile) =>
      profile.title.toLowerCase().includes("knee training"),
    );

  const apiOk = getBoolean(payload, ["ok"], false);

  const childHasExpectedParent =
    expectedChild?.parentValueObjectId === EXPECTED_PARENT_ID ||
    expectedChild?.parentTitle?.toLowerCase() === "learning";

  return [
    {
      label: "API response is OK",
      status: apiOk ? "pass" : "warn",
      details: apiOk
        ? "API returned ok=true."
        : "API payload loaded, but ok=true was not found. Check raw JSON.",
    },
    {
      label: "hierarchyProfiles exists",
      status: hierarchyProfiles.length > 0 ? "pass" : "fail",
      details:
        hierarchyProfiles.length > 0
          ? `Loaded ${hierarchyProfiles.length} hierarchy profile(s).`
          : "No hierarchyProfiles were found in API payload.",
    },
    {
      label: "Business German writing practice is visible",
      status: expectedChild ? "pass" : "fail",
      details: expectedChild
        ? `${expectedChild.title} was found.`
        : "Expected child profile was not found.",
    },
    {
      label: "Business German points to Learning",
      status: expectedChild
        ? childHasExpectedParent
          ? "pass"
          : "fail"
        : "pending",
      details: expectedChild
        ? `parentValueObjectId=${expectedChild.parentValueObjectId ?? "null"}, parentTitle=${
            expectedChild.parentTitle ?? "null"
          }`
        : "Waiting for child profile.",
    },
    {
      label: "Business German parentExists=true",
      status: expectedChild
        ? expectedChild.parentExists
          ? "pass"
          : "fail"
        : "pending",
      details: expectedChild
        ? `parentExists=${String(expectedChild.parentExists)}`
        : "Waiting for child profile.",
    },
    {
      label: "Business German hierarchyRole=child",
      status: expectedChild
        ? expectedChild.hierarchyRole === "child" || Boolean(expectedChild.parentValueObjectId)
          ? "pass"
          : "fail"
        : "pending",
      details: expectedChild
        ? `hierarchyRole=${expectedChild.hierarchyRole}`
        : "Waiting for child profile.",
    },
    {
      label: "Knee training practice remains root",
      status: expectedRoot
        ? expectedRoot.parentValueObjectId === null
          ? "pass"
          : "fail"
        : "warn",
      details: expectedRoot
        ? `parentValueObjectId=${expectedRoot.parentValueObjectId ?? "null"}, hierarchyRole=${
            expectedRoot.hierarchyRole
          }`
        : "Knee training practice was not found in hierarchyProfiles. Check raw JSON.",
    },
  ];
}

function StatusPill({ status }: { status: CheckStatus }) {
  const labelByStatus: Record<CheckStatus, string> = {
    pass: "OK",
    fail: "FAIL",
    warn: "CHECK",
    pending: "PENDING",
  };

  const classNameByStatus: Record<CheckStatus, string> = {
    pass: "border-emerald-500/60 bg-emerald-500/10 text-emerald-200",
    fail: "border-red-500/60 bg-red-500/10 text-red-200",
    warn: "border-amber-500/60 bg-amber-500/10 text-amber-200",
    pending: "border-slate-500/60 bg-slate-500/10 text-slate-200",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${classNameByStatus[status]}`}
    >
      {labelByStatus[status]}
    </span>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 shadow-lg">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-50">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-slate-400">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-50">{value}</div>
      {hint ? <div className="mt-2 text-xs text-slate-400">{hint}</div> : null}
    </div>
  );
}

function ProfileCard({ profile }: { profile: NormalizedHierarchyProfile }) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-50">{profile.title}</h3>
          <p className="mt-1 break-all text-xs text-slate-500">{profile.id}</p>
        </div>
        <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
          {profile.hierarchyRole}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Parent ID</dt>
          <dd className="mt-1 break-all text-slate-200">
            {profile.parentValueObjectId ?? "null"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Parent title</dt>
          <dd className="mt-1 text-slate-200">{profile.parentTitle ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">parentExists</dt>
          <dd className="mt-1 text-slate-200">{String(profile.parentExists)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Usage</dt>
          <dd className="mt-1 text-slate-200">
            {formatNumber(profile.usageCount)} use(s),{" "}
            {formatMinutes(profile.totalExposureMinutes)}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-slate-500">Last used</dt>
          <dd className="mt-1 text-slate-200">{formatDate(profile.lastUsedAt)}</dd>
        </div>
      </dl>
    </article>
  );
}

export default function ValueObjectDebugCloudProfilePage() {
  const [payload, setPayload] = useState<JsonRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadDebugProfile() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/value-objects/debug/cloud-profile", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        });

        const contentType = response.headers.get("content-type") ?? "";
        const text = await response.text();

        if (!contentType.includes("application/json")) {
          throw new Error(
            `Expected JSON but received "${contentType || "unknown content-type"}". HTTP ${
              response.status
            }. Body preview: ${text.slice(0, 300)}`,
          );
        }

        const json = JSON.parse(text) as unknown;

        if (!isRecord(json)) {
          throw new Error("API returned JSON, but root payload is not an object.");
        }

        if (!response.ok) {
          const apiMessage =
            getNullableString(json, ["error", "message"]) ??
            `HTTP ${response.status}`;
          throw new Error(apiMessage);
        }

        if (isMounted) {
          setPayload(json);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unknown error while loading debug profile.",
          );
          setPayload(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDebugProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const hierarchySummary = useMemo(() => {
    return getRecord(payload, ["hierarchySummary", "hierarchy_summary"]);
  }, [payload]);

  const hierarchyProfiles = useMemo(() => {
    return getArray(payload, ["hierarchyProfiles", "hierarchy_profiles"]).map(
      normalizeHierarchyProfile,
    );
  }, [payload]);

  const childProfiles = useMemo(() => {
    return hierarchyProfiles.filter(
      (profile) =>
        profile.parentValueObjectId !== null || profile.hierarchyRole === "child",
    );
  }, [hierarchyProfiles]);

  const rootProfiles = useMemo(() => {
    return hierarchyProfiles.filter(
      (profile) =>
        profile.parentValueObjectId === null && profile.hierarchyRole !== "child",
    );
  }, [hierarchyProfiles]);

  const verificationChecks = useMemo(() => {
    return buildVerificationChecks(payload, hierarchyProfiles);
  }, [payload, hierarchyProfiles]);

  const totalProfiles =
    getNumber(hierarchySummary, ["totalProfiles", "total_profiles"], hierarchyProfiles.length) ||
    hierarchyProfiles.length;

  const childCount =
    getNumber(hierarchySummary, ["childCount", "child_count"], childProfiles.length) ||
    childProfiles.length;

  const rootCount =
    getNumber(hierarchySummary, ["rootCount", "root_count"], rootProfiles.length) ||
    rootProfiles.length;

  const parentMissingCount = getNumber(
    hierarchySummary,
    ["parentMissingCount", "parent_missing_count", "missingParentCount", "missing_parent_count"],
    hierarchyProfiles.filter(
      (profile) => profile.parentValueObjectId !== null && !profile.parentExists,
    ).length,
  );

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6 shadow-lg">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
                P4.9.17-A1
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">
                Value Object Debug Cloud Profile
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                Hierarchy-aware read-side verification page for{" "}
                <code className="rounded bg-slate-900 px-1 py-0.5 text-slate-200">
                  /api/value-objects/debug/cloud-profile
                </code>
                . This page must only read API data and must not write hierarchy
                relations.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm">
              <div className="font-semibold text-slate-200">Expected relation</div>
              <div className="mt-2 text-slate-400">
                Learning → Business German writing practice
              </div>
              <div className="mt-2 break-all text-xs text-slate-500">
                parent: {EXPECTED_PARENT_ID}
              </div>
              <div className="mt-1 break-all text-xs text-slate-500">
                child: {EXPECTED_CHILD_ID}
              </div>
            </div>
          </div>
        </header>

        {isLoading ? (
          <Section title="Loading" description="Fetching debug API payload.">
            <div className="text-sm text-slate-400">Loading hierarchy profiles...</div>
          </Section>
        ) : null}

        {error ? (
          <Section title="API error" description="The page could not load debug data.">
            <pre className="whitespace-pre-wrap rounded-2xl border border-red-500/40 bg-red-950/30 p-4 text-sm text-red-100">
              {error}
            </pre>
          </Section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Hierarchy profiles"
            value={formatNumber(totalProfiles)}
            hint="Total profiles exposed by hierarchy read model."
          />
          <SummaryCard
            label="Child profiles"
            value={formatNumber(childCount)}
            hint="Profiles with a parent Value Object."
          />
          <SummaryCard
            label="Root profiles"
            value={formatNumber(rootCount)}
            hint="Profiles without parent Value Object."
          />
          <SummaryCard
            label="Missing parents"
            value={formatNumber(parentMissingCount)}
            hint="Should be 0 for verified hierarchy data."
          />
        </section>

        <Section
          title="P4.9.17 verification checks"
          description="These checks confirm that the UI sees the same hierarchy that was already verified by SQL/API."
        >
          <div className="grid gap-3">
            {verificationChecks.map((check) => (
              <div
                key={check.label}
                className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div>
                  <div className="font-semibold text-slate-100">{check.label}</div>
                  <div className="mt-1 text-sm text-slate-400">{check.details}</div>
                </div>
                <StatusPill status={check.status} />
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Child hierarchy profiles"
          description="Expected: Business German writing practice must be shown as child of Learning."
        >
          {childProfiles.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {childProfiles.map((profile) => (
                <ProfileCard key={profile.id} profile={profile} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-950/20 p-4 text-sm text-amber-100">
              No child hierarchy profiles found.
            </div>
          )}
        </Section>

        <Section
          title="Root hierarchy profiles"
          description="Expected: Knee training practice remains root until a separate controlled write block."
        >
          {rootProfiles.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {rootProfiles.map((profile) => (
                <ProfileCard key={profile.id} profile={profile} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-950/20 p-4 text-sm text-amber-100">
              No root hierarchy profiles found.
            </div>
          )}
        </Section>

        <Section
          title="Raw hierarchySummary"
          description="Useful for checking exact API field names during debugging."
        >
          <pre className="max-h-[420px] overflow-auto rounded-2xl border border-slate-800 bg-black p-4 text-xs leading-5 text-slate-300">
            {JSON.stringify(hierarchySummary ?? {}, null, 2)}
          </pre>
        </Section>

        <Section
          title="Raw JSON"
          description="Full API payload for browser-authenticated verification."
        >
          <pre className="max-h-[640px] overflow-auto rounded-2xl border border-slate-800 bg-black p-4 text-xs leading-5 text-slate-300">
            {JSON.stringify(payload ?? {}, null, 2)}
          </pre>
        </Section>
      </div>
    </main>
  );
}
