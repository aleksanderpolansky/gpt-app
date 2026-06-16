"use client";

import { useEffect, useMemo, useState } from "react";

type SaveGatePlannedWrite = {
  targetTable?: string;
  operation?: string;
  localSourceId?: string;
  plannedDbId?: string | null;
  descriptionRu?: string;
  writeStatus?: string;
};

type SaveGateSkipped = {
  factLocalIds?: string[];
  semanticObjectKeys?: string[];
  reasonsRu?: string[];
};

type SaveGateValidationIssue = {
  code?: string;
  fieldPath?: string;
  severity?: string;
  messageRu?: string;
};

type SaveGateValidation = {
  ok?: boolean;
  errors?: SaveGateValidationIssue[];
  warnings?: SaveGateValidationIssue[];
};

type SaveGateRequestSummary = {
  sourcePackageId?: string | null;
  idempotencyKey?: string | null;
  routeMode?: string | null;
  futurePersistenceMode?: string | null;
  idempotencyContext?: {
    mode?: string | null;
    idempotencyKey?: string | null;
    sourcePackageId?: string | null;
    replaySafe?: boolean | null;
    duplicateClickCreatesDuplicateFacts?: boolean | null;
    duplicateRequestPolicy?: string | null;
    conflictPolicy?: string | null;
    uniquenessScope?: string | null;
    requestHashRequiredForRealWrites?: boolean | null;
    confirmSaveBlockedBy?: string | null;
  } | null;
  ownershipContext?: {
    mode?: string | null;
    serverDerivedOwnership?: boolean | null;
    directBrowserSupabaseWriteAllowed?: boolean | null;
    factRowsRemainPrivateUserOwned?: boolean | null;
    confirmSaveBlockedBy?: string | null;
    browserWriteRule?: string | null;
    valueObjectPrivacyRule?: string | null;
  } | null;
  factDecisionCount?: number;
  editedFactDecisionCount?: number;
  valueObjectCandidateDecisionCount?: number;
  writeIntentDetected?: boolean;
  writeIntentReasons?: string[];
  validationErrorCount?: number;
  validationWarningCount?: number;
};

type SaveGateNoWriteGuarantee = {
  dbReadExecuted?: boolean;
  dbWriteExecuted?: boolean;
  sqlExecuted?: boolean;
  openAiCallExecuted?: boolean;
  rowsActuallyWritten?: number;
};

type SaveGateNoWriteExecutionPlan = {
  ok?: boolean;
  planMode?: string;
  planStatus?: string;
  sourcePackageId?: string | null;
  idempotencyKey?: string | null;
  acceptedFactLocalIds?: string[];
  rejectedFactLocalIds?: string[];
  deferredFactLocalIds?: string[];
  editedFactLocalIds?: string[];
  valueObjectCreateCandidateKeys?: string[];
  valueObjectUseExistingCandidateKeys?: string[];
  valueObjectSkippedCandidateKeys?: string[];
  valueObjectDeferredCandidateKeys?: string[];
  plannedWrites?: SaveGatePlannedWrite[];
  skipped?: SaveGateSkipped;
  noWriteGuarantee?: SaveGateNoWriteGuarantee;
};

type SaveGateSideEffects = {
  dbReadExecuted?: boolean;
  dbWriteExecuted?: boolean;
  sqlExecuted?: boolean;
  openAiCallExecuted?: boolean;
  valueObjectCreated?: boolean;
  activityEventCreated?: boolean;
  activityEventMeasureCreated?: boolean;
  activityObjectFactCreated?: boolean;
  activityFactReviewItemCreated?: boolean;
  recalculationQueueItemCreated?: boolean;
  rowsActuallyWritten?: number;
};

type SaveGatePlanResponse = {
  ok?: boolean;
  errorCode?: string;
  errorMessage?: string;
  routeLayer?: string;
  routeStatus?: string;
  writeStatus?: string;
  productionWriteEnabled?: boolean;
  dbWriteExecuted?: boolean;
  sqlExecuted?: boolean;
  openAiCallExecuted?: boolean;
  requestSummary?: SaveGateRequestSummary;
  futurePersistenceMode?: string | null;
  idempotencyContext?: {
    mode?: string | null;
    idempotencyKey?: string | null;
    sourcePackageId?: string | null;
    replaySafe?: boolean | null;
    duplicateClickCreatesDuplicateFacts?: boolean | null;
    duplicateRequestPolicy?: string | null;
    conflictPolicy?: string | null;
    uniquenessScope?: string | null;
    requestHashRequiredForRealWrites?: boolean | null;
    confirmSaveBlockedBy?: string | null;
  } | null;
  ownershipContext?: {
    mode?: string | null;
    serverDerivedOwnership?: boolean | null;
    directBrowserSupabaseWriteAllowed?: boolean | null;
    factRowsRemainPrivateUserOwned?: boolean | null;
    confirmSaveBlockedBy?: string | null;
    browserWriteRule?: string | null;
    valueObjectPrivacyRule?: string | null;
  } | null;
  validation?: SaveGateValidation;
  plannedWrites?: SaveGatePlannedWrite[];
  skipped?: SaveGateSkipped;
  noWriteExecutionPlan?: SaveGateNoWriteExecutionPlan;
  sideEffects?: SaveGateSideEffects;
};

type PreviewMode = "GET_PREVIEW" | "POST_PREVIEW" | "POST_WRITE_INTENT";

const ENDPOINT = "/api/activity/facts/save-gate";

const previewRequestBody = {
  routeMode: "contract_preview_only",
  idempotencyKey: "ui-preview-save-gate-plan-v1",
  sourcePackageId: "fixture-football-with-child-30m-v1",
  factDecisions: [
    {
      factLocalId: "fact-family-time-30m",
      decision: "accept",
      reasonRu: "UI preview accept.",
    },
    {
      factLocalId: "fact-physical-activity-30m",
      decision: "accept",
      reasonRu: "UI preview accept.",
    },
  ],
  editedFactDecisions: [],
  valueObjectCandidateDecisions: [
    {
      semanticObjectKey: "football",
      proposedTitleRu: "Футбол",
      decision: "skip",
      selectedExistingValueObjectId: null,
      selectedExistingValueObjectTitle: null,
      proposedParentValueObjectId: "VO_DEMO_PHYSICAL_ACTIVITY",
      proposedParentTitleRu: "Физическая активность",
      reasonRu: "UI preview skip candidate.",
    },
  ],
  clientSafetyConfirmation: {
    userReviewedPreview: true,
    userConfirmedMissingValueObjectCreation: false,
    userConfirmedFactWrite: false,
    userUnderstandsPreviewIsNotDiagnosis: true,
  },
};

const confirmSaveIntentRequestBody = {
  futurePersistenceMode: "confirm_save",
  routeMode: "future_server_mediated_write",
  idempotencyKey: "ui-write-intent-save-gate-plan-v1",
  sourcePackageId: "fixture-football-with-child-30m-v1",
  factDecisions: [
    {
      factLocalId: "fact-family-time-30m",
      decision: "accept",
      reasonRu: "UI write-intent must be blocked.",
    },
  ],
  editedFactDecisions: [],
  valueObjectCandidateDecisions: [
    {
      semanticObjectKey: "football",
      proposedTitleRu: "Футбол",
      decision: "create_new",
      selectedExistingValueObjectId: null,
      selectedExistingValueObjectTitle: null,
      proposedParentValueObjectId: "VO_DEMO_PHYSICAL_ACTIVITY",
      proposedParentTitleRu: "Физическая активность",
      reasonRu: "UI write-intent must be blocked.",
    },
  ],
  clientSafetyConfirmation: {
    userReviewedPreview: true,
    userConfirmedMissingValueObjectCreation: true,
    userConfirmedFactWrite: true,
    userUnderstandsPreviewIsNotDiagnosis: true,
  },
};

function toList(value: string[] | undefined): string[] {
  return Array.isArray(value) ? value : [];
}

function boolLabel(value: boolean | undefined): string {
  if (value === true) {
    return "true";
  }

  if (value === false) {
    return "false";
  }

  return "—";
}

function numberLabel(value: number | undefined): string {
  return typeof value === "number" ? String(value) : "—";
}

function textLabel(value: string | null | undefined): string {
  return value && value.trim().length > 0 ? value : "—";
}

function statusBadgeClass(isSafe: boolean | undefined): string {
  if (isSafe === false) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (isSafe === true) {
    return "border-red-200 bg-red-50 text-red-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function ModeButton(props: {
  mode: PreviewMode;
  currentMode: PreviewMode;
  label: string;
  description: string;
  onClick: (mode: PreviewMode) => void;
}) {
  const active = props.currentMode === props.mode;

  return (
    <button
      type="button"
      onClick={() => props.onClick(props.mode)}
      className={[
        "rounded-2xl border p-4 text-left transition",
        active
          ? "border-slate-900 bg-slate-900 text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-800 hover:border-slate-400",
      ].join(" ")}
    >
      <span className="block text-sm font-semibold">{props.label}</span>
      <span
        className={[
          "mt-1 block text-xs",
          active ? "text-slate-200" : "text-slate-500",
        ].join(" ")}
      >
        {props.description}
      </span>
    </button>
  );
}

function KeyValueCard(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {props.label}
      </div>
      <div className="mt-2 break-words text-sm font-semibold text-slate-900">
        {props.value}
      </div>
    </div>
  );
}

function PlannedWritesTable(props: { writes: SaveGatePlannedWrite[] }) {
  if (props.writes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
        Planned writes отсутствуют. Для invalid JSON/body это ожидаемое поведение.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">
                Target table
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">
                Operation
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">
                Local source
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">
                Description
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {props.writes.map((write, index) => (
              <tr key={`${write.targetTable ?? "table"}-${write.localSourceId ?? index}`}>
                <td className="px-4 py-3 align-top font-medium text-slate-900">
                  {textLabel(write.targetTable)}
                </td>
                <td className="px-4 py-3 align-top text-slate-700">
                  {textLabel(write.operation)}
                </td>
                <td className="px-4 py-3 align-top text-slate-700">
                  {textLabel(write.localSourceId)}
                </td>
                <td className="px-4 py-3 align-top text-slate-600">
                  {textLabel(write.descriptionRu)}
                </td>
                <td className="px-4 py-3 align-top text-slate-700">
                  {textLabel(write.writeStatus)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IssuesList(props: {
  title: string;
  issues: SaveGateValidationIssue[] | undefined;
}) {
  const issues = Array.isArray(props.issues) ? props.issues : [];

  if (issues.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        {props.title}: нет записей.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="text-sm font-semibold text-amber-900">{props.title}</div>
      <ul className="mt-3 space-y-2 text-sm text-amber-900">
        {issues.map((issue, index) => (
          <li key={`${issue.code ?? "issue"}-${issue.fieldPath ?? index}`}>
            <span className="font-mono text-xs">{textLabel(issue.code)}</span>
            <span className="mx-2 text-amber-700">·</span>
            <span>{textLabel(issue.fieldPath)}</span>
            <div className="mt-1 text-amber-800">{textLabel(issue.messageRu)}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SaveGatePlanPreview() {
  const [mode, setMode] = useState<PreviewMode>("GET_PREVIEW");
  const [response, setResponse] = useState<SaveGatePlanResponse | null>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function loadPlan(nextMode: PreviewMode) {
    setMode(nextMode);
    setIsLoading(true);
    setLoadError(null);

    try {
      const requestInit: RequestInit =
        nextMode === "GET_PREVIEW"
          ? { method: "GET" }
          : {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(
                nextMode === "POST_WRITE_INTENT"
                  ? confirmSaveIntentRequestBody
                  : previewRequestBody
              ),
            };

      const result = await fetch(ENDPOINT, requestInit);
      const payload = (await result.json()) as SaveGatePlanResponse;

      setStatusCode(result.status);
      setResponse(payload);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Не удалось загрузить preview save gate."
      );
      setResponse(null);
      setStatusCode(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialPlan() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const result = await fetch(ENDPOINT, { method: "GET" });
        const payload = (await result.json()) as SaveGatePlanResponse;

        if (!cancelled) {
          setStatusCode(result.status);
          setResponse(payload);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Не удалось загрузить initial preview."
          );
          setResponse(null);
          setStatusCode(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialPlan();

    return () => {
      cancelled = true;
    };
  }, []);

  const plan = response?.noWriteExecutionPlan;
  const plannedWrites = useMemo(
    () => (Array.isArray(response?.plannedWrites) ? response.plannedWrites : []),
    [response]
  );

  const skippedReasons = toList(response?.skipped?.reasonsRu);
  const sideEffects = response?.sideEffects;
  const noWriteGuarantee = plan?.noWriteGuarantee;

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Activity Facts Save Gate
            </div>
            <h1 className="mt-2 text-2xl font-bold text-slate-950">
              Read-only no-write execution plan
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Эта страница показывает будущий план записи фактов, но не выполняет
              сохранение. Любой реальный write-intent должен оставаться
              заблокированным до отдельного gated implementation шага.
            </p>
          </div>

          <div
            className={[
              "rounded-2xl border px-4 py-3 text-sm font-semibold",
              statusBadgeClass(response?.dbWriteExecuted),
            ].join(" ")}
          >
            DB write executed: {boolLabel(response?.dbWriteExecuted)}
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <ModeButton
            mode="GET_PREVIEW"
            currentMode={mode}
            label="GET preview"
            description="Контрактный no-write preview."
            onClick={(nextMode) => void loadPlan(nextMode)}
          />
          <ModeButton
            mode="POST_PREVIEW"
            currentMode={mode}
            label="POST preview"
            description="Preview body без подтверждения записи."
            onClick={(nextMode) => void loadPlan(nextMode)}
          />
          <ModeButton
            mode="POST_WRITE_INTENT"
            currentMode={mode}
            label="POST confirm_save intent"
            description="Проверка блокировки confirm_save intent: ожидается 409 и ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED."
            onClick={(nextMode) => void loadPlan(nextMode)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Загружаю no-write plan preview…
        </div>
      ) : null}

      {loadError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          {loadError}
        </div>
      ) : null}

      {response ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KeyValueCard label="HTTP status" value={numberLabel(statusCode ?? undefined)} />
            <KeyValueCard label="Route status" value={textLabel(response.routeStatus)} />
            <KeyValueCard label="Write status" value={textLabel(response.writeStatus)} />
            <KeyValueCard
              label="Production write enabled"
              value={boolLabel(response.productionWriteEnabled)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KeyValueCard
              label="Plan mode"
              value={textLabel(plan?.planMode)}
            />
            <KeyValueCard
              label="Plan status"
              value={textLabel(plan?.planStatus)}
            />
            <KeyValueCard
              label="Planned writes"
              value={numberLabel(plannedWrites.length)}
            />
            <KeyValueCard
              label="plan.noWriteGuarantee.rowsActuallyWritten"
              value={numberLabel(noWriteGuarantee?.rowsActuallyWritten)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <KeyValueCard
              label="sideEffects.dbRead"
              value={boolLabel(sideEffects?.dbReadExecuted)}
            />
            <KeyValueCard
              label="sideEffects.dbWrite"
              value={boolLabel(sideEffects?.dbWriteExecuted)}
            />
            <KeyValueCard
              label="sideEffects.sql"
              value={boolLabel(sideEffects?.sqlExecuted)}
            />
            <KeyValueCard
              label="sideEffects.external AI"
              value={boolLabel(sideEffects?.openAiCallExecuted)}
            />
            <KeyValueCard
              label="sideEffects.rowsActuallyWritten"
              value={numberLabel(sideEffects?.rowsActuallyWritten)}
            />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">
              Request summary
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <KeyValueCard
                label="Source package"
                value={textLabel(response.requestSummary?.sourcePackageId)}
              />
              <KeyValueCard
                label="Idempotency key"
                value={textLabel(response.requestSummary?.idempotencyKey)}
              />
              <KeyValueCard
                label="Route mode"
                value={textLabel(response.requestSummary?.routeMode)}
              />

            <KeyValueCard
              label="Future persistence mode"
              value={textLabel(
                response.futurePersistenceMode ??
                  response.requestSummary?.futurePersistenceMode
              )}
            />
              <KeyValueCard
                label="Ownership context"
                value={textLabel(response.ownershipContext?.mode)}
              />
              <KeyValueCard
                label="Server-derived ownership"
                value={textLabel(String(response.ownershipContext?.serverDerivedOwnership ?? "—"))}
              />
              <KeyValueCard
                label="Direct browser Supabase write"
                value={textLabel(String(response.ownershipContext?.directBrowserSupabaseWriteAllowed ?? "—"))}
              />
              <KeyValueCard
                label="Fact rows remain private"
                value={textLabel(String(response.ownershipContext?.factRowsRemainPrivateUserOwned ?? "—"))}
              />
              <KeyValueCard
                label="Ownership block code"
                value={textLabel(response.ownershipContext?.confirmSaveBlockedBy)}
              />
              <KeyValueCard
                label="Idempotency context"
                value={textLabel(response.idempotencyContext?.mode)}
              />
              <KeyValueCard
                label="Replay safe"
                value={textLabel(String(response.idempotencyContext?.replaySafe ?? "—"))}
              />
              <KeyValueCard
                label="Duplicate click creates duplicate facts"
                value={textLabel(String(response.idempotencyContext?.duplicateClickCreatesDuplicateFacts ?? "—"))}
              />
              <KeyValueCard
                label="Idempotency uniqueness scope"
                value={textLabel(response.idempotencyContext?.uniquenessScope)}
              />
              <KeyValueCard
                label="Idempotency block code"
                value={textLabel(response.idempotencyContext?.confirmSaveBlockedBy)}
              />
              <KeyValueCard
                label="Write intent"
                value={boolLabel(response.requestSummary?.writeIntentDetected)}
              />
            </div>

            {toList(response.requestSummary?.writeIntentReasons).length > 0 ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
                <div className="text-sm font-semibold text-red-900">
                  Write-intent reasons
                </div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-800">
                  {toList(response.requestSummary?.writeIntentReasons).map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">
              Planned writes preview
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Это только план будущих записей. Поле plannedDbId остаётся null,
              а writeStatus — not_executed_contract_preview.
            </p>
            <div className="mt-4">
              <PlannedWritesTable writes={plannedWrites} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">
                Accepted / edited / deferred
              </h2>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <div>
                  <span className="font-semibold">Accepted facts:</span>{" "}
                  {toList(plan?.acceptedFactLocalIds).join(", ") || "—"}
                </div>
                <div>
                  <span className="font-semibold">Edited facts:</span>{" "}
                  {toList(plan?.editedFactLocalIds).join(", ") || "—"}
                </div>
                <div>
                  <span className="font-semibold">Rejected facts:</span>{" "}
                  {toList(plan?.rejectedFactLocalIds).join(", ") || "—"}
                </div>
                <div>
                  <span className="font-semibold">Deferred facts:</span>{" "}
                  {toList(plan?.deferredFactLocalIds).join(", ") || "—"}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">
                Value Object decisions
              </h2>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <div>
                  <span className="font-semibold">Create candidates:</span>{" "}
                  {toList(plan?.valueObjectCreateCandidateKeys).join(", ") || "—"}
                </div>
                <div>
                  <span className="font-semibold">Use existing:</span>{" "}
                  {toList(plan?.valueObjectUseExistingCandidateKeys).join(", ") || "—"}
                </div>
                <div>
                  <span className="font-semibold">Skipped:</span>{" "}
                  {toList(plan?.valueObjectSkippedCandidateKeys).join(", ") || "—"}
                </div>
                <div>
                  <span className="font-semibold">Deferred:</span>{" "}
                  {toList(plan?.valueObjectDeferredCandidateKeys).join(", ") || "—"}
                </div>
              </div>
            </div>
          </div>

          {skippedReasons.length > 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">
                Skipped / deferred reasons
              </h2>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-700">
                {skippedReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <IssuesList title="Validation errors" issues={response.validation?.errors} />
            <IssuesList title="Validation warnings" issues={response.validation?.warnings} />
          </div>
        </>
      ) : null}
    </section>
  );
}







