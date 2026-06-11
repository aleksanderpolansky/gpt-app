"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import type {
  ServiceLogApiError,
  ServiceLogRunDetailResponse,
} from "../../../../lib/activity/serviceLog/apiTypes";

type LoadState = "idle" | "loading" | "success" | "error";

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

function isServiceLogRunDetailResponse(
  value: unknown,
): value is ServiceLogRunDetailResponse {
  return (
    isRecord(value) &&
    isRecord(value.item) &&
    isRecord(value.permissions) &&
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
      error: "Service-log detail response was not valid JSON.",
      code: "INTERNAL_ERROR",
    } satisfies ServiceLogApiError;
  }
}

function getParamId(rawId: string | string[] | undefined): string {
  if (Array.isArray(rawId)) {
    return rawId[0] ?? "";
  }

  return rawId ?? "";
}

function stringifyJson(value: unknown): string {
  if (value === null || typeof value === "undefined") {
    return "null";
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function shortenIdentifier(value: string | null): string {
  if (!value) {
    return "—";
  }

  if (value.length <= 18) {
    return value;
  }

  return `${value.slice(0, 10)}…${value.slice(-6)}`;
}

function formatBoolean(value: boolean): string {
  return value ? "yes" : "no";
}

function Badge({
  children,
  title,
}: {
  readonly children: React.ReactNode;
  readonly title?: string;
}) {
  return (
    <span
      title={title}
      className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-medium text-slate-200"
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
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm text-slate-100">{value}</dd>
    </div>
  );
}

function JsonBlock({
  title,
  value,
  emptyLabel,
}: {
  readonly title: string;
  readonly value: unknown;
  readonly emptyLabel: string;
}) {
  const isEmptyArray = Array.isArray(value) && value.length === 0;
  const isEmptyObject =
    isRecord(value) && Object.keys(value).length === 0 && !Array.isArray(value);
  const isEmpty = value === null || isEmptyArray || isEmptyObject;

  return (
    <details className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <summary className="cursor-pointer text-sm font-semibold text-slate-100">
        {title}
      </summary>
      {isEmpty ? (
        <p className="mt-3 text-sm text-slate-500">{emptyLabel}</p>
      ) : (
        <pre className="mt-3 max-h-[460px] overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs leading-relaxed text-slate-200">
          {stringifyJson(value)}
        </pre>
      )}
    </details>
  );
}

function PermissionState({
  label,
  allowed,
}: {
  readonly label: string;
  readonly allowed: boolean;
}) {
  return (
    <FieldLine
      label={label}
      value={allowed ? "allowed for this response" : "masked by policy"}
    />
  );
}

export default function ServiceLogDetailPage() {
  const params = useParams();
  const id = getParamId(params?.id);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [detail, setDetail] = useState<ServiceLogRunDetailResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null);

  const detailUrl = useMemo(() => {
    if (!id) {
      return "";
    }

    return `/api/service-log/runs/${encodeURIComponent(id)}`;
  }, [id]);

  async function loadDetail(): Promise<void> {
    if (!detailUrl) {
      setLoadState("error");
      setErrorMessage("Missing service-log row id.");
      return;
    }

    setLoadState("loading");
    setErrorMessage(null);

    try {
      const response = await fetch(detailUrl, {
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
              error: "Service-log detail failed to load.",
              code: "INTERNAL_ERROR",
            };

        setLoadState("error");
        setErrorMessage(`${apiError.code}: ${apiError.error}`);
        return;
      }

      if (!isServiceLogRunDetailResponse(json)) {
        setLoadState("error");
        setErrorMessage("Service-log detail response has unexpected shape.");
        return;
      }

      setDetail(json);
      setLastLoadedAt(new Date().toLocaleString());
      setLoadState("success");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown service-log detail viewer error.";

      setLoadState("error");
      setErrorMessage(message);
    }
  }

  const item = detail?.item ?? null;
  const permissions = detail?.permissions ?? null;
  const detailWarnings = detail?.warnings ?? [];
  const diagnosticReason = item?.diagnosticBadge.reasons.join(", ") ?? "";

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Link
                href="/service-log"
                className="text-sm font-semibold text-sky-300 hover:text-sky-200"
              >
                ← Back to Service Log
              </Link>
              <p className="mt-4 text-sm font-medium uppercase tracking-[0.2em] text-sky-300">
                Private audit detail
              </p>
              <h1 className="mt-2 text-3xl font-bold text-white">
                Service Log Row
              </h1>
              <p className="mt-2 max-w-3xl break-words text-sm text-slate-300">
                Row id: {id || "missing"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge>detail R-17</Badge>
              <Badge>read-only</Badge>
              <Badge>private</Badge>
              {item ? <Badge>{item.stageStatus}</Badge> : null}
              {item ? <Badge>{item.writeBadge}</Badge> : null}
            </div>
          </div>
        </header>

        <section className="rounded-3xl border border-amber-900/60 bg-amber-950/30 p-5 text-sm text-amber-100">
          This page reads one service-log row through the GET detail API. It has
          no create, modify, approval, retry or removal controls. Raw text,
          debug payload and evidence are shown only as returned by the
          permission-gated API response.
        </section>

        <section className="flex flex-col gap-3 rounded-3xl border border-slate-800 bg-slate-900/70 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Detail loader</h2>
            <p className="text-sm text-slate-400">
              {lastLoadedAt ? `Last loaded ${lastLoadedAt}` : "Not loaded yet."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadDetail()}
            disabled={loadState === "loading"}
            className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadState === "loading" ? "Loading…" : "Load detail"}
          </button>
        </section>

        {loadState === "idle" ? (
          <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-center text-slate-300">
            Press Load detail to fetch this private service-log row.
          </section>
        ) : null}

        {loadState === "error" ? (
          <section className="rounded-3xl border border-red-900/60 bg-red-950/40 p-5 text-sm text-red-100">
            {errorMessage ?? "Service-log detail viewer failed to load."}
          </section>
        ) : null}

        {item ? (
          <>
            <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <div className="flex flex-wrap gap-2">
                <Badge>{item.stageKey}</Badge>
                <Badge>{item.stageStatus}</Badge>
                <Badge>{item.writeBadge}</Badge>
                {item.diagnosticBadge.isDiagnostic ? (
                  <Badge title={diagnosticReason || "diagnostic"}>
                    diagnostic
                  </Badge>
                ) : null}
                {item.hasWarnings ? <Badge>warnings</Badge> : null}
                {item.hasDebugPayload ? <Badge>debug payload</Badge> : null}
                {item.hasEvidence ? <Badge>evidence</Badge> : null}
              </div>

              <h2 className="mt-4 text-xl font-semibold text-white">
                {item.displaySummary}
              </h2>

              <dl className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <FieldLine label="created" value={item.createdAt || "—"} />
                <FieldLine label="updated" value={item.updatedAt || "—"} />
                <FieldLine label="id" value={item.id} />
                <FieldLine
                  label="activity event"
                  value={shortenIdentifier(item.activityEventId)}
                />

                <FieldLine
                  label="request"
                  value={shortenIdentifier(item.requestId)}
                />
                <FieldLine
                  label="correlation"
                  value={shortenIdentifier(item.correlationId)}
                />
                <FieldLine
                  label="client event"
                  value={shortenIdentifier(item.clientEventId)}
                />
                <FieldLine label="http method" value={item.httpMethod ?? "—"} />

                <FieldLine label="source surface" value={item.sourceSurface} />
                <FieldLine label="source route" value={item.sourceRoute ?? "—"} />
                <FieldLine
                  label="source component"
                  value={item.sourceComponent ?? "—"}
                />
                <FieldLine
                  label="processor"
                  value={`${item.processorName} ${item.processorVersion}`}
                />

                <FieldLine
                  label="is preview"
                  value={formatBoolean(item.isPreview)}
                />
                <FieldLine
                  label="write attempted"
                  value={formatBoolean(item.isWriteAttempted)}
                />
                <FieldLine
                  label="activity created"
                  value={formatBoolean(item.activityEventCreated)}
                />
                <FieldLine
                  label="visible in service log"
                  value={formatBoolean(item.visibleInServiceLog)}
                />

                <FieldLine label="privacy scope" value={item.privacyScope} />
                <FieldLine
                  label="contains sensitive data"
                  value={formatBoolean(item.containsSensitiveData)}
                />
                <FieldLine
                  label="public safe"
                  value={formatBoolean(item.publicSafe)}
                />
                <FieldLine
                  label="raw text publicly visible"
                  value={formatBoolean(item.rawTextPubliclyVisible)}
                />

                <FieldLine
                  label="AI output publicly visible"
                  value={formatBoolean(item.aiOutputPubliclyVisible)}
                />
                <FieldLine
                  label="privacy badges"
                  value={
                    item.privacyBadges.length > 0
                      ? item.privacyBadges.join(", ")
                      : "—"
                  }
                />
                <FieldLine
                  label="candidate counts"
                  value={`cat ${item.candidateCounts.categories} · met ${item.candidateCounts.metrics} · vo ${item.candidateCounts.valueObjects}`}
                />
                <FieldLine
                  label="extra candidates"
                  value={`exp ${item.candidateCounts.exposures} · state ${item.candidateCounts.stateDeltas} · review ${item.candidateCounts.reviewActions}`}
                />
              </dl>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <h2 className="text-lg font-semibold text-white">
                Permissions and raw text
              </h2>

              <dl className="mt-5 grid gap-3 md:grid-cols-3">
                <PermissionState
                  label="raw text"
                  allowed={permissions?.canViewRawText ?? false}
                />
                <PermissionState
                  label="debug payload"
                  allowed={permissions?.canViewDebugPayload ?? false}
                />
                <PermissionState
                  label="evidence"
                  allowed={permissions?.canViewEvidence ?? false}
                />
              </dl>

              <details className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <summary className="cursor-pointer text-sm font-semibold text-slate-100">
                  Raw message
                </summary>
                {item.rawMessageText ? (
                  <pre className="mt-3 max-h-[360px] overflow-auto whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm leading-relaxed text-slate-200">
                    {item.rawMessageText}
                  </pre>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">
                    Raw text is empty or masked by policy.
                  </p>
                )}
              </details>
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <JsonBlock
                title="Category candidates"
                value={item.categoryCandidatesJson}
                emptyLabel="No category candidates."
              />
              <JsonBlock
                title="Metric candidates"
                value={item.metricCandidatesJson}
                emptyLabel="No metric candidates."
              />
              <JsonBlock
                title="Value Object candidates"
                value={item.valueObjectCandidatesJson}
                emptyLabel="No value object candidates."
              />
              <JsonBlock
                title="Exposure candidates"
                value={item.exposureCandidatesJson}
                emptyLabel="No exposure candidates."
              />
              <JsonBlock
                title="State delta candidates"
                value={item.stateDeltaCandidatesJson}
                emptyLabel="No state delta candidates."
              />
              <JsonBlock
                title="Review action candidates"
                value={item.reviewActionCandidatesJson}
                emptyLabel="No review action candidates."
              />
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <JsonBlock
                title="Entity classification ids"
                value={item.entityClassificationIdsJson}
                emptyLabel="No entity classification ids."
              />
              <JsonBlock
                title="Value Object ids"
                value={item.valueObjectIdsJson}
                emptyLabel="No value object ids."
              />
              <JsonBlock
                title="Event link ids"
                value={item.eventLinkIdsJson}
                emptyLabel="No event link ids."
              />
              <JsonBlock
                title="Aggregate ids"
                value={item.aggregateIdsJson}
                emptyLabel="No aggregate ids."
              />
            </section>

            <section className="grid gap-4 xl:grid-cols-3">
              <JsonBlock
                title="Metric summary"
                value={item.metricSummaryJson}
                emptyLabel="No metric summary."
              />
              <JsonBlock
                title="Quantity summary"
                value={item.quantitySummaryJson}
                emptyLabel="No quantity summary."
              />
              <JsonBlock
                title="Quality score"
                value={item.qualityScoreJson}
                emptyLabel="No quality score."
              />
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <JsonBlock
                title="Safety warnings"
                value={item.safetyWarningsJson}
                emptyLabel="No safety warnings."
              />
              <JsonBlock
                title="Warning messages"
                value={item.warningMessagesJson}
                emptyLabel="No warning messages."
              />
              <JsonBlock
                title="Debug payload"
                value={item.debugPayloadJson}
                emptyLabel="Debug payload is empty or masked."
              />
              <JsonBlock
                title="Evidence"
                value={item.evidenceJson}
                emptyLabel="Evidence is empty or masked."
              />
            </section>

            {detailWarnings.length > 0 ? (
              <section className="rounded-3xl border border-amber-900/60 bg-amber-950/30 p-5 text-sm text-amber-100">
                <h2 className="text-lg font-semibold">API warnings</h2>
                <ul className="mt-3 list-inside list-disc">
                  {detailWarnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
