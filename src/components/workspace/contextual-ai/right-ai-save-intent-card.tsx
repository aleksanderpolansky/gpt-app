"use client";

import Link from "next/link";

import { useMemo, useState } from "react";

type SaveGateStatus = "idle" | "saving" | "blocked" | "success" | "error";

type PostSaveSuccessState = {
  activityEventId: string;
  measureIds: string[];
  factIds: string[];
  valueObjectIds: string[];
  reviewItemIds: string[];
  recalculationQueueIds: string[];
  savedAtLabel: string;
  source: "api" | "preview";
};

const PREVIEW_SUCCESS_STATE: PostSaveSuccessState = {
  activityEventId: "act_success_preview_001",
  measureIds: ["measure_duration_30_min_preview_001"],
  factIds: [
    "fact_family_time_preview_001",
    "fact_physical_activity_preview_001",
    "fact_child_play_preview_001",
  ],
  valueObjectIds: [
    "vo_family_time_preview",
    "vo_physical_activity_preview",
    "vo_child_play_preview",
  ],
  reviewItemIds: ["review_item_success_preview_001"],
  recalculationQueueIds: ["recalc_queue_success_preview_001"],
  savedAtLabel: "preview only — DB write gate is not enabled",
  source: "preview",
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readString(source: unknown, keys: string[]): string | null {
  const record = asRecord(source);

  if (!record) {
    return null;
  }

  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return null;
}

function readNestedRecord(source: unknown, keys: string[]): Record<string, unknown> | null {
  const record = asRecord(source);

  if (!record) {
    return null;
  }

  for (const key of keys) {
    const nested = asRecord(record[key]);

    if (nested) {
      return nested;
    }
  }

  return null;
}

function stringArrayFromUnknown(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string" && item.trim().length > 0) {
        return item.trim();
      }

      if (typeof item === "number" && Number.isFinite(item)) {
        return String(item);
      }

      return null;
    })
    .filter((item): item is string => Boolean(item));
}

function objectIdArrayFromUnknown(value: unknown, keys: string[]): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => readString(item, keys))
    .filter((item): item is string => Boolean(item));
}

function mergeUnique(...items: string[][]): string[] {
  return Array.from(new Set(items.flat().filter(Boolean)));
}

function readArrayByKeys(source: unknown, keys: string[]): string[] {
  const record = asRecord(source);

  if (!record) {
    return [];
  }

  for (const key of keys) {
    const value = record[key];
    const strings = stringArrayFromUnknown(value);

    if (strings.length > 0) {
      return strings;
    }
  }

  return [];
}

function extractPostSaveSuccessState(payload: unknown): PostSaveSuccessState | null {
  const root = asRecord(payload);

  if (!root) {
    return null;
  }

  const nested =
    readNestedRecord(root, ["result", "data", "created", "saveResult", "payload"]) ?? root;

  const activityEventId =
    readString(root, ["activity_event_id", "activityEventId", "activity_id", "activityId"]) ??
    readString(nested, ["activity_event_id", "activityEventId", "activity_id", "activityId"]);

  const measureIds = mergeUnique(
    readArrayByKeys(root, ["measure_ids", "measureIds", "activity_event_measure_ids", "activityEventMeasureIds"]),
    readArrayByKeys(nested, ["measure_ids", "measureIds", "activity_event_measure_ids", "activityEventMeasureIds"]),
    objectIdArrayFromUnknown(root["measures"], ["id", "measure_id", "measureId"]),
    objectIdArrayFromUnknown(nested["measures"], ["id", "measure_id", "measureId"]),
    objectIdArrayFromUnknown(root["activity_event_measures"], ["id", "measure_id", "measureId"]),
    objectIdArrayFromUnknown(nested["activity_event_measures"], ["id", "measure_id", "measureId"]),
  );

  const factIds = mergeUnique(
    readArrayByKeys(root, ["fact_ids", "factIds", "activity_object_fact_ids", "activityObjectFactIds"]),
    readArrayByKeys(nested, ["fact_ids", "factIds", "activity_object_fact_ids", "activityObjectFactIds"]),
    objectIdArrayFromUnknown(root["facts"], ["id", "fact_id", "factId"]),
    objectIdArrayFromUnknown(nested["facts"], ["id", "fact_id", "factId"]),
    objectIdArrayFromUnknown(root["activity_object_facts"], ["id", "fact_id", "factId"]),
    objectIdArrayFromUnknown(nested["activity_object_facts"], ["id", "fact_id", "factId"]),
  );

  const valueObjectIds = mergeUnique(
    readArrayByKeys(root, ["value_object_ids", "valueObjectIds"]),
    readArrayByKeys(nested, ["value_object_ids", "valueObjectIds"]),
    objectIdArrayFromUnknown(root["facts"], ["value_object_id", "valueObjectId"]),
    objectIdArrayFromUnknown(nested["facts"], ["value_object_id", "valueObjectId"]),
    objectIdArrayFromUnknown(root["activity_object_facts"], ["value_object_id", "valueObjectId"]),
    objectIdArrayFromUnknown(nested["activity_object_facts"], ["value_object_id", "valueObjectId"]),
  );

  const reviewItemIds = mergeUnique(
    readArrayByKeys(root, ["review_item_ids", "reviewItemIds", "activity_fact_review_item_ids", "activityFactReviewItemIds"]),
    readArrayByKeys(nested, ["review_item_ids", "reviewItemIds", "activity_fact_review_item_ids", "activityFactReviewItemIds"]),
    objectIdArrayFromUnknown(root["review_items"], ["id", "review_item_id", "reviewItemId"]),
    objectIdArrayFromUnknown(nested["review_items"], ["id", "review_item_id", "reviewItemId"]),
    objectIdArrayFromUnknown(root["activity_fact_review_items"], ["id", "review_item_id", "reviewItemId"]),
    objectIdArrayFromUnknown(nested["activity_fact_review_items"], ["id", "review_item_id", "reviewItemId"]),
  );

  const recalculationQueueIds = mergeUnique(
    readArrayByKeys(root, ["recalculation_queue_ids", "recalculationQueueIds", "queue_ids", "queueIds"]),
    readArrayByKeys(nested, ["recalculation_queue_ids", "recalculationQueueIds", "queue_ids", "queueIds"]),
    objectIdArrayFromUnknown(root["recalculation_queue"], ["id", "queue_id", "queueId"]),
    objectIdArrayFromUnknown(nested["recalculation_queue"], ["id", "queue_id", "queueId"]),
    objectIdArrayFromUnknown(root["activity_fact_recalculation_queue"], ["id", "queue_id", "queueId"]),
    objectIdArrayFromUnknown(nested["activity_fact_recalculation_queue"], ["id", "queue_id", "queueId"]),
  );

  if (!activityEventId && factIds.length === 0 && valueObjectIds.length === 0) {
    return null;
  }

  return {
    activityEventId: activityEventId ?? "activity_event_id_not_returned",
    measureIds,
    factIds,
    valueObjectIds,
    reviewItemIds,
    recalculationQueueIds,
    savedAtLabel: new Date().toLocaleString("pl-PL"),
    source: "api",
  };
}

function readErrorCode(payload: unknown): string | null {
  const root = asRecord(payload);

  if (!root) {
    return null;
  }

  const nested = readNestedRecord(root, ["error", "details", "result", "data"]);

  return (
    readString(root, ["code", "errorCode", "error", "reason", "status"]) ??
    readString(nested, ["code", "errorCode", "error", "reason", "status"])
  );
}

function readMessage(payload: unknown): string | null {
  const root = asRecord(payload);

  if (!root) {
    return null;
  }

  const nested = readNestedRecord(root, ["error", "details", "result", "data"]);

  return (
    readString(root, ["message", "detail", "description"]) ??
    readString(nested, ["message", "detail", "description"])
  );
}

function IdList({
  label,
  ids,
  emptyLabel = "not returned yet",
}: {
  label: string;
  ids: string[];
  emptyLabel?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>

      {ids.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {ids.map((id) => (
            <code
              key={id}
              className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700"
            >
              {id}
            </code>
          ))}
        </div>
      ) : (
        <div className="mt-2 text-xs text-slate-400">{emptyLabel}</div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: SaveGateStatus }) {
  const className = useMemo(() => {
    if (status === "success") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    if (status === "blocked") {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }

    if (status === "error") {
      return "border-rose-200 bg-rose-50 text-rose-700";
    }

    if (status === "saving") {
      return "border-blue-200 bg-blue-50 text-blue-700";
    }

    return "border-slate-200 bg-slate-50 text-slate-600";
  }, [status]);

  const label = useMemo(() => {
    if (status === "success") {
      return "success state ready";
    }

    if (status === "blocked") {
      return "write gate locked";
    }

    if (status === "error") {
      return "needs review";
    }

    if (status === "saving") {
      return "checking save gate";
    }

    return "no-write preview";
  }, [status]);

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${className}`}>
      {label}
    </span>
  );
}

export function RightAiSaveIntentCard() {
  const [status, setStatus] = useState<SaveGateStatus>("idle");
  const [apiCode, setApiCode] = useState<string | null>(null);
  const [apiMessage, setApiMessage] = useState<string | null>(null);
  const [successState, setSuccessState] = useState<PostSaveSuccessState | null>(null);

  const visibleSuccessState = successState ?? PREVIEW_SUCCESS_STATE;

  const helperText = useMemo(() => {
    if (status === "success" && successState?.source === "api") {
      return "API returned created IDs. The user can now see exactly what was saved and where to inspect facts / Value Objects.";
    }

    if (status === "blocked") {
      return "Runtime write gate is still locked. The card shows the exact post-save success contract without claiming that DB rows were created.";
    }

    if (status === "error") {
      return "The save gate response did not match the success contract. Keep this as a review signal, not a hidden write.";
    }

    return "This is the Step 51 post-save success state UI contract. It is ready to render real created IDs when the guarded save API starts returning them.";
  }, [status, successState]);

  async function handleCheckSaveGate() {
    setStatus("saving");
    setApiCode(null);
    setApiMessage(null);
    setSuccessState(null);

    try {
      const response = await fetch("/api/activity/facts/save-gate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intent: "confirm_save",
          mode: "right_ai_step51_post_save_success_state_probe",
          source: "right_ai_column",
          safety: {
            expectedDbWritesFromUiPatch: false,
            expectedSqlExecutionFromUiPatch: false,
            expectedOpenAiCallFromUiPatch: false,
          },
          reviewDecisionSnapshot: {
            status: "accepted_preview",
            packageId: "right_ai_step51_success_state_preview",
            acceptedFactKeys: [
              "family_time",
              "physical_activity",
              "child_play",
            ],
          },
        }),
      });

      const payload: unknown = await response.json().catch(() => null);
      const extracted = extractPostSaveSuccessState(payload);
      const code = readErrorCode(payload);
      const message = readMessage(payload);

      setApiCode(code);
      setApiMessage(message);

      if (response.ok && extracted) {
        setSuccessState(extracted);
        setStatus("success");
        return;
      }

      if (
        response.status === 409 ||
        code === "ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED" ||
        String(code ?? "").includes("WRITE_NOT_ENABLED")
      ) {
        setStatus("blocked");
        return;
      }

      setStatus("error");
    } catch (error) {
      setApiCode("CLIENT_FETCH_FAILED");
      setApiMessage(error instanceof Error ? error.message : "Unknown client error");
      setStatus("error");
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Step 51 / 76
          </div>
          <h3 className="mt-1 text-sm font-semibold text-slate-950">
            Post-save success state
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Показывает created IDs и ссылки на facts / Value Object tree после сохранения.
          </p>
        </div>

        <StatusBadge status={status} />
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
        {helperText}
      </div>

      <div className="mt-4 grid gap-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
            Activity Event ID
          </div>
          <code className="mt-2 block break-all rounded-lg bg-white/80 px-2 py-1 text-xs text-emerald-900">
            {visibleSuccessState.activityEventId}
          </code>
          <div className="mt-1 text-[11px] text-emerald-700">
            savedAt: {visibleSuccessState.savedAtLabel}
          </div>
        </div>

        <IdList label="Measure IDs" ids={visibleSuccessState.measureIds} />
        <IdList label="Activity Object Fact IDs" ids={visibleSuccessState.factIds} />
        <IdList label="Value Object IDs" ids={visibleSuccessState.valueObjectIds} />
        <IdList label="Review Item IDs" ids={visibleSuccessState.reviewItemIds} />
        <IdList label="Recalculation Queue IDs" ids={visibleSuccessState.recalculationQueueIds} />
      </div>

      <div className="mt-4 grid gap-2 text-xs">
        <Link
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-medium text-slate-700 hover:bg-slate-50"
          href="/activity-facts"
        >
          Open activity facts →
        </Link>

        <Link
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-medium text-slate-700 hover:bg-slate-50"
          href="/value-objects/tree"
        >
          Open Value Objects tree →
        </Link>

        <Link
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-medium text-slate-700 hover:bg-slate-50"
          href="/activity-capture"
        >
          Open activity capture / review →
        </Link>
      </div>

      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
        <strong>Safety:</strong> this UI patch does not enable DB writes. Real created IDs appear only when
        /api/activity/facts/save-gate returns a successful guarded save response.
      </div>

      {(apiCode || apiMessage) && (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600">
          <div className="font-semibold text-slate-800">Last save-gate response</div>
          {apiCode && (
            <div className="mt-1">
              code: <code>{apiCode}</code>
            </div>
          )}
          {apiMessage && (
            <div className="mt-1">
              message: <code>{apiMessage}</code>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        className="mt-4 w-full rounded-2xl bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={status === "saving"}
        onClick={handleCheckSaveGate}
      >
        {status === "saving" ? "Checking save gate..." : "Check save-gate response"}
      </button>
    </section>
  );
}

export default RightAiSaveIntentCard;
