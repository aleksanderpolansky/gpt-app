"use client";

import { useEffect, useState } from "react";

import { ValueObjectParameterAssignmentManager } from "@/components/workspace/value-objects/value-object-parameter-assignment-manager";
import { ValueObjectTargetWriteManager } from "@/components/workspace/value-objects/value-object-target-write-manager";

import type {
  P72B1ParameterAssignmentRead,
  P72B1TargetVersionRead,
  P72B1ValueObjectTargetReadResponse,
  P72B1ValueObjectTargetReadSuccess,
} from "@/types/value-object-target-read-v2";

type ValueObjectTargetReadPanelProps = {
  readonly valueObjectId: string;
};

const PANEL_MARKER = "P7_2B3_TARGET_WRITE_PANEL_V1";

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 6,
});

function humanizeToken(value: string | null): string {
  if (!value) {
    return "—";
  }

  return value.replace(/_/g, " ");
}

function formatNumber(value: number | null): string {
  return value === null ? "—" : numberFormatter.format(value);
}

function withUnit(value: string, unitCode: string | null): string {
  return unitCode ? `${value} ${humanizeToken(unitCode)}` : value;
}

function formatTargetValue(params: {
  valueNumeric: number | null;
  minNumeric: number | null;
  maxNumeric: number | null;
  valueBoolean: boolean | null;
  valueText: string | null;
  unitCode: string | null;
}): string {
  if (params.minNumeric !== null && params.maxNumeric !== null) {
    return withUnit(
      `${formatNumber(params.minNumeric)}–${formatNumber(params.maxNumeric)}`,
      params.unitCode,
    );
  }

  if (params.valueBoolean !== null) {
    return params.valueBoolean ? "Yes" : "No";
  }

  if (params.valueText !== null) {
    return params.valueText;
  }

  if (params.valueNumeric !== null) {
    return withUnit(formatNumber(params.valueNumeric), params.unitCode);
  }

  return "—";
}

function formatOriginalValue(target: P72B1TargetVersionRead): string {
  return formatTargetValue({
    valueNumeric: target.originalValueNumeric,
    minNumeric: target.originalMinNumeric,
    maxNumeric: target.originalMaxNumeric,
    valueBoolean: target.originalValueBoolean,
    valueText: target.originalValueText,
    unitCode: target.originalUnitCode,
  });
}

function formatCanonicalValue(target: P72B1TargetVersionRead): string {
  return formatTargetValue({
    valueNumeric: target.canonicalValueNumeric,
    minNumeric: target.canonicalMinNumeric,
    maxNumeric: target.canonicalMaxNumeric,
    valueBoolean: target.canonicalValueBoolean,
    valueText: target.canonicalValueText,
    unitCode: target.canonicalUnitCode,
  });
}

function formatPeriod(target: P72B1TargetVersionRead): string {
  if (target.periodCount === null || target.periodUnitCode === null) {
    return "No source period";
  }

  return `${formatNumber(target.periodCount)} ${humanizeToken(
    target.periodUnitCode,
  )}`;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function statusClasses(status: string): string {
  if (status === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (status === "superseded") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (status === "archived" || status === "retired") {
    return "border-slate-300 bg-slate-100 text-slate-700";
  }

  return "border-blue-200 bg-blue-50 text-blue-800";
}

function StatusBadge({ status }: { readonly status: string }) {
  return (
    <span
      className={[
        "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em]",
        statusClasses(status),
      ].join(" ")}
    >
      {humanizeToken(status)}
    </span>
  );
}

function DailyRepresentation({
  target,
}: {
  readonly target: P72B1TargetVersionRead;
}) {
  if (
    target.normalizationStateCode === "derived" &&
    target.dailyEquivalentNumeric !== null
  ) {
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-700">
          Daily analytical representation
        </p>
        <p className="mt-1 text-sm font-semibold text-blue-950">
          {withUnit(
            formatNumber(target.dailyEquivalentNumeric),
            target.dailyEquivalentUnitCode,
          )}{" "}
          per day
        </p>
        <p className="mt-1 text-xs leading-5 text-blue-800">
          Derived for analytics only. The original value and period remain the
          source of truth.
        </p>
      </div>
    );
  }

  if (target.normalizationStateCode === "formula_required") {
    return (
      <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-xs leading-5 text-violet-900">
        A reviewed custom formula is required. No daily number has been
        produced.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
      Daily normalization does not apply to this target. No numeric zero has
      been fabricated.
    </div>
  );
}

function TargetSummary({
  target,
  compact = false,
}: {
  readonly target: P72B1TargetVersionRead;
  readonly compact?: boolean;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
            {humanizeToken(target.targetKindCode)} · version {target.version}
          </p>
          <h4 className="mt-1 text-base font-bold text-slate-950">
            {target.label || "Planned target"}
          </h4>
        </div>
        <StatusBadge status={target.statusCode} />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-slate-500">
            Original value
          </p>
          <p className="mt-1 break-words text-sm font-semibold text-slate-950">
            {formatOriginalValue(target)}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {formatPeriod(target)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-slate-500">
            Canonical value
          </p>
          <p className="mt-1 break-words text-sm font-semibold text-slate-950">
            {formatCanonicalValue(target)}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {humanizeToken(target.normalizationPolicyCode)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-slate-500">
            Validity
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-700">
            From {formatDate(target.validFrom)}
          </p>
          <p className="text-xs leading-5 text-slate-700">
            To {formatDate(target.validTo)}
          </p>
        </div>
      </div>

      {!compact ? <DailyRepresentation target={target} /> : null}

      {target.description ? (
        <p className="text-sm leading-6 text-slate-700">
          {target.description}
        </p>
      ) : null}

      {target.safetyNote ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          {target.safetyNote}
        </p>
      ) : null}
    </div>
  );
}

function AssignmentCard({
  valueObjectId,
  assignment,
  onChanged,
}: {
  readonly valueObjectId: string;
  readonly assignment: P72B1ParameterAssignmentRead;
  readonly onChanged: () => void;
}) {
  const { parameter } = assignment;

  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-blue-600">
              {humanizeToken(parameter.scopeCode)} parameter ·{" "}
              {humanizeToken(parameter.dimensionCode)}
            </p>
            <h3 className="mt-1 text-xl font-bold text-slate-950">
              {parameter.title}
            </h3>
            <p className="mt-1 font-mono text-xs text-slate-500">
              {parameter.parameterCode}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusBadge status={assignment.status} />
            <StatusBadge status={parameter.status} />
          </div>
        </div>

        {parameter.description ? (
          <p className="text-sm leading-6 text-slate-700">
            {parameter.description}
          </p>
        ) : null}

        <div className="grid gap-2 text-xs text-slate-700 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="font-bold text-slate-900">Value type</p>
            <p className="mt-1">{humanizeToken(parameter.valueTypeCode)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="font-bold text-slate-900">Canonical unit</p>
            <p className="mt-1">{humanizeToken(parameter.canonicalUnitCode)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="font-bold text-slate-900">Aggregation</p>
            <p className="mt-1">
              {humanizeToken(parameter.aggregationMethodCode)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="font-bold text-slate-900">Default window</p>
            <p className="mt-1">
              {humanizeToken(parameter.defaultWindowCode)}
            </p>
          </div>
        </div>

        <p className="text-xs leading-5 text-slate-500">
          Allowed units:{" "}
          {parameter.allowedUnitCodes.length > 0
            ? parameter.allowedUnitCodes.map(humanizeToken).join(", ")
            : "none"}
        </p>

        {assignment.currentTarget ? (
          <section className="rounded-2xl border border-blue-200 bg-white p-4">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em] text-blue-700">
              Current target
            </p>
            <TargetSummary target={assignment.currentTarget} />
          </section>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm leading-6 text-slate-600">
            This parameter is assigned to the leaf, but it has no active target.
          </div>
        )}

        <ValueObjectTargetWriteManager
          key={`${assignment.id}:${assignment.currentTarget?.id ?? "none"}`}
          valueObjectId={valueObjectId}
          assignment={assignment}
          onChanged={onChanged}
        />

        {assignment.targetHistory.length > 0 ? (
          <details className="rounded-2xl border border-slate-200 bg-white p-4">
            <summary className="cursor-pointer text-sm font-bold text-slate-950">
              Target history ({assignment.targetHistory.length})
            </summary>
            <div className="mt-4 grid gap-4">
              {assignment.targetHistory.map((target) => (
                <div
                  key={target.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <TargetSummary target={target} compact />
                </div>
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </article>
  );
}

function isSuccess(
  response: P72B1ValueObjectTargetReadResponse,
): response is P72B1ValueObjectTargetReadSuccess {
  return response.ok;
}

export function ValueObjectTargetReadPanel({
  valueObjectId,
}: ValueObjectTargetReadPanelProps) {
  const [response, setResponse] =
    useState<P72B1ValueObjectTargetReadResponse | null>(null);
  const [transportError, setTransportError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setIsLoading(true);
      setTransportError(null);

      try {
        const result = await fetch(
          `/api/value-objects/${encodeURIComponent(valueObjectId)}/standards`,
          {
            method: "GET",
            cache: "no-store",
            credentials: "same-origin",
            signal: controller.signal,
          },
        );

        const payload =
          (await result.json()) as P72B1ValueObjectTargetReadResponse;

        if (!controller.signal.aborted) {
          setResponse(payload);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setTransportError(
            error instanceof Error
              ? error.message
              : "Could not load parameters and targets.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => controller.abort();
  }, [valueObjectId, reloadKey]);

  if (isLoading) {
    return (
      <section
        className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        data-p7-2b1-marker={PANEL_MARKER}
      >
        <p className="text-sm text-slate-600">
          Loading real parameters and targets…
        </p>
      </section>
    );
  }

  if (transportError) {
    return (
      <section
        className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm"
        data-p7-2b1-marker={PANEL_MARKER}
      >
        <p className="font-bold text-red-900">Read failed</p>
        <p className="mt-2 text-sm leading-6 text-red-800">
          {transportError}
        </p>
      </section>
    );
  }

  if (!response || !isSuccess(response)) {
    return (
      <section
        className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm"
        data-p7-2b1-marker={PANEL_MARKER}
      >
        <p className="font-bold text-amber-950">
          Parameters and targets are unavailable
        </p>
        <p className="mt-2 text-sm leading-6 text-amber-900">
          {response?.errorMessage ?? "The server returned no readable data."}
        </p>
        {response?.errorCode ? (
          <p className="mt-2 font-mono text-xs text-amber-800">
            {response.errorCode}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      data-p7-2b1-marker={PANEL_MARKER}
      aria-label="Real parameters and planned targets"
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">
              P7.2B3 · target authoring
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">
              Parameters and planned targets
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Leaf: <strong>{response.valueObject.title}</strong>. The read
              model shows actor-owned assignments and immutable target history.
              P7.2B3 adds guarded target creation, versioning and archiving.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center md:grid-cols-4">
            {[
              ["Assignments", response.counts.assignments],
              ["Active", response.counts.activeAssignments],
              ["Target series", response.counts.targetSeries],
              ["Versions", response.counts.targetVersions],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  {label}
                </p>
                <p className="mt-1 text-xl font-bold text-slate-950">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
          Parameter assignment and target authoring are server-mediated. Target
          changes create immutable versions; archiving preserves the full history.
        </div>

        <ValueObjectParameterAssignmentManager
          valueObjectId={valueObjectId}
          onChanged={() => setReloadKey((current) => current + 1)}
        />

        {response.assignments.length > 0 ? (
          <div className="grid gap-4">
            {response.assignments.map((assignment) => (
              <AssignmentCard
                key={assignment.id}
                valueObjectId={valueObjectId}
                assignment={assignment}
                onChanged={() => setReloadKey((current) => current + 1)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-6 text-slate-600">
            This leaf has no assigned parameters yet. No fixture or demo cards
            are being substituted.
          </div>
        )}
      </div>
    </section>
  );
}

export default ValueObjectTargetReadPanel;
