"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  ServiceLogApiError,
  ServiceLogRunListItem,
  ServiceLogRunListResponse,
} from "../../../lib/activity/serviceLog/apiTypes";

type TriState = "any" | "true" | "false";

type StatePanelTone = "idle" | "loading" | "error" | "empty";

type BadgeTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "blocked"
  | "private"
  | "diagnostic"
  | "activity"
  | "preview";

type ServiceLogViewerFilters = {
  readonly stageKey: string;
  readonly stageStatus: string;
  readonly sourceSurface: string;
  readonly sourceRoute: string;
  readonly sourceComponent: string;
  readonly isPreview: TriState;
  readonly isWriteAttempted: TriState;
  readonly activityEventCreated: TriState;
  readonly diagnostic: TriState;
  readonly visibleInServiceLog: TriState;
  readonly privacyScope: string;
  readonly limit: "25" | "50" | "100";
};

type LoadState = "idle" | "loading" | "success" | "error";

const DEFAULT_FILTERS: ServiceLogViewerFilters = {
  stageKey: "",
  stageStatus: "",
  sourceSurface: "",
  sourceRoute: "",
  sourceComponent: "",
  isPreview: "any",
  isWriteAttempted: "any",
  activityEventCreated: "any",
  diagnostic: "any",
  visibleInServiceLog: "true",
  privacyScope: "",
  limit: "25",
};

const STAGE_STATUS_OPTIONS = [
  "",
  "started",
  "success",
  "failed",
  "skipped",
  "blocked",
  "warning",
] as const;

const LIMIT_OPTIONS = ["25", "50", "100"] as const;

const STATE_PANEL_CLASSES: Record<StatePanelTone, string> = {
  idle: "border-slate-800 bg-slate-900/70 text-slate-300",
  loading: "border-sky-900/70 bg-sky-950/30 text-sky-100",
  error: "border-red-900/70 bg-red-950/40 text-red-100",
  empty: "border-amber-900/70 bg-amber-950/30 text-amber-100",
};

const BADGE_TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "border-slate-700 bg-slate-900 text-slate-200",
  info: "border-sky-700/70 bg-sky-950/60 text-sky-100",
  success: "border-emerald-700/70 bg-emerald-950/60 text-emerald-100",
  warning: "border-amber-700/70 bg-amber-950/60 text-amber-100",
  danger: "border-red-700/70 bg-red-950/60 text-red-100",
  blocked: "border-fuchsia-700/70 bg-fuchsia-950/60 text-fuchsia-100",
  private: "border-violet-700/70 bg-violet-950/60 text-violet-100",
  diagnostic: "border-cyan-700/70 bg-cyan-950/60 text-cyan-100",
  activity: "border-lime-700/70 bg-lime-950/60 text-lime-100",
  preview: "border-indigo-700/70 bg-indigo-950/60 text-indigo-100",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isServiceLogApiError(value: unknown): value is ServiceLogApiError {
  return (
    isRecord(value) &&
    typeof value.error === "string" &&
    typeof value.code === "string"
  );
}

function isServiceLogRunListResponse(
  value: unknown,
): value is ServiceLogRunListResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.items) &&
    "nextCursor" in value &&
    isRecord(value.appliedFilters) &&
    Array.isArray(value.warnings)
  );
}

async function readResponseJson(response: Response): Promise<unknown> {
  const text = await response.text();

  if (text.trim().length === 0) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {
      error: "Service-log response was not valid JSON.",
      code: "INTERNAL_ERROR",
    } satisfies ServiceLogApiError;
  }
}

function readTrimmedParam(
  params: URLSearchParams,
  key: string,
  maxLength: number,
): string {
  const value = params.get(key);

  if (!value) {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function readTriStateParam(params: URLSearchParams, key: string): TriState {
  const value = params.get(key);

  if (value === "true" || value === "false") {
    return value;
  }

  return "any";
}

function readLimitParam(
  params: URLSearchParams,
): ServiceLogViewerFilters["limit"] {
  const value = params.get("limit");

  if (LIMIT_OPTIONS.includes(value as ServiceLogViewerFilters["limit"])) {
    return value as ServiceLogViewerFilters["limit"];
  }

  return DEFAULT_FILTERS.limit;
}

function readStageStatusParam(params: URLSearchParams): string {
  const value = readTrimmedParam(params, "stageStatus", 80);
  const allowedStatuses = new Set<string>(STAGE_STATUS_OPTIONS);

  if (allowedStatuses.has(value)) {
    return value;
  }

  return "";
}

function readFiltersFromSearchParams(
  params: URLSearchParams,
): ServiceLogViewerFilters {
  return {
    stageKey: readTrimmedParam(params, "stageKey", 120),
    stageStatus: readStageStatusParam(params),
    sourceSurface: readTrimmedParam(params, "sourceSurface", 120),
    sourceRoute: readTrimmedParam(params, "sourceRoute", 240),
    sourceComponent: readTrimmedParam(params, "sourceComponent", 120),
    isPreview: readTriStateParam(params, "isPreview"),
    isWriteAttempted: readTriStateParam(params, "isWriteAttempted"),
    activityEventCreated: readTriStateParam(params, "activityEventCreated"),
    diagnostic: readTriStateParam(params, "diagnostic"),
    visibleInServiceLog: readTriStateParam(params, "visibleInServiceLog"),
    privacyScope: readTrimmedParam(params, "privacyScope", 120),
    limit: readLimitParam(params),
  };
}

function readInitialFiltersFromBrowserUrl(): ServiceLogViewerFilters {
  if (typeof window === "undefined") {
    return DEFAULT_FILTERS;
  }

  return readFiltersFromSearchParams(new URLSearchParams(window.location.search));
}

function appendTextParam(
  params: URLSearchParams,
  key: string,
  value: string,
): void {
  const trimmed = value.trim();

  if (trimmed.length > 0) {
    params.set(key, trimmed);
  }
}

function appendTriStateParam(
  params: URLSearchParams,
  key: string,
  value: TriState,
): void {
  if (value !== "any") {
    params.set(key, value);
  }
}

function buildFilterParams(filters: ServiceLogViewerFilters): URLSearchParams {
  const params = new URLSearchParams();

  params.set("limit", filters.limit);
  appendTextParam(params, "stageKey", filters.stageKey);
  appendTextParam(params, "stageStatus", filters.stageStatus);
  appendTextParam(params, "sourceSurface", filters.sourceSurface);
  appendTextParam(params, "sourceRoute", filters.sourceRoute);
  appendTextParam(params, "sourceComponent", filters.sourceComponent);
  appendTriStateParam(params, "isPreview", filters.isPreview);
  appendTriStateParam(params, "isWriteAttempted", filters.isWriteAttempted);
  appendTriStateParam(
    params,
    "activityEventCreated",
    filters.activityEventCreated,
  );
  appendTriStateParam(params, "diagnostic", filters.diagnostic);
  appendTriStateParam(
    params,
    "visibleInServiceLog",
    filters.visibleInServiceLog,
  );
  appendTextParam(params, "privacyScope", filters.privacyScope);

  return params;
}

function buildServiceLogRunsUrl(
  filters: ServiceLogViewerFilters,
  cursor: string | null,
): string {
  const params = buildFilterParams(filters);

  if (cursor) {
    params.set("cursor", cursor);
  }

  return `/api/service-log/runs?${params.toString()}`;
}

function buildServiceLogBrowserPath(filters: ServiceLogViewerFilters): string {
  const query = buildFilterParams(filters).toString();

  return query.length > 0 ? `/service-log?${query}` : "/service-log";
}

function syncServiceLogBrowserUrl(filters: ServiceLogViewerFilters): void {
  if (typeof window === "undefined") {
    return;
  }

  window.history.replaceState(null, "", buildServiceLogBrowserPath(filters));
}

function summarizeFilterState(filters: ServiceLogViewerFilters): string {
  const query = buildFilterParams(filters).toString();

  return query.length > 0 ? query : "default visible rows";
}

function shortenIdentifier(value: string | null): string {
  if (!value) {
    return "—";
  }

  if (value.length <= 14) {
    return value;
  }

  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

function formatBoolean(value: boolean): string {
  return value ? "yes" : "no";
}

function getStageStatusTone(status: string): BadgeTone {
  switch (status) {
    case "success":
      return "success";
    case "failed":
      return "danger";
    case "warning":
      return "warning";
    case "blocked":
      return "blocked";
    case "started":
      return "info";
    case "skipped":
      return "neutral";
    default:
      return "neutral";
  }
}

function getWriteBadgeTone(writeBadge: string): BadgeTone {
  if (writeBadge.includes("activity-created")) {
    return "activity";
  }

  if (writeBadge.includes("write-attempted")) {
    return "warning";
  }

  if (writeBadge.includes("preview")) {
    return "preview";
  }

  if (writeBadge.includes("no-activity")) {
    return "neutral";
  }

  return "neutral";
}

function getPrivacyBadgeTone(privacyBadge: string): BadgeTone {
  if (
    privacyBadge.includes("sensitive") ||
    privacyBadge.includes("blocked") ||
    privacyBadge.includes("masked")
  ) {
    return "private";
  }

  if (privacyBadge.includes("private")) {
    return "private";
  }

  return "neutral";
}

function getDiagnosticBadgeTone(isDiagnostic: boolean): BadgeTone {
  return isDiagnostic ? "diagnostic" : "neutral";
}

function getPayloadBadgeTone(payloadKind: "warnings" | "debug" | "evidence"): BadgeTone {
  if (payloadKind === "warnings") {
    return "warning";
  }

  if (payloadKind === "debug") {
    return "diagnostic";
  }

  return "info";
}

function Badge({
  children,
  title,
  tone = "neutral",
}: {
  readonly children: React.ReactNode;
  readonly title?: string;
  readonly tone?: BadgeTone;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${BADGE_TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}

function FieldLine({
  label,
  value,
}: {
  readonly label: string;
  readonly value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="break-words text-sm text-slate-100">{value}</dd>
    </div>
  );
}

function SelectTriState({
  id,
  label,
  value,
  onChange,
  trueLabel,
  falseLabel,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: TriState;
  readonly onChange: (value: TriState) => void;
  readonly trueLabel: string;
  readonly falseLabel: string;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm text-slate-200" htmlFor={id}>
      {label}
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as TriState)}
        className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
      >
        <option value="any">any</option>
        <option value="true">{trueLabel}</option>
        <option value="false">{falseLabel}</option>
      </select>
    </label>
  );
}

function TextFilter({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder: string;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm text-slate-200" htmlFor={id}>
      {label}
      <input
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-400"
      />
    </label>
  );
}

function StatePanel({
  tone,
  title,
  message,
  children,
}: {
  readonly tone: StatePanelTone;
  readonly title: string;
  readonly message: string;
  readonly children?: React.ReactNode;
}) {
  return (
    <section className={`rounded-3xl border p-8 text-center ${STATE_PANEL_CLASSES[tone]}`}>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="mx-auto mt-2 max-w-3xl text-sm leading-6">{message}</p>
      {children ? <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div> : null}
    </section>
  );
}

function LoadingSkeletonCard({ index }: { readonly index: number }) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="w-full space-y-3">
          <div className="flex flex-wrap gap-2">
            <span className="h-6 w-24 rounded-full bg-slate-800" />
            <span className="h-6 w-28 rounded-full bg-slate-800" />
            <span className="h-6 w-20 rounded-full bg-slate-800" />
          </div>
          <div className="h-5 w-3/5 rounded-lg bg-slate-800" />
          <div className="h-4 w-4/5 rounded-lg bg-slate-900" />
        </div>
        <span className="h-9 w-24 rounded-xl bg-slate-800" />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((itemIndex) => (
          <div
            key={`${index}-${itemIndex}`}
            className="rounded-xl border border-slate-800 bg-slate-950/70 p-3"
          >
            <div className="h-3 w-20 rounded bg-slate-800" />
            <div className="mt-2 h-4 w-32 rounded bg-slate-900" />
          </div>
        ))}
      </div>
    </article>
  );
}

function LoadingStatePanel() {
  return (
    <section className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
      <StatePanel
        tone="loading"
        title="Loading service-log rows"
        message="The viewer is calling the private GET list API. No writes, approvals or persistence actions are triggered from this state."
      />
      {[0, 1, 2].map((index) => (
        <LoadingSkeletonCard key={index} index={index} />
      ))}
    </section>
  );
}

function ErrorStatePanel({
  message,
  onRetry,
  onReset,
}: {
  readonly message: string | null;
  readonly onRetry: () => void;
  readonly onReset: () => void;
}) {
  return (
    <StatePanel
      tone="error"
      title="Service Log could not be loaded"
      message={message ?? "The private GET list API returned an error or an unexpected response shape."}
    >
      <button
        type="button"
        onClick={onRetry}
        className="rounded-xl bg-red-200 px-4 py-2 text-sm font-semibold text-red-950 hover:bg-red-100"
      >
        Retry current query
      </button>
      <button
        type="button"
        onClick={onReset}
        className="rounded-xl border border-red-300/50 px-4 py-2 text-sm font-semibold text-red-100 hover:border-red-100"
      >
        Reset filters
      </button>
    </StatePanel>
  );
}

function EmptyStatePanel({ activeFilterSummary }: { readonly activeFilterSummary: string }) {
  return (
    <StatePanel
      tone="empty"
      title="No service-log rows match these filters"
      message={`The API returned an empty list for: ${activeFilterSummary}. Try changing stage/status, diagnostic, visibility or privacy filters.`}
    />
  );
}

function IdleStatePanel({ activeFilterSummary }: { readonly activeFilterSummary: string }) {
  return (
    <StatePanel
      tone="idle"
      title="Service Log is ready"
      message={`Press Refresh or Apply filters to load private service-log rows. Current query state: ${activeFilterSummary}.`}
    />
  );
}
function ServiceLogRowCard({ item }: { readonly item: ServiceLogRunListItem }) {
  const diagnosticReason =
    item.diagnosticBadge.reasons.length > 0
      ? item.diagnosticBadge.reasons.join(", ")
      : "no diagnostic signal";

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={getStageStatusTone(item.stageStatus)}>
              status: {item.stageStatus}
            </Badge>
            <Badge tone="info">stage: {item.stageKey}</Badge>
            <Badge tone={getWriteBadgeTone(item.writeBadge)}>
              {item.writeBadge}
            </Badge>
            <Badge tone={getDiagnosticBadgeTone(item.diagnosticBadge.isDiagnostic)} title={diagnosticReason}>
              {item.diagnosticBadge.isDiagnostic ? "diagnostic" : "normal"}
            </Badge>
            {item.hasWarnings ? (
              <Badge tone={getPayloadBadgeTone("warnings")}>warnings</Badge>
            ) : null}
            {item.hasDebugPayload ? (
              <Badge tone={getPayloadBadgeTone("debug")}>debug payload</Badge>
            ) : null}
            {item.hasEvidence ? (
              <Badge tone={getPayloadBadgeTone("evidence")}>evidence</Badge>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {item.privacyBadges.length > 0 ? (
              item.privacyBadges.map((privacyBadge) => (
                <Badge key={privacyBadge} tone={getPrivacyBadgeTone(privacyBadge)}>
                  {privacyBadge}
                </Badge>
              ))
            ) : (
              <Badge tone="neutral">privacy: none</Badge>
            )}
          </div>

          <h2 className="text-base font-semibold text-white">
            {item.displaySummary}
          </h2>

          <p className="max-w-4xl text-sm text-slate-400">
            {item.rawMessagePreviewMasked ??
              "Raw text is not shown in list view."}
          </p>
        </div>

        <Link
          href={`/service-log/${encodeURIComponent(item.id)}`}
          className="rounded-xl border border-sky-700/70 bg-sky-950/60 px-3 py-2 text-center text-xs font-semibold text-sky-100 transition hover:border-sky-400 hover:bg-sky-900"
        >
          Open detail
        </Link>
      </div>

      <dl className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <FieldLine label="created" value={item.createdAt || "—"} />
        <FieldLine
          label="source"
          value={`${item.sourceSurface} / ${item.sourceRoute ?? "—"}`}
        />
        <FieldLine label="component" value={item.sourceComponent ?? "—"} />
        <FieldLine
          label="processor"
          value={`${item.processorName} ${item.processorVersion}`}
        />

        <FieldLine label="request" value={shortenIdentifier(item.requestId)} />
        <FieldLine
          label="correlation"
          value={shortenIdentifier(item.correlationId)}
        />
        <FieldLine
          label="client event"
          value={shortenIdentifier(item.clientEventId)}
        />
        <FieldLine
          label="activity event"
          value={shortenIdentifier(item.activityEventId)}
        />

        <FieldLine label="preview" value={formatBoolean(item.isPreview)} />
        <FieldLine
          label="write attempted"
          value={formatBoolean(item.isWriteAttempted)}
        />
        <FieldLine
          label="activity created"
          value={formatBoolean(item.activityEventCreated)}
        />
        <FieldLine
          label="visible"
          value={formatBoolean(item.visibleInServiceLog)}
        />

        <FieldLine
          label="candidate counts"
          value={`cat ${item.candidateCounts.categories} · met ${item.candidateCounts.metrics} · vo ${item.candidateCounts.valueObjects}`}
        />
        <FieldLine
          label="extra candidates"
          value={`exp ${item.candidateCounts.exposures} · state ${item.candidateCounts.stateDeltas} · review ${item.candidateCounts.reviewActions}`}
        />
        <FieldLine label="privacy scope" value={item.privacyScope} />
        <FieldLine
          label="badge model"
          value="stage/status · write · privacy · diagnostic · payload"
        />
      </dl>
    </article>
  );
}

export default function ServiceLogPage() {
  const [draftFilters, setDraftFilters] = useState<ServiceLogViewerFilters>(() =>
    readInitialFiltersFromBrowserUrl(),
  );
  const [activeFilters, setActiveFilters] =
    useState<ServiceLogViewerFilters>(() => readInitialFiltersFromBrowserUrl());
  const [items, setItems] = useState<ServiceLogRunListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<readonly string[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null);

  const loadedCountLabel = useMemo(() => {
    if (items.length === 0) {
      return "No rows loaded";
    }

    return `${items.length} row${items.length === 1 ? "" : "s"} loaded`;
  }, [items.length]);

  const activeFilterSummary = useMemo(
    () => summarizeFilterState(activeFilters),
    [activeFilters],
  );

  async function loadRowsWithFilters(
    filters: ServiceLogViewerFilters,
    mode: "replace" | "append",
    cursor: string | null,
    syncBrowserUrl: boolean,
  ): Promise<void> {
    setLoadState("loading");
    setErrorMessage(null);
    setActiveFilters(filters);

    if (syncBrowserUrl) {
      syncServiceLogBrowserUrl(filters);
    }

    const url = buildServiceLogRunsUrl(filters, cursor);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      const json = await readResponseJson(response);

      if (!response.ok) {
        const apiError = isServiceLogApiError(json)
          ? json
          : {
              error: "Service-log list failed to load.",
              code: "INTERNAL_ERROR",
            };

        setLoadState("error");
        setErrorMessage(`${apiError.code}: ${apiError.error}`);
        return;
      }

      if (!isServiceLogRunListResponse(json)) {
        setLoadState("error");
        setErrorMessage("Service-log list response has unexpected shape.");
        return;
      }

      setItems((previousItems) =>
        mode === "append" ? [...previousItems, ...json.items] : [...json.items],
      );
      setNextCursor(json.nextCursor);
      setWarnings(json.warnings);
      setLastLoadedAt(new Date().toLocaleString());
      setLoadState("success");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown service-log viewer error.";

      setLoadState("error");
      setErrorMessage(message);
    }
  }

  function updateDraftFilter<K extends keyof ServiceLogViewerFilters>(
    key: K,
    value: ServiceLogViewerFilters[K],
  ): void {
    setDraftFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function applyFilters(): void {
    setNextCursor(null);
    void loadRowsWithFilters(draftFilters, "replace", null, true);
  }

  function resetFilters(): void {
    setDraftFilters(DEFAULT_FILTERS);
    setNextCursor(null);
    setWarnings([]);
    setErrorMessage(null);
    void loadRowsWithFilters(DEFAULT_FILTERS, "replace", null, true);
  }

  function refreshRows(): void {
    setNextCursor(null);
    void loadRowsWithFilters(activeFilters, "replace", null, true);
  }

  function loadMoreRows(): void {
    if (!nextCursor) {
      return;
    }

    void loadRowsWithFilters(activeFilters, "append", nextCursor, false);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-300">
                Private audit
              </p>
              <h1 className="mt-2 text-3xl font-bold text-white">
                Service Log
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">
                Read-only viewer for activity processing service-log rows. This
                page reads only from the Service Log GET API and does not create,
                modify, approve or remove activity events.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge tone="success">API list/detail ready</Badge>
              <Badge tone="info">viewer list R-16</Badge>
              <Badge tone="info">detail page R-17</Badge>
              <Badge tone="info">navigation R-18</Badge>
              <Badge tone="diagnostic">URL filters R-19</Badge>
              <Badge tone="preview">badges R-20</Badge>
              <Badge tone="private">read-only</Badge>
            </div>
          </div>
        </header>

        <section className="rounded-3xl border border-amber-900/60 bg-amber-950/30 p-5 text-sm text-amber-100">
          Raw text, debug payload and evidence are masked by default in list
          view. Stage/status badges now separate success, failed, warning,
          blocked, started and skipped states visually.
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Filters</h2>
              <p className="text-sm text-slate-400">
                Active query:{" "}
                <span className="break-all text-sky-200">
                  {activeFilterSummary}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={applyFilters}
                className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
              >
                Apply filters
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-slate-500"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <TextFilter
              id="stageKey"
              label="stageKey"
              value={draftFilters.stageKey}
              onChange={(value) => updateDraftFilter("stageKey", value)}
              placeholder="service-log-step"
            />

            <label
              className="flex flex-col gap-2 text-sm text-slate-200"
              htmlFor="stageStatus"
            >
              stageStatus
              <select
                id="stageStatus"
                value={draftFilters.stageStatus}
                onChange={(event) =>
                  updateDraftFilter("stageStatus", event.target.value)
                }
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
              >
                {STAGE_STATUS_OPTIONS.map((option) => (
                  <option key={option || "any"} value={option}>
                    {option || "any"}
                  </option>
                ))}
              </select>
            </label>

            <TextFilter
              id="sourceSurface"
              label="sourceSurface"
              value={draftFilters.sourceSurface}
              onChange={(value) => updateDraftFilter("sourceSurface", value)}
              placeholder="right-ai"
            />

            <TextFilter
              id="sourceRoute"
              label="sourceRoute"
              value={draftFilters.sourceRoute}
              onChange={(value) => updateDraftFilter("sourceRoute", value)}
              placeholder="/api/activity/record"
            />

            <TextFilter
              id="sourceComponent"
              label="sourceComponent"
              value={draftFilters.sourceComponent}
              onChange={(value) => updateDraftFilter("sourceComponent", value)}
              placeholder="component"
            />

            <SelectTriState
              id="isPreview"
              label="isPreview"
              value={draftFilters.isPreview}
              onChange={(value) => updateDraftFilter("isPreview", value)}
              trueLabel="preview"
              falseLabel="not preview"
            />

            <SelectTriState
              id="isWriteAttempted"
              label="isWriteAttempted"
              value={draftFilters.isWriteAttempted}
              onChange={(value) =>
                updateDraftFilter("isWriteAttempted", value)
              }
              trueLabel="attempted"
              falseLabel="not attempted"
            />

            <SelectTriState
              id="activityEventCreated"
              label="activityEventCreated"
              value={draftFilters.activityEventCreated}
              onChange={(value) =>
                updateDraftFilter("activityEventCreated", value)
              }
              trueLabel="created"
              falseLabel="not created"
            />

            <SelectTriState
              id="diagnostic"
              label="diagnostic"
              value={draftFilters.diagnostic}
              onChange={(value) => updateDraftFilter("diagnostic", value)}
              trueLabel="diagnostic"
              falseLabel="non-diagnostic"
            />

            <SelectTriState
              id="visibleInServiceLog"
              label="visibleInServiceLog"
              value={draftFilters.visibleInServiceLog}
              onChange={(value) =>
                updateDraftFilter("visibleInServiceLog", value)
              }
              trueLabel="visible"
              falseLabel="hidden"
            />

            <TextFilter
              id="privacyScope"
              label="privacyScope"
              value={draftFilters.privacyScope}
              onChange={(value) => updateDraftFilter("privacyScope", value)}
              placeholder="private"
            />

            <label
              className="flex flex-col gap-2 text-sm text-slate-200"
              htmlFor="limit"
            >
              limit
              <select
                id="limit"
                value={draftFilters.limit}
                onChange={(event) =>
                  updateDraftFilter(
                    "limit",
                    event.target.value as ServiceLogViewerFilters["limit"],
                  )
                }
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
              >
                {LIMIT_OPTIONS.map((limit) => (
                  <option key={limit} value={limit}>
                    {limit}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-3xl border border-slate-800 bg-slate-900/70 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Results</h2>
            <p className="text-sm text-slate-400">
              {loadedCountLabel}
              {lastLoadedAt ? ` · last loaded ${lastLoadedAt}` : ""}
            </p>
            {warnings.length > 0 ? (
              <ul className="mt-2 list-inside list-disc text-sm text-amber-200">
                {warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={refreshRows}
              disabled={loadState === "loading"}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={loadMoreRows}
              disabled={loadState === "loading" || !nextCursor}
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Load more
            </button>
          </div>
        </section>

        {loadState === "idle" && items.length === 0 ? (
          <IdleStatePanel activeFilterSummary={activeFilterSummary} />
        ) : null}

        {loadState === "loading" && items.length === 0 ? (
          <LoadingStatePanel />
        ) : null}

        {loadState === "error" ? (
          <ErrorStatePanel
            message={errorMessage}
            onRetry={refreshRows}
            onReset={resetFilters}
          />
        ) : null}

        {loadState === "success" && items.length === 0 ? (
          <EmptyStatePanel activeFilterSummary={activeFilterSummary} />
        ) : null}

        <section className="flex flex-col gap-4">
          {items.map((item) => (
            <ServiceLogRowCard key={item.id} item={item} />
          ))}
        </section>
      </div>
    </main>
  );
}


