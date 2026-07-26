"use client";

import { useMemo, useState } from "react";

import type {
  P72B1ParameterAssignmentRead,
  P72B1TargetVersionRead,
} from "@/types/value-object-target-read-v2";
import type {
  P72B3NormalizationPolicyCode,
  P72B3PeriodUnitCode,
  P72B3PriorityCode,
  P72B3TargetKindCode,
  P72B3TargetWriteResponse,
} from "@/types/value-object-target-write-v2";

type ValueObjectTargetWriteManagerProps = {
  readonly valueObjectId: string;
  readonly assignment: P72B1ParameterAssignmentRead;
  readonly onChanged: () => void;
};

type FormState = {
  targetKindCode: P72B3TargetKindCode;
  normalizationPolicyCode: "default" | "custom_formula";
  numericValue: string;
  numericMin: string;
  numericMax: string;
  booleanValue: boolean;
  textValue: string;
  originalUnitCode: string;
  usePeriod: boolean;
  periodCount: string;
  periodUnitCode: P72B3PeriodUnitCode;
  priorityCode: P72B3PriorityCode;
  label: string;
  description: string;
  safetyNote: string;
};

const NUMERIC_TARGET_KINDS: P72B3TargetKindCode[] = [
  "amount_per_period",
  "count_per_period",
  "point_value",
  "range",
  "threshold_min",
  "threshold_max",
];

const PERIOD_UNITS: P72B3PeriodUnitCode[] = [
  "day",
  "week",
  "month",
  "quarter",
  "year",
  "rolling_7_days",
  "rolling_30_days",
];

const PRIORITIES: P72B3PriorityCode[] = [
  "low",
  "normal",
  "high",
  "critical",
];

const REQUIRED_PERIOD_KINDS = new Set<P72B3TargetKindCode>([
  "amount_per_period",
  "count_per_period",
]);

const FORBIDDEN_PERIOD_KINDS = new Set<P72B3TargetKindCode>([
  "point_value",
  "boolean_condition",
  "qualitative_criterion",
]);

function humanize(value: string): string {
  return value.replace(/_/g, " ");
}

function numberText(value: number | null): string {
  return value === null ? "" : String(value);
}

function defaultPeriodUnit(defaultWindowCode: string): P72B3PeriodUnitCode {
  if (
    defaultWindowCode === "day" ||
    defaultWindowCode === "week" ||
    defaultWindowCode === "month" ||
    defaultWindowCode === "year"
  ) {
    return defaultWindowCode;
  }

  return "week";
}

function defaultTargetKind(
  assignment: P72B1ParameterAssignmentRead,
): P72B3TargetKindCode {
  const { parameter } = assignment;

  if (parameter.valueTypeCode === "boolean") {
    return "boolean_condition";
  }

  if (parameter.valueTypeCode === "text") {
    return "qualitative_criterion";
  }

  if (parameter.dimensionCode === "count") {
    return "count_per_period";
  }

  if (parameter.defaultWindowCode !== "event") {
    return "amount_per_period";
  }

  return "point_value";
}

function initialForm(
  assignment: P72B1ParameterAssignmentRead,
): FormState {
  const current = assignment.currentTarget;
  const targetKindCode = current
    ? (current.targetKindCode as P72B3TargetKindCode)
    : defaultTargetKind(assignment);
  const periodUnitCode = current?.periodUnitCode
    ? (current.periodUnitCode as P72B3PeriodUnitCode)
    : defaultPeriodUnit(assignment.parameter.defaultWindowCode);

  return {
    targetKindCode,
    normalizationPolicyCode:
      current?.normalizationPolicyCode === "custom_formula"
        ? "custom_formula"
        : "default",
    numericValue: numberText(current?.originalValueNumeric ?? null),
    numericMin: numberText(current?.originalMinNumeric ?? null),
    numericMax: numberText(current?.originalMaxNumeric ?? null),
    booleanValue: current?.originalValueBoolean ?? true,
    textValue: current?.originalValueText ?? "",
    originalUnitCode:
      current?.originalUnitCode ??
      assignment.parameter.canonicalUnitCode ??
      assignment.parameter.allowedUnitCodes[0] ??
      "",
    usePeriod:
      current?.periodCount !== null || REQUIRED_PERIOD_KINDS.has(targetKindCode),
    periodCount: numberText(current?.periodCount ?? 1),
    periodUnitCode,
    priorityCode:
      (current?.priorityCode as P72B3PriorityCode | undefined) ?? "normal",
    label: current?.label ?? "",
    description: current?.description ?? "",
    safetyNote: current?.safetyNote ?? "",
  };
}

function parseOptionalNumber(value: string): number | null {
  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function targetKindOptions(
  assignment: P72B1ParameterAssignmentRead,
): P72B3TargetKindCode[] {
  if (assignment.parameter.valueTypeCode === "boolean") {
    return ["boolean_condition"];
  }

  if (assignment.parameter.valueTypeCode === "text") {
    return ["qualitative_criterion"];
  }

  if (assignment.parameter.valueTypeCode === "numeric") {
    return NUMERIC_TARGET_KINDS;
  }

  return [];
}

function currentTargetLabel(target: P72B1TargetVersionRead | null): string {
  return target ? `Create version ${target.version + 1}` : "Create target";
}

function makeIdempotencyKey(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `p72b3-${prefix}-${random}`;
}

export function ValueObjectTargetWriteManager({
  valueObjectId,
  assignment,
  onChanged,
}: ValueObjectTargetWriteManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => initialForm(assignment));
  const [busyMode, setBusyMode] = useState<"save" | "archive" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const kinds = useMemo(() => targetKindOptions(assignment), [assignment]);
  const currentTarget = assignment.currentTarget;
  const periodRequired = REQUIRED_PERIOD_KINDS.has(form.targetKindCode);
  const periodForbidden = FORBIDDEN_PERIOD_KINDS.has(form.targetKindCode);
  const periodEnabled = periodRequired || (!periodForbidden && form.usePeriod);
  const numericParameter = assignment.parameter.valueTypeCode === "numeric";
  const supported = kinds.length > 0;
  const writable =
    assignment.status === "active" &&
    assignment.parameter.status === "active" &&
    supported;

  function updateForm<Key extends keyof FormState>(
    key: Key,
    value: FormState[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage(null);
    setErrorMessage(null);
  }

  async function saveTarget() {
    if (!writable || busyMode !== null) {
      return;
    }

    setBusyMode("save");
    setMessage(null);
    setErrorMessage(null);

    const isRange = form.targetKindCode === "range";
    const isBoolean = form.targetKindCode === "boolean_condition";
    const isText = form.targetKindCode === "qualitative_criterion";
    const body = {
      mode: currentTarget ? "new_version" : "create_series",
      targetSeriesId: currentTarget?.targetSeriesId ?? null,
      targetKindCode: form.targetKindCode,
      normalizationPolicyCode:
        form.normalizationPolicyCode === "custom_formula"
          ? "custom_formula"
          : null,
      originalValueNumeric:
        numericParameter && !isRange
          ? parseOptionalNumber(form.numericValue)
          : null,
      originalMinNumeric:
        numericParameter && isRange
          ? parseOptionalNumber(form.numericMin)
          : null,
      originalMaxNumeric:
        numericParameter && isRange
          ? parseOptionalNumber(form.numericMax)
          : null,
      originalValueBoolean: isBoolean ? form.booleanValue : null,
      originalValueText: isText ? form.textValue.trim() : null,
      originalUnitCode: numericParameter ? form.originalUnitCode : null,
      periodCount: periodEnabled
        ? parseOptionalNumber(form.periodCount)
        : null,
      periodUnitCode: periodEnabled ? form.periodUnitCode : null,
      priorityCode: form.priorityCode,
      label: form.label.trim() || null,
      description: form.description.trim() || null,
      safetyNote: form.safetyNote.trim() || null,
      idempotencyKey: makeIdempotencyKey(
        currentTarget ? "new-version" : "create-series",
      ),
    };

    try {
      const response = await fetch(
        `/api/value-objects/${encodeURIComponent(valueObjectId)}/parameter-assignments/${encodeURIComponent(assignment.id)}/targets`,
        {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );

      const payload = (await response.json()) as P72B3TargetWriteResponse;

      if (!response.ok || !payload.ok) {
        throw new Error(
          payload.ok
            ? "Target write failed."
            : `${payload.errorCode}: ${payload.errorMessage}`,
        );
      }

      setMessage(
        payload.result.idempotentReplay
          ? "The exact request was already saved."
          : currentTarget
            ? `Version ${payload.result.version} created.`
            : "Target created.",
      );
      setIsOpen(false);
      onChanged();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Target write failed.",
      );
    } finally {
      setBusyMode(null);
    }
  }

  async function archiveTarget() {
    if (!currentTarget || busyMode !== null) {
      return;
    }

    if (!window.confirm("Archive this active target? Its history will remain.")) {
      return;
    }

    setBusyMode("archive");
    setMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/value-objects/${encodeURIComponent(valueObjectId)}/parameter-assignments/${encodeURIComponent(assignment.id)}/targets/${encodeURIComponent(currentTarget.targetSeriesId)}`,
        {
          method: "PATCH",
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mode: "archive",
            idempotencyKey: makeIdempotencyKey("archive"),
          }),
        },
      );

      const payload = (await response.json()) as P72B3TargetWriteResponse;

      if (!response.ok || !payload.ok) {
        throw new Error(
          payload.ok
            ? "Target archive failed."
            : `${payload.errorCode}: ${payload.errorMessage}`,
        );
      }

      setMessage("Target archived. Version history was preserved.");
      setIsOpen(false);
      onChanged();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Target archive failed.",
      );
    } finally {
      setBusyMode(null);
    }
  }

  if (!supported) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
        Target authoring is not supported for this parameter value type yet.
      </div>
    );
  }

  return (
    <section
      className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4"
      data-p7-2b3-target-write-manager
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-violet-700">
            P7.2B3 · target authoring
          </p>
          <p className="mt-1 text-sm leading-6 text-violet-950">
            {currentTarget
              ? "Create a new immutable version or archive the active target."
              : "Create the first planned value for this assigned parameter."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!writable || busyMode !== null}
            onClick={() => setIsOpen((current) => !current)}
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {isOpen ? "Close target form" : currentTargetLabel(currentTarget)}
          </button>

          {currentTarget ? (
            <button
              type="button"
              disabled={busyMode !== null}
              onClick={() => void archiveTarget()}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50"
            >
              {busyMode === "archive" ? "Archiving…" : "Archive target"}
            </button>
          ) : null}
        </div>
      </div>

      {!writable ? (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          Target writes require an active assignment and an active parameter.
        </p>
      ) : null}

      {message ? (
        <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">
          {message}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-900">
          {errorMessage}
        </p>
      ) : null}

      {isOpen && writable ? (
        <div className="mt-4 grid gap-4 rounded-2xl border border-violet-200 bg-white p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-xs font-semibold text-slate-700">
              Target kind
              <select
                value={form.targetKindCode}
                disabled={currentTarget !== null}
                onChange={(event) => {
                  const targetKindCode = event.target
                    .value as P72B3TargetKindCode;
                  updateForm("targetKindCode", targetKindCode);
                  if (REQUIRED_PERIOD_KINDS.has(targetKindCode)) {
                    updateForm("usePeriod", true);
                  }
                }}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal disabled:bg-slate-100"
              >
                {kinds.map((kind) => (
                  <option key={kind} value={kind}>
                    {humanize(kind)}
                  </option>
                ))}
              </select>
            </label>

            {numericParameter ? (
              <label className="grid gap-1 text-xs font-semibold text-slate-700">
                Normalization
                <select
                  value={form.normalizationPolicyCode}
                  onChange={(event) =>
                    updateForm(
                      "normalizationPolicyCode",
                      event.target.value as FormState["normalizationPolicyCode"],
                    )
                  }
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
                >
                  <option value="default">Default for target kind</option>
                  <option value="custom_formula">Reviewed formula required</option>
                </select>
              </label>
            ) : null}

            {numericParameter && form.targetKindCode !== "range" ? (
              <label className="grid gap-1 text-xs font-semibold text-slate-700">
                Planned value
                <input
                  type="number"
                  step="any"
                  value={form.numericValue}
                  onChange={(event) =>
                    updateForm("numericValue", event.target.value)
                  }
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
                />
              </label>
            ) : null}

            {numericParameter && form.targetKindCode === "range" ? (
              <>
                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                  Minimum
                  <input
                    type="number"
                    step="any"
                    value={form.numericMin}
                    onChange={(event) =>
                      updateForm("numericMin", event.target.value)
                    }
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
                  />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                  Maximum
                  <input
                    type="number"
                    step="any"
                    value={form.numericMax}
                    onChange={(event) =>
                      updateForm("numericMax", event.target.value)
                    }
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
                  />
                </label>
              </>
            ) : null}

            {numericParameter ? (
              <label className="grid gap-1 text-xs font-semibold text-slate-700">
                Original unit
                <select
                  value={form.originalUnitCode}
                  onChange={(event) =>
                    updateForm("originalUnitCode", event.target.value)
                  }
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
                >
                  {assignment.parameter.allowedUnitCodes.map((unit) => (
                    <option key={unit} value={unit}>
                      {humanize(unit)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {assignment.parameter.valueTypeCode === "boolean" ? (
              <label className="grid gap-1 text-xs font-semibold text-slate-700">
                Planned condition
                <select
                  value={form.booleanValue ? "true" : "false"}
                  onChange={(event) =>
                    updateForm("booleanValue", event.target.value === "true")
                  }
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
                >
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              </label>
            ) : null}

            {assignment.parameter.valueTypeCode === "text" ? (
              <label className="grid gap-1 text-xs font-semibold text-slate-700 md:col-span-2">
                Qualitative criterion
                <textarea
                  value={form.textValue}
                  maxLength={4000}
                  onChange={(event) =>
                    updateForm("textValue", event.target.value)
                  }
                  className="min-h-24 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
                />
              </label>
            ) : null}
          </div>

          {!periodForbidden ? (
            <div className="grid gap-3 md:grid-cols-3">
              {!periodRequired ? (
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.usePeriod}
                    onChange={(event) =>
                      updateForm("usePeriod", event.target.checked)
                    }
                  />
                  Use a source period
                </label>
              ) : (
                <p className="text-xs font-semibold text-slate-700">
                  This target kind requires a source period.
                </p>
              )}

              {periodEnabled ? (
                <>
                  <label className="grid gap-1 text-xs font-semibold text-slate-700">
                    Period count
                    <input
                      type="number"
                      min="0.000001"
                      step="any"
                      value={form.periodCount}
                      onChange={(event) =>
                        updateForm("periodCount", event.target.value)
                      }
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-semibold text-slate-700">
                    Period unit
                    <select
                      value={form.periodUnitCode}
                      onChange={(event) =>
                        updateForm(
                          "periodUnitCode",
                          event.target.value as P72B3PeriodUnitCode,
                        )
                      }
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
                    >
                      {PERIOD_UNITS.map((unit) => (
                        <option key={unit} value={unit}>
                          {humanize(unit)}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-xs font-semibold text-slate-700">
              Priority
              <select
                value={form.priorityCode}
                onChange={(event) =>
                  updateForm(
                    "priorityCode",
                    event.target.value as P72B3PriorityCode,
                  )
                }
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {humanize(priority)}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-xs font-semibold text-slate-700">
              Label
              <input
                value={form.label}
                maxLength={200}
                onChange={(event) => updateForm("label", event.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
              />
            </label>

            <label className="grid gap-1 text-xs font-semibold text-slate-700">
              Description
              <textarea
                value={form.description}
                maxLength={4000}
                onChange={(event) =>
                  updateForm("description", event.target.value)
                }
                className="min-h-20 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
              />
            </label>

            <label className="grid gap-1 text-xs font-semibold text-slate-700">
              Safety note
              <textarea
                value={form.safetyNote}
                maxLength={4000}
                onChange={(event) =>
                  updateForm("safetyNote", event.target.value)
                }
                className="min-h-20 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
              />
            </label>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-900">
            The original value, unit and period are stored as the source of truth.
            Canonical and daily representations are calculated by the server.
          </div>

          <button
            type="button"
            disabled={busyMode !== null}
            onClick={() => void saveTarget()}
            className="w-fit rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {busyMode === "save"
              ? "Saving…"
              : currentTargetLabel(currentTarget)}
          </button>
        </div>
      ) : null}
    </section>
  );
}

export default ValueObjectTargetWriteManager;
