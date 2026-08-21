"use client";

import { useCallback, useMemo, useState } from "react";

import type {
  P72B2CatalogParameter,
  P72B2ParameterCatalogResponse,
  P72B2WriteResponse,
} from "@/types/value-object-parameter-assignment-v2";

type ValueObjectParameterAssignmentManagerProps = {
  readonly valueObjectId: string;
  readonly onChanged: () => void;
};

type CustomFormState = {
  title: string;
  description: string;
  dimensionCode: string;
  valueTypeCode: "numeric" | "text" | "boolean" | "timestamp";
  canonicalUnitCode: string;
  allowedUnitCodes: string;
  aggregationMethodCode: string;
  defaultWindowCode: string;
  allowNegative: boolean;
};

const DIMENSIONS = [
  "time",
  "distance",
  "count",
  "volume",
  "mass",
  "energy",
  "money",
  "rate",
  "score",
  "temperature",
  "text",
  "boolean",
  "timestamp",
] as const;

const VALUE_TYPES = ["numeric", "text", "boolean", "timestamp"] as const;

const AGGREGATIONS = [
  "sum",
  "average",
  "minimum",
  "maximum",
  "latest",
  "count",
  "duration",
  "rate",
  "none",
] as const;

const WINDOWS = [
  "event",
  "hour",
  "day",
  "week",
  "month",
  "rolling_7_days",
  "rolling_30_days",
] as const;

const INITIAL_FORM: CustomFormState = {
  title: "",
  description: "",
  dimensionCode: "count",
  valueTypeCode: "numeric",
  canonicalUnitCode: "repetition",
  allowedUnitCodes: "repetition",
  aggregationMethodCode: "sum",
  defaultWindowCode: "event",
  allowNegative: false,
};

function humanize(value: string): string {
  return value.replaceAll("_", " ");
}

function createIdempotencyKey(prefix: string): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `p7-2b2-${prefix}-${id}`;
}

function isCatalogSuccess(
  response: P72B2ParameterCatalogResponse,
): response is Extract<P72B2ParameterCatalogResponse, { ok: true }> {
  return response.ok;
}

function isWriteSuccess(
  response: P72B2WriteResponse,
): response is Extract<P72B2WriteResponse, { ok: true }> {
  return response.ok;
}

function ParameterMeta({
  parameter,
}: {
  readonly parameter: P72B2CatalogParameter;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
      <span>{humanize(parameter.dimensionCode)}</span>
      <span>{humanize(parameter.valueTypeCode)}</span>
      <span>{humanize(parameter.canonicalUnitCode)}</span>
      <span>{humanize(parameter.aggregationMethodCode)}</span>
      <span>{humanize(parameter.defaultWindowCode)}</span>
    </div>
  );
}

export function ValueObjectParameterAssignmentManager({
  valueObjectId,
  onChanged,
}: ValueObjectParameterAssignmentManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [catalog, setCatalog] =
    useState<P72B2ParameterCatalogResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState<CustomFormState>(INITIAL_FORM);

  const loadCatalog = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/value-objects/${encodeURIComponent(
          valueObjectId,
        )}/parameter-catalog`,
        {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
        },
      );

      const payload =
        (await response.json()) as P72B2ParameterCatalogResponse;

      setCatalog(payload);

      if (!payload.ok) {
        setErrorMessage(payload.errorMessage);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not load the parameter catalog.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [valueObjectId]);

  const activeParameters = useMemo(() => {
    if (!catalog || !isCatalogSuccess(catalog)) {
      return [];
    }

    return [...catalog.systemParameters, ...catalog.actorParameters].filter(
      (parameter) => parameter.assignment?.status === "active",
    );
  }, [catalog]);

  const inactiveParameters = useMemo(() => {
    if (!catalog || !isCatalogSuccess(catalog)) {
      return [];
    }

    return [...catalog.systemParameters, ...catalog.actorParameters].filter(
      (parameter) => parameter.assignment?.status === "inactive",
    );
  }, [catalog]);

  async function submitWrite(params: {
    key: string;
    url: string;
    method: "POST" | "PATCH";
    body: Record<string, unknown>;
    successMessage: string;
  }) {
    setBusyKey(params.key);
    setMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(params.url, {
        method: params.method,
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(params.body),
      });

      const payload = (await response.json()) as P72B2WriteResponse;

      if (!isWriteSuccess(payload)) {
        setErrorMessage(`${payload.errorCode}: ${payload.errorMessage}`);
        return false;
      }

      setMessage(
        payload.result.idempotentReplay
          ? "The exact request was already applied."
          : params.successMessage,
      );
      await loadCatalog();
      onChanged();
      return true;
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "The write request failed.",
      );
      return false;
    } finally {
      setBusyKey(null);
    }
  }

  async function assignParameter(parameter: P72B2CatalogParameter) {
    await submitWrite({
      key: `assign-${parameter.id}`,
      url: `/api/value-objects/${encodeURIComponent(
        valueObjectId,
      )}/parameter-assignments`,
      method: "POST",
      body: {
        mode: "assign_existing",
        parameterDefinitionId: parameter.id,
        displayOrder: 1000,
        idempotencyKey: createIdempotencyKey("assign"),
      },
      successMessage: `${parameter.title} was assigned to the leaf.`,
    });
  }

  async function changeAssignmentState(
    parameter: P72B2CatalogParameter,
    mode: "deactivate" | "reactivate",
  ) {
    const assignmentId = parameter.assignment?.id;

    if (!assignmentId) {
      return;
    }

    await submitWrite({
      key: `${mode}-${assignmentId}`,
      url: `/api/value-objects/${encodeURIComponent(
        valueObjectId,
      )}/parameter-assignments/${encodeURIComponent(assignmentId)}`,
      method: "PATCH",
      body: {
        mode,
        idempotencyKey: createIdempotencyKey(mode),
      },
      successMessage:
        mode === "deactivate"
          ? `${parameter.title} was unassigned without deleting history.`
          : `${parameter.title} was reactivated.`,
    });
  }

  async function createCustomParameter() {
    const title = form.title.trim();
    const canonicalUnitCode = form.canonicalUnitCode.trim();
    const units = [
      ...new Set(
        form.allowedUnitCodes
          .split(",")
          .map((unit) => unit.trim())
          .filter(Boolean),
      ),
    ];

    if (!title || !canonicalUnitCode) {
      setErrorMessage("Title and canonical unit are required.");
      return;
    }

    if (!units.includes(canonicalUnitCode)) {
      units.unshift(canonicalUnitCode);
    }

    const success = await submitWrite({
      key: "create-custom",
      url: `/api/value-objects/${encodeURIComponent(
        valueObjectId,
      )}/parameter-assignments`,
      method: "POST",
      body: {
        mode: "create_custom_and_assign",
        definition: {
          title,
          description: form.description.trim() || null,
          dimensionCode: form.dimensionCode,
          valueTypeCode: form.valueTypeCode,
          canonicalUnitCode,
          allowedUnitCodes: units,
          aggregationMethodCode: form.aggregationMethodCode,
          defaultWindowCode: form.defaultWindowCode,
          allowNegative: form.allowNegative,
        },
        displayOrder: 1000,
        idempotencyKey: createIdempotencyKey("custom"),
      },
      successMessage: `${title} was created and assigned.`,
    });

    if (success) {
      setForm(INITIAL_FORM);
    }
  }

  return (
    <section className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-indigo-700">
            P7.2B2 · planned leaf settings
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-950">
            Planned leaf parameters
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            This card configures planning parameters only. Actual observed
            values live in the Fact Journal and may be tagged by this leaf
            regardless of this list.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (isOpen) {
              setIsOpen(false);
              return;
            }

            setIsOpen(true);
            void loadCatalog();
          }}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-indigo-700"
        >
          {isOpen ? "Close manager" : "Add or manage parameter"}
        </button>
      </div>

      {isOpen ? (
        <div className="mt-5 grid gap-5">
          {message ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              {message}
            </p>
          ) : null}

          {errorMessage ? (
            <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              {errorMessage}
            </p>
          ) : null}

          {isLoading ? (
            <p className="text-sm text-slate-600">Loading parameter catalog…</p>
          ) : null}

          {catalog && isCatalogSuccess(catalog) ? (
            <>
              <div className="grid grid-cols-2 gap-2 text-center md:grid-cols-4">
                {[
                  ["System", catalog.counts.systemParameters],
                  ["My parameters", catalog.counts.actorParameters],
                  ["Assigned", catalog.counts.activeAssignments],
                  ["Inactive", catalog.counts.inactiveAssignments],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-indigo-200 bg-white p-3"
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

              {activeParameters.length > 0 ? (
                <div>
                  <h4 className="text-sm font-bold text-slate-950">
                    Active assignments
                  </h4>
                  <div className="mt-2 grid gap-2">
                    {activeParameters.map((parameter) => (
                      <div
                        key={parameter.id}
                        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <p className="font-semibold text-slate-950">
                            {parameter.title}
                          </p>
                          <ParameterMeta parameter={parameter} />
                        </div>
                        <button
                          type="button"
                          disabled={busyKey !== null}
                          onClick={() =>
                            void changeAssignmentState(parameter, "deactivate")
                          }
                          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 disabled:opacity-50"
                        >
                          {busyKey ===
                          `deactivate-${parameter.assignment?.id}`
                            ? "Working…"
                            : "Unassign"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {inactiveParameters.length > 0 ? (
                <div>
                  <h4 className="text-sm font-bold text-slate-950">
                    Inactive assignments
                  </h4>
                  <div className="mt-2 grid gap-2">
                    {inactiveParameters.map((parameter) => (
                      <div
                        key={parameter.id}
                        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <p className="font-semibold text-slate-950">
                            {parameter.title}
                          </p>
                          <ParameterMeta parameter={parameter} />
                        </div>
                        <button
                          type="button"
                          disabled={
                            busyKey !== null || parameter.status !== "active"
                          }
                          onClick={() =>
                            void changeAssignmentState(parameter, "reactivate")
                          }
                          className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900 disabled:opacity-50"
                        >
                          {busyKey ===
                          `reactivate-${parameter.assignment?.id}`
                            ? "Working…"
                            : "Reactivate"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h4 className="font-bold text-slate-950">
                    Available system parameters
                  </h4>
                  <div className="mt-3 grid max-h-96 gap-2 overflow-y-auto pr-1">
                    {catalog.systemParameters.filter(
                      (parameter) => parameter.assignment === null,
                    ).length > 0 ? (
                      catalog.systemParameters
                        .filter((parameter) => parameter.assignment === null)
                        .map((parameter) => (
                          <div
                            key={parameter.id}
                            className="rounded-xl border border-slate-200 p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-slate-950">
                                  {parameter.title}
                                </p>
                                <ParameterMeta parameter={parameter} />
                              </div>
                              <button
                                type="button"
                                disabled={
                                  busyKey !== null ||
                                  !parameter.availableForAssignment
                                }
                                onClick={() => void assignParameter(parameter)}
                                className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                              >
                                {busyKey === `assign-${parameter.id}`
                                  ? "Working…"
                                  : "Assign"}
                              </button>
                            </div>
                          </div>
                        ))
                    ) : (
                      <p className="text-sm text-slate-500">
                        No additional system parameters are available.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h4 className="font-bold text-slate-950">My parameters</h4>
                  <div className="mt-3 grid max-h-96 gap-2 overflow-y-auto pr-1">
                    {catalog.actorParameters.filter(
                      (parameter) => parameter.assignment === null,
                    ).length > 0 ? (
                      catalog.actorParameters
                        .filter((parameter) => parameter.assignment === null)
                        .map((parameter) => (
                          <div
                            key={parameter.id}
                            className="rounded-xl border border-slate-200 p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-slate-950">
                                  {parameter.title}
                                </p>
                                <ParameterMeta parameter={parameter} />
                                {parameter.status === "retired" ? (
                                  <p className="mt-2 text-xs text-amber-700">
                                    Retired definitions cannot be assigned.
                                  </p>
                                ) : null}
                              </div>
                              <button
                                type="button"
                                disabled={
                                  busyKey !== null ||
                                  !parameter.availableForAssignment
                                }
                                onClick={() => void assignParameter(parameter)}
                                className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                              >
                                {busyKey === `assign-${parameter.id}`
                                  ? "Working…"
                                  : "Assign"}
                              </button>
                            </div>
                          </div>
                        ))
                    ) : (
                      <p className="text-sm text-slate-500">
                        No reusable custom parameters are available.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="font-bold text-slate-950">
                  Create custom parameter
                </h4>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  The technical parameter code is generated by the server.
                </p>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1 text-xs font-semibold text-slate-700">
                    Title
                    <input
                      value={form.title}
                      maxLength={200}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
                    />
                  </label>

                  <label className="grid gap-1 text-xs font-semibold text-slate-700">
                    Description
                    <input
                      value={form.description}
                      maxLength={4000}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
                    />
                  </label>

                  <label className="grid gap-1 text-xs font-semibold text-slate-700">
                    Dimension
                    <select
                      value={form.dimensionCode}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          dimensionCode: event.target.value,
                        }))
                      }
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
                    >
                      {DIMENSIONS.map((value) => (
                        <option key={value} value={value}>
                          {humanize(value)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1 text-xs font-semibold text-slate-700">
                    Value type
                    <select
                      value={form.valueTypeCode}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          valueTypeCode: event.target
                            .value as CustomFormState["valueTypeCode"],
                        }))
                      }
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
                    >
                      {VALUE_TYPES.map((value) => (
                        <option key={value} value={value}>
                          {humanize(value)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1 text-xs font-semibold text-slate-700">
                    Canonical unit
                    <input
                      value={form.canonicalUnitCode}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          canonicalUnitCode: event.target.value,
                        }))
                      }
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
                    />
                  </label>

                  <label className="grid gap-1 text-xs font-semibold text-slate-700">
                    Allowed units, comma separated
                    <input
                      value={form.allowedUnitCodes}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          allowedUnitCodes: event.target.value,
                        }))
                      }
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
                    />
                  </label>

                  <label className="grid gap-1 text-xs font-semibold text-slate-700">
                    Aggregation
                    <select
                      value={form.aggregationMethodCode}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          aggregationMethodCode: event.target.value,
                        }))
                      }
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
                    >
                      {AGGREGATIONS.map((value) => (
                        <option key={value} value={value}>
                          {humanize(value)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1 text-xs font-semibold text-slate-700">
                    Default window
                    <select
                      value={form.defaultWindowCode}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          defaultWindowCode: event.target.value,
                        }))
                      }
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
                    >
                      {WINDOWS.map((value) => (
                        <option key={value} value={value}>
                          {humanize(value)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.allowNegative}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        allowNegative: event.target.checked,
                      }))
                    }
                  />
                  Allow negative values
                </label>

                <button
                  type="button"
                  disabled={busyKey !== null}
                  onClick={() => void createCustomParameter()}
                  className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  {busyKey === "create-custom"
                    ? "Creating…"
                    : "Create and assign"}
                </button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export default ValueObjectParameterAssignmentManager;
