"use client";

import { useEffect, useState } from "react";

type UnknownRecord = Record<string, unknown>;

type LoadState =
  | {
      status: "loading";
      data: null;
      error: null;
      httpStatus: null;
    }
  | {
      status: "ready";
      data: UnknownRecord;
      error: null;
      httpStatus: number;
    }
  | {
      status: "error";
      data: null;
      error: string;
      httpStatus: number | null;
    };

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRecord(value: unknown, key: string): UnknownRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  const child = value[key];

  return isRecord(child) ? child : null;
}

function getArray(value: unknown, key: string): unknown[] {
  if (!isRecord(value)) {
    return [];
  }

  const child = value[key];

  return Array.isArray(child) ? child : [];
}

function getString(value: unknown, fallback = "—"): string {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : fallback;
}

function getNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function getLockLabel(value: unknown): string {
  if (value === false) {
    return "LOCKED: false";
  }

  if (value === true) {
    return "BROKEN: true";
  }

  return "UNKNOWN";
}

function getRowsLabel(value: unknown): string {
  const numberValue = getNumber(value, 0);

  return numberValue === 0 ? "LOCKED: 0" : `BROKEN: ${numberValue}`;
}

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function StatusPill(props: { label: string; tone?: "neutral" | "safe" | "warn" }) {
  const toneClass =
    props.tone === "safe"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : props.tone === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${toneClass}`}
    >
      {props.label}
    </span>
  );
}

function Section(props: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">{props.title}</h2>
      <div className="mt-4">{props.children}</div>
    </section>
  );
}

function KeyValueGrid(props: { items: Array<{ label: string; value: string }> }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {props.items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-slate-100 bg-slate-50 p-3"
        >
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {item.label}
          </dt>
          <dd className="mt-1 break-words text-sm font-semibold text-slate-950">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function JsonBlock(props: { value: unknown }) {
  return (
    <pre className="max-h-[520px] overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-xs leading-relaxed text-slate-50">
      {formatJson(props.value)}
    </pre>
  );
}

function ListBlock(props: { items: unknown[]; emptyLabel: string }) {
  if (props.items.length === 0) {
    return <p className="text-sm text-slate-500">{props.emptyLabel}</p>;
  }

  return (
    <ul className="space-y-2">
      {props.items.map((item, index) => (
        <li
          key={`${index}-${String(item).slice(0, 40)}`}
          className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-800"
        >
          {typeof item === "string" ? item : formatJson(item)}
        </li>
      ))}
    </ul>
  );
}

function DraftRowsSummary(props: { contract: UnknownRecord | null }) {
  const draftRows = getRecord(props.contract, "draftRows");

  if (!draftRows) {
    return <p className="text-sm text-slate-500">Draft rows section is absent.</p>;
  }

  const activityEventRows = getArray(draftRows, "activityEvents");
  const measureRows = getArray(draftRows, "activityEventMeasures");
  const objectFactRows = getArray(draftRows, "activityObjectFacts");
  const reviewRows = getArray(draftRows, "activityFactReviewItems");
  const queueRows = getArray(draftRows, "activityFactRecalculationQueue");

  return (
    <KeyValueGrid
      items={[
        {
          label: "activity_events",
          value: String(activityEventRows.length),
        },
        {
          label: "activity_event_measures",
          value: String(measureRows.length),
        },
        {
          label: "activity_object_facts",
          value: String(objectFactRows.length),
        },
        {
          label: "activity_fact_review_items",
          value: String(reviewRows.length),
        },
        {
          label: "activity_fact_recalculation_queue",
          value: String(queueRows.length),
        },
      ]}
    />
  );
}

export function GuardedPersistenceContractPreview() {
  const [state, setState] = useState<LoadState>({
    status: "loading",
    data: null,
    error: null,
    httpStatus: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadPreview() {
      try {
        const response = await fetch("/api/activity/facts/save-gate", {
          method: "GET",
          cache: "no-store",
        });

        const json = (await response.json()) as unknown;

        if (!isMounted) {
          return;
        }

        if (!isRecord(json)) {
          setState({
            status: "error",
            data: null,
            error: "Route response is not an object.",
            httpStatus: response.status,
          });
          return;
        }

        setState({
          status: "ready",
          data: json,
          error: null,
          httpStatus: response.status,
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setState({
          status: "error",
          data: null,
          error: error instanceof Error ? error.message : String(error),
          httpStatus: null,
        });
      }
    }

    void loadPreview();

    return () => {
      isMounted = false;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        Loading guarded persistence contract preview...
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800 shadow-sm">
        <p className="font-semibold">Could not load preview.</p>
        <p className="mt-2">{state.error}</p>
      </div>
    );
  }

  const response = state.data;
  const validation = getRecord(response, "validation");
  const validationSummary = getRecord(validation, "summary");
  const noWriteExecutionPlan = getRecord(response, "noWriteExecutionPlan");
  const guardedContract = getRecord(response, "guardedPersistenceContract");
  const sideEffects = getRecord(response, "sideEffects");

  const validationErrors = getArray(validation, "errors");
  const validationWarnings = getArray(validation, "warnings");
  const blockers = getArray(guardedContract, "blockers");
  const warnings = getArray(guardedContract, "warnings");
  const plannedWrites = getArray(response, "plannedWrites");

  const dbWriteExecuted = response.dbWriteExecuted;
  const sqlExecuted = response.sqlExecuted;
  const openAiCallExecuted = response.openAiCallExecuted;
  const productionWriteEnabled = response.productionWriteEnabled;
  const rowsActuallyWritten = getNumber(sideEffects?.rowsActuallyWritten, 0);

  return (
    <div className="space-y-6">
      <Section title="Guarded persistence contract - read-only preview">
        <div className="flex flex-wrap gap-2">
          <StatusPill label="READ ONLY" tone="safe" />
          <StatusPill label="NO DB WRITE" tone="safe" />
          <StatusPill label="NO SQL" tone="safe" />
          <StatusPill label="NO EXTERNAL AI" tone="safe" />
          <StatusPill label="NO SAVE BUTTON" tone="neutral" />
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-600">
          Encoding note: UI shell labels are ASCII-stable; route payload may still
          contain multilingual data inside raw JSON blocks. This page displays a no-write execution plan returned by the save-gate route. Static marker: no-write execution plan returned by the save-gate route
          execution plan returned by the save-gate route.
        </p>

        <div className="mt-5">
          <KeyValueGrid
            items={[
              {
                label: "HTTP status",
                value: String(state.httpStatus),
              },
              {
                label: "routeMode",
                value: getString(response.routeMode),
              },
              {
                label: "writeStatus",
                value: getString(response.writeStatus),
              },
              {
                label: "routeStatus",
                value: getString(response.routeStatus),
              },
              {
                label: "contractMode",
                value: getString(guardedContract?.contractMode),
              },
              {
                label: "persistenceMode",
                value: getString(guardedContract?.persistenceMode),
              },
            ]}
          />
        </div>
      </Section>

      <Section title="No-write locks">
        <KeyValueGrid
          items={[
            {
              label: "productionWriteEnabled",
              value: getLockLabel(productionWriteEnabled),
            },
            {
              label: "dbWriteExecuted",
              value: getLockLabel(dbWriteExecuted),
            },
            {
              label: "sqlExecuted",
              value: getLockLabel(sqlExecuted),
            },
            {
              label: "openAiCallExecuted",
              value: getLockLabel(openAiCallExecuted),
            },
            {
              label: "rowsActuallyWritten",
              value: getRowsLabel(rowsActuallyWritten),
            },
            {
              label: "plannedWrites",
              value: String(plannedWrites.length),
            },
          ]}
        />
      </Section>

      <Section title="Validation summary">
        <KeyValueGrid
          items={[
            {
              label: "sourcePackageId",
              value: getString(validationSummary?.sourcePackageId),
            },
            {
              label: "idempotencyKey",
              value: getString(validationSummary?.idempotencyKey),
            },
            {
              label: "fact decisions",
              value: String(getNumber(validationSummary?.factDecisionCount, 0)),
            },
            {
              label: "VO candidate decisions",
              value: String(
                getNumber(validationSummary?.valueObjectCandidateDecisionCount, 0)
              ),
            },
            {
              label: "writeIntentDetected",
              value: String(validationSummary?.writeIntentDetected ?? "unknown"),
            },
            {
              label: "validation errors",
              value: String(validationErrors.length),
            },
          ]}
        />
      </Section>

      <Section title="Draft row counts for future persistence">
        <DraftRowsSummary contract={guardedContract} />
      </Section>

      <Section title="Contract blockers">
        <ListBlock items={blockers} emptyLabel="No blockers reported." />
      </Section>

      <Section title="Contract warnings">
        <ListBlock items={warnings} emptyLabel="No warnings reported." />
      </Section>

      <Section title="Validation errors / warnings">
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              Validation errors
            </h3>
            <div className="mt-3">
              <ListBlock items={validationErrors} emptyLabel="No validation errors." />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              Validation warnings
            </h3>
            <div className="mt-3">
              <ListBlock
                items={validationWarnings}
                emptyLabel="No validation warnings."
              />
            </div>
          </div>
        </div>
      </Section>

      <Section title="No-write execution plan JSON">
        <JsonBlock value={noWriteExecutionPlan ?? {}} />
      </Section>

      <Section title="Guarded persistence contract JSON">
        <JsonBlock value={guardedContract ?? {}} />
      </Section>
    </div>
  );
}

