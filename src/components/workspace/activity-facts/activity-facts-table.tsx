"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type ActivityFactRow = {
  factId: string | null;
  activityEventId: string | null;
  measureId: string | null;
  semanticObjectKey: string | null;
  valueObjectId: string | null;
  measureType: string | null;
  metricValue: unknown;
  metricValueSource: string | null;
  unit: string | null;
  factStatus: string | null;
  sourceType: string | null;
  confidence: number | null;
  createdAt: string | null;
};

type ActivityFactsResponse = {
  ok?: boolean;
  endpoint?: string;
  readStatus?: string;
  facts?: ActivityFactRow[];
  count?: number;
  filters?: {
    limit?: number;
    semanticObjectKey?: string | null;
    valueObjectId?: string | null;
    activityEventId?: string | null;
    factStatus?: string | null;
  };
  ownership?: {
    appUserId?: string;
    rule?: string;
  };
  schemaMode?: {
    source?: string;
    strategy?: string;
    metricValueRule?: string;
  };
  sideEffects?: {
    dbWritesExecuted?: boolean;
    sqlExecuted?: boolean;
    openAiCallExecuted?: boolean;
  };
  errorCode?: string;
  errorMessage?: string;
};

type LoadState =
  | { status: "loading" }
  | { status: "ready"; data: ActivityFactsResponse }
  | {
      status: "error";
      statusCode: number | null;
      message: string;
      data: ActivityFactsResponse | null;
    };

type ActivityFactsFilterState = {
  limit: number;
  semanticObjectKey: string;
  valueObjectId: string;
  activityEventId: string;
  factStatus: string;
};

type FetchFactsResult = {
  responseOk: boolean;
  statusCode: number;
  data: ActivityFactsResponse;
};

type ActiveFilterBadge = {
  key: keyof ActivityFactsFilterState;
  label: string;
  value: string;
};

type CorrectionActionKey = "confirm" | "reject" | "edit" | "supersede";

type CorrectionPreview = {
  action: CorrectionActionKey;
  label: string;
  targetStatus: string;
  transitionHint: string;
  noWritePayload: {
    factId: string | null;
    activityEventId: string | null;
    valueObjectId: string | null;
    semanticObjectKey: string | null;
    currentStatus: string | null;
    requestedAction: CorrectionActionKey;
    intendedTargetStatus: string;
    executionMode: "no_write_preview_only";
  };
};

const DEFAULT_LIMIT = 50;

const DEFAULT_FILTERS: ActivityFactsFilterState = {
  limit: DEFAULT_LIMIT,
  semanticObjectKey: "",
  valueObjectId: "",
  activityEventId: "",
  factStatus: "",
};

const FACT_STATUS_OPTIONS = [
  { value: "", label: "Все статусы" },
  { value: "active", label: "active" },
  { value: "pending_review", label: "pending_review" },
  { value: "confirmed", label: "confirmed" },
  { value: "rejected", label: "rejected" },
  { value: "superseded", label: "superseded" },
];

const CORRECTION_ACTIONS: Array<{
  key: CorrectionActionKey;
  label: string;
  targetStatus: string;
  tone: string;
}> = [
  {
    key: "confirm",
    label: "Подтвердить",
    targetStatus: "confirmed",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
  },
  {
    key: "reject",
    label: "Отклонить",
    targetStatus: "rejected",
    tone: "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100",
  },
  {
    key: "edit",
    label: "Исправить",
    targetStatus: "pending_review",
    tone: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100",
  },
  {
    key: "supersede",
    label: "Supersede",
    targetStatus: "superseded",
    tone: "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
  },
];

function compactId(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  if (value.length <= 18) {
    return value;
  }

  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

function formatMeasure(row: ActivityFactRow) {
  const parts = [
    row.measureType ?? "measure",
    row.metricValue === null || typeof row.metricValue === "undefined"
      ? null
      : String(row.metricValue),
    row.unit,
  ].filter(Boolean);

  if (parts.length === 0) {
    return "—";
  }

  return parts.join(" · ");
}

function normalizeFilters(filters: ActivityFactsFilterState): ActivityFactsFilterState {
  return {
    limit: filters.limit,
    semanticObjectKey: filters.semanticObjectKey.trim(),
    valueObjectId: filters.valueObjectId.trim(),
    activityEventId: filters.activityEventId.trim(),
    factStatus: filters.factStatus.trim(),
  };
}

function areFiltersEqual(
  left: ActivityFactsFilterState,
  right: ActivityFactsFilterState
) {
  return (
    left.limit === right.limit &&
    left.semanticObjectKey === right.semanticObjectKey &&
    left.valueObjectId === right.valueObjectId &&
    left.activityEventId === right.activityEventId &&
    left.factStatus === right.factStatus
  );
}

function getActiveFilterBadges(filters: ActivityFactsFilterState): ActiveFilterBadge[] {
  const badges: ActiveFilterBadge[] = [];

  if (filters.limit !== DEFAULT_LIMIT) {
    badges.push({
      key: "limit",
      label: "limit",
      value: String(filters.limit),
    });
  }

  if (filters.semanticObjectKey) {
    badges.push({
      key: "semanticObjectKey",
      label: "semantic key",
      value: filters.semanticObjectKey,
    });
  }

  if (filters.valueObjectId) {
    badges.push({
      key: "valueObjectId",
      label: "VO",
      value: compactId(filters.valueObjectId),
    });
  }

  if (filters.activityEventId) {
    badges.push({
      key: "activityEventId",
      label: "activity",
      value: compactId(filters.activityEventId),
    });
  }

  if (filters.factStatus) {
    badges.push({
      key: "factStatus",
      label: "status",
      value: filters.factStatus,
    });
  }

  return badges;
}

function buildQueryUrl(filters: ActivityFactsFilterState) {
  const normalized = normalizeFilters(filters);
  const searchParams = new URLSearchParams();

  searchParams.set("limit", String(normalized.limit));

  if (normalized.semanticObjectKey) {
    searchParams.set("semanticObjectKey", normalized.semanticObjectKey);
  }

  if (normalized.valueObjectId) {
    searchParams.set("valueObjectId", normalized.valueObjectId);
  }

  if (normalized.activityEventId) {
    searchParams.set("activityEventId", normalized.activityEventId);
  }

  if (normalized.factStatus) {
    searchParams.set("factStatus", normalized.factStatus);
  }

  return `/api/activity/facts?${searchParams.toString()}`;
}

function buildActivityEventHref(activityEventId: string | null | undefined) {
  if (!activityEventId) {
    return null;
  }

  return `/activity-today?activityEventId=${encodeURIComponent(activityEventId)}`;
}

function buildValueObjectHref(valueObjectId: string | null | undefined) {
  if (!valueObjectId) {
    return null;
  }

  return `/value-objects/${encodeURIComponent(valueObjectId)}`;
}

function renderLinkedCompactId(
  value: string | null | undefined,
  href: string | null,
  label: string
) {
  const displayValue = compactId(value);

  if (!value || !href) {
    return <span>{displayValue}</span>;
  }

  return (
    <Link
      href={href}
      className="font-mono text-xs font-semibold text-indigo-700 underline decoration-indigo-200 underline-offset-4 transition hover:text-indigo-900 hover:decoration-indigo-500"
      title={`${label}: ${value}`}
    >
      {displayValue}
    </Link>
  );
}

async function fetchActivityFacts(
  filters: ActivityFactsFilterState
): Promise<FetchFactsResult> {
  const response = await fetch(buildQueryUrl(filters), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const data = (await response.json()) as ActivityFactsResponse;

  return {
    responseOk: response.ok,
    statusCode: response.status,
    data,
  };
}

function getErrorMessage(
  result: Pick<FetchFactsResult, "statusCode" | "data">
) {
  return (
    result.data.errorMessage ??
    result.data.errorCode ??
    `Activity facts request failed with HTTP ${result.statusCode}.`
  );
}

function getStatusTransitionHint(currentStatus: string | null, targetStatus: string) {
  const current = currentStatus ?? "unknown";

  if (current === targetStatus) {
    return `Статус уже равен ${targetStatus}. Будущая write-модель должна либо блокировать дубль, либо создавать audit-only запись.`;
  }

  if (current === "superseded") {
    return "Fact уже superseded. Будущая write-модель должна требовать отдельное подтверждение перед повторной сменой статуса.";
  }

  if (current === "rejected" && targetStatus === "confirmed") {
    return "Переход rejected → confirmed возможен только после явного audit reason.";
  }

  if (targetStatus === "pending_review") {
    return "Исправление должно сначала переводить fact в режим review, а не менять данные без проверки.";
  }

  return `Предпросмотр перехода ${current} → ${targetStatus}. Запись пока намеренно не выполняется.`;
}

function buildCorrectionPreview(
  row: ActivityFactRow,
  action: CorrectionActionKey
): CorrectionPreview {
  const actionConfig = CORRECTION_ACTIONS.find((item) => item.key === action);

  const label = actionConfig?.label ?? action;
  const targetStatus = actionConfig?.targetStatus ?? "pending_review";

  return {
    action,
    label,
    targetStatus,
    transitionHint: getStatusTransitionHint(row.factStatus, targetStatus),
    noWritePayload: {
      factId: row.factId,
      activityEventId: row.activityEventId,
      valueObjectId: row.valueObjectId,
      semanticObjectKey: row.semanticObjectKey,
      currentStatus: row.factStatus,
      requestedAction: action,
      intendedTargetStatus: targetStatus,
      executionMode: "no_write_preview_only",
    },
  };
}

function getActionButtonClass(tone: string) {
  return [
    "rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition",
    tone,
  ].join(" ");
}

export function ActivityFactsTable() {
  const [draftFilters, setDraftFilters] =
    useState<ActivityFactsFilterState>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<ActivityFactsFilterState>(DEFAULT_FILTERS);
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [selectedFact, setSelectedFact] = useState<ActivityFactRow | null>(null);
  const [correctionPreview, setCorrectionPreview] =
    useState<CorrectionPreview | null>(null);

  const requestUrl = useMemo(
    () => buildQueryUrl(appliedFilters),
    [appliedFilters]
  );

  const activeFilterBadges = useMemo(
    () => getActiveFilterBadges(appliedFilters),
    [appliedFilters]
  );

  const normalizedDraftFilters = useMemo(
    () => normalizeFilters(draftFilters),
    [draftFilters]
  );

  const hasDraftChanges = useMemo(
    () => !areFiltersEqual(normalizedDraftFilters, appliedFilters),
    [appliedFilters, normalizedDraftFilters]
  );

  const selectedActivityHref = useMemo(
    () => buildActivityEventHref(selectedFact?.activityEventId),
    [selectedFact?.activityEventId]
  );

  const selectedValueObjectHref = useMemo(
    () => buildValueObjectHref(selectedFact?.valueObjectId),
    [selectedFact?.valueObjectId]
  );

  const loadFacts = useCallback(async (filters: ActivityFactsFilterState) => {
    setLoadState({ status: "loading" });

    try {
      const normalizedFilters = normalizeFilters(filters);
      const result = await fetchActivityFacts(normalizedFilters);

      if (!result.responseOk || result.data.ok === false) {
        setLoadState({
          status: "error",
          statusCode: result.statusCode,
          message: getErrorMessage(result),
          data: result.data,
        });
        return;
      }

      setLoadState({ status: "ready", data: result.data });
    } catch (error) {
      setLoadState({
        status: "error",
        statusCode: null,
        message:
          error instanceof Error
            ? error.message
            : "Unknown Activity Facts request error.",
        data: null,
      });
    }
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function loadInitialFacts() {
      try {
        const result = await fetchActivityFacts(DEFAULT_FILTERS);

        if (!isCurrent) {
          return;
        }

        if (!result.responseOk || result.data.ok === false) {
          setLoadState({
            status: "error",
            statusCode: result.statusCode,
            message: getErrorMessage(result),
            data: result.data,
          });
          return;
        }

        setLoadState({ status: "ready", data: result.data });
      } catch (error) {
        if (!isCurrent) {
          return;
        }

        setLoadState({
          status: "error",
          statusCode: null,
          message:
            error instanceof Error
              ? error.message
              : "Unknown Activity Facts request error.",
          data: null,
        });
      }
    }

    void loadInitialFacts();

    return () => {
      isCurrent = false;
    };
  }, []);

  const applyFilters = useCallback(() => {
    const nextFilters = normalizeFilters(draftFilters);

    setDraftFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setSelectedFact(null);
    setCorrectionPreview(null);
    void loadFacts(nextFilters);
  }, [draftFilters, loadFacts]);

  const clearFilters = useCallback(() => {
    setDraftFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setSelectedFact(null);
    setCorrectionPreview(null);
    void loadFacts(DEFAULT_FILTERS);
  }, [loadFacts]);

  const refreshCurrentView = useCallback(() => {
    void loadFacts(appliedFilters);
  }, [appliedFilters, loadFacts]);

  const setDraftTextFilter = useCallback(
    (
      key: "semanticObjectKey" | "valueObjectId" | "activityEventId" | "factStatus",
      value: string
    ) => {
      setDraftFilters((currentFilters) => ({
        ...currentFilters,
        [key]: value,
      }));
    },
    []
  );

  const setDraftLimit = useCallback((value: number) => {
    setDraftFilters((currentFilters) => ({
      ...currentFilters,
      limit: value,
    }));
  }, []);

  const previewCorrectionAction = useCallback(
    (row: ActivityFactRow, action: CorrectionActionKey) => {
      setSelectedFact(row);
      setCorrectionPreview(buildCorrectionPreview(row, action));
    },
    []
  );

  const selectFactForPreview = useCallback((row: ActivityFactRow) => {
    setSelectedFact(row);
    setCorrectionPreview(null);
  }, []);

  const facts = loadState.status === "ready" ? loadState.data.facts ?? [] : [];
  const sideEffects =
    loadState.status === "ready"
      ? loadState.data.sideEffects
      : loadState.status === "error"
        ? loadState.data?.sideEffects
        : null;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Step 57 / 76 · Activity and Value Object links
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            Activity Facts table
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Таблица читает только <code>GET /api/activity/facts</code>.
            Activity ID ведёт на <code>/activity-today</code> с фильтром
            activityEventId, а VO ID ведёт на карточку Value Object. Correction
            actions остаются no-write preview.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshCurrentView}
          className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
        >
          Обновить текущий вид
        </button>
      </div>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              Фильтры
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Измени поля и нажми <strong>Применить фильтры</strong>. Кнопка
              <strong> Сбросить</strong> возвращает полный список с limit 50.
            </p>
          </div>

          {hasDraftChanges ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              Есть неприменённые изменения фильтров
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
              Фильтры применены
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Limit
            <select
              value={draftFilters.limit}
              onChange={(event) => setDraftLimit(Number(event.target.value))}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-800"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Semantic key
            <input
              value={draftFilters.semanticObjectKey}
              onChange={(event) =>
                setDraftTextFilter("semanticObjectKey", event.target.value)
              }
              placeholder="sleep / recovery / ..."
              className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-800"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Value Object ID
            <input
              value={draftFilters.valueObjectId}
              onChange={(event) =>
                setDraftTextFilter("valueObjectId", event.target.value)
              }
              placeholder="uuid"
              className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-800"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Activity ID
            <input
              value={draftFilters.activityEventId}
              onChange={(event) =>
                setDraftTextFilter("activityEventId", event.target.value)
              }
              placeholder="uuid"
              className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-800"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Status
            <select
              value={draftFilters.factStatus}
              onChange={(event) =>
                setDraftTextFilter("factStatus", event.target.value)
              }
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-800"
            >
              {FACT_STATUS_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={applyFilters}
            className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Применить фильтры
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-white"
          >
            Сбросить
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
          <div className="font-semibold text-slate-700">Активные фильтры</div>
          {activeFilterBadges.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {activeFilterBadges.map((filter) => (
                <span
                  key={`${filter.key}-${filter.value}`}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-700"
                >
                  {filter.label}: {filter.value}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-1">
              Нет дополнительных фильтров. Используется базовый limit{" "}
              {DEFAULT_LIMIT}.
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        <div className="font-mono">GET {requestUrl}</div>
        <div className="mt-1">
          sideEffects: dbWritesExecuted=
          {String(sideEffects?.dbWritesExecuted ?? false)}, sqlExecuted=
          {String(sideEffects?.sqlExecuted ?? false)}, openAiCallExecuted=
          {String(sideEffects?.openAiCallExecuted ?? false)}
        </div>
      </div>

      <div className="mt-4 rounded-3xl border border-indigo-200 bg-indigo-50 p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
              Linked fact preview · no-write
            </p>
            <h3 className="mt-1 text-lg font-semibold text-indigo-950">
              Selected fact preview
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-indigo-900">
              Выбери строку или нажми action-кнопку. Activity и Value Object
              links открывают существующие страницы, а correction action только
              формирует preview будущего contract.
            </p>
          </div>

          <div className="rounded-2xl border border-indigo-200 bg-white px-4 py-3 text-xs text-indigo-900">
            Links: activity → /activity-today, VO → /value-objects/{"{id}"}
          </div>
        </div>

        {selectedFact ? (
          <div className="mt-4 grid gap-3 text-xs text-indigo-950 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-indigo-100 bg-white p-3">
              <div className="font-semibold">factId</div>
              <div className="mt-1 font-mono">{compactId(selectedFact.factId)}</div>
            </div>
            <div className="rounded-2xl border border-indigo-100 bg-white p-3">
              <div className="font-semibold">activityEventId</div>
              <div className="mt-1">
                {renderLinkedCompactId(
                  selectedFact.activityEventId,
                  selectedActivityHref,
                  "Open activity event"
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-indigo-100 bg-white p-3">
              <div className="font-semibold">valueObjectId</div>
              <div className="mt-1">
                {renderLinkedCompactId(
                  selectedFact.valueObjectId,
                  selectedValueObjectHref,
                  "Open Value Object"
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-indigo-100 bg-white p-3">
              <div className="font-semibold">semanticObjectKey</div>
              <div className="mt-1">
                {selectedFact.semanticObjectKey ?? "—"}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-indigo-200 bg-white p-4 text-sm text-indigo-900">
            Fact ещё не выбран. После появления строк в таблице нажми
            <strong> Details</strong> или любую no-write action-кнопку.
          </div>
        )}

        {correctionPreview ? (
          <div className="mt-4 rounded-2xl border border-indigo-200 bg-white p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
                  Action preview
                </div>
                <div className="mt-1 text-sm font-semibold text-indigo-950">
                  {correctionPreview.label} → {correctionPreview.targetStatus}
                </div>
                <p className="mt-2 text-sm leading-6 text-indigo-900">
                  {correctionPreview.transitionHint}
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900">
                No-write preview only. Future write route is intentionally
                deferred.
              </div>
            </div>

            <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-50">
              {JSON.stringify(correctionPreview.noWritePayload, null, 2)}
            </pre>
          </div>
        ) : null}
      </div>

      {loadState.status === "loading" ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
          Загружаю facts…
        </div>
      ) : null}

      {loadState.status === "error" ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
          <div className="font-semibold">Не удалось загрузить Activity Facts</div>
          <div className="mt-1">
            HTTP: {loadState.statusCode ?? "unknown"} · {loadState.message}
          </div>
          {loadState.data?.errorCode ? (
            <div className="mt-2 font-mono text-xs">{loadState.data.errorCode}</div>
          ) : null}
        </div>
      ) : null}

      {loadState.status === "ready" && facts.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
          <div className="font-semibold text-slate-800">Saved facts пока нет.</div>
          <p className="mt-2">
            Endpoint работает, но для текущего пользователя и выбранных фильтров
            вернул <code> count: 0</code>. После реального сохранения facts через
            save gate новые строки должны появляться здесь.
          </p>
        </div>
      ) : null}

      {loadState.status === "ready" && facts.length > 0 ? (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">fact_id</th>
                <th className="px-4 py-3 font-semibold">activity_id</th>
                <th className="px-4 py-3 font-semibold">VO</th>
                <th className="px-4 py-3 font-semibold">semantic_key</th>
                <th className="px-4 py-3 font-semibold">measure</th>
                <th className="px-4 py-3 font-semibold">status</th>
                <th className="px-4 py-3 font-semibold">source</th>
                <th className="px-4 py-3 font-semibold">created_at</th>
                <th className="px-4 py-3 font-semibold">actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {facts.map((row, index) => {
                const activityHref = buildActivityEventHref(row.activityEventId);
                const valueObjectHref = buildValueObjectHref(row.valueObjectId);

                return (
                  <tr key={row.factId ?? `${row.activityEventId ?? "fact"}-${index}`}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {compactId(row.factId)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {renderLinkedCompactId(
                        row.activityEventId,
                        activityHref,
                        "Open activity event"
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {renderLinkedCompactId(
                        row.valueObjectId,
                        valueObjectHref,
                        "Open Value Object"
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.semanticObjectKey ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div>{formatMeasure(row)}</div>
                      {row.metricValueSource ? (
                        <div className="mt-1 text-xs text-slate-400">
                          {row.metricValueSource}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.factStatus ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.sourceType ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDateTime(row.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex min-w-[360px] flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => selectFactForPreview(row)}
                          className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Details
                        </button>
                        {CORRECTION_ACTIONS.map((action) => (
                          <button
                            key={action.key}
                            type="button"
                            onClick={() => previewCorrectionAction(row, action.key)}
                            className={getActionButtonClass(action.tone)}
                            title={`No-write preview: ${action.targetStatus}`}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {loadState.status === "ready" ? (
        <div className="mt-5 grid gap-3 text-xs text-slate-500 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="font-semibold text-slate-700">Rows</div>
            <div className="mt-1">{loadState.data.count ?? facts.length}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="font-semibold text-slate-700">Ownership rule</div>
            <div className="mt-1">
              {loadState.data.ownership?.rule ??
                "Authenticated user facts only."}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="font-semibold text-slate-700">Schema mode</div>
            <div className="mt-1">
              {loadState.data.schemaMode?.strategy ??
                "strict existing-column select"}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
