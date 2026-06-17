"use client";

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

type FetchFactsResult = {
  responseOk: boolean;
  statusCode: number;
  data: ActivityFactsResponse;
};

const DEFAULT_LIMIT = 50;

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

function buildQueryUrl(params: {
  limit: number;
  semanticObjectKey: string;
  valueObjectId: string;
  activityEventId: string;
  factStatus: string;
}) {
  const searchParams = new URLSearchParams();
  searchParams.set("limit", String(params.limit));

  if (params.semanticObjectKey.trim()) {
    searchParams.set("semanticObjectKey", params.semanticObjectKey.trim());
  }

  if (params.valueObjectId.trim()) {
    searchParams.set("valueObjectId", params.valueObjectId.trim());
  }

  if (params.activityEventId.trim()) {
    searchParams.set("activityEventId", params.activityEventId.trim());
  }

  if (params.factStatus.trim()) {
    searchParams.set("factStatus", params.factStatus.trim());
  }

  return `/api/activity/facts?${searchParams.toString()}`;
}

async function fetchActivityFacts(requestUrl: string): Promise<FetchFactsResult> {
  const response = await fetch(requestUrl, {
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

export function ActivityFactsTable() {
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [semanticObjectKey, setSemanticObjectKey] = useState("");
  const [valueObjectId, setValueObjectId] = useState("");
  const [activityEventId, setActivityEventId] = useState("");
  const [factStatus, setFactStatus] = useState("");
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });

  const requestUrl = useMemo(
    () =>
      buildQueryUrl({
        limit,
        semanticObjectKey,
        valueObjectId,
        activityEventId,
        factStatus,
      }),
    [activityEventId, factStatus, limit, semanticObjectKey, valueObjectId]
  );

  const loadFacts = useCallback(async () => {
    setLoadState({ status: "loading" });

    try {
      const result = await fetchActivityFacts(requestUrl);

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
  }, [requestUrl]);

  useEffect(() => {
    let isCurrent = true;

    async function loadInitialFacts() {
      try {
        const result = await fetchActivityFacts(requestUrl);

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
  }, [requestUrl]);

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
            Step 54 / 76 · Read-only UI
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            Activity Facts table
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Таблица читает только <code>GET /api/activity/facts</code>. Этот UI
            не выполняет запись, SQL или OpenAI-вызовы. Значение measure пока
            отображается по текущему fact read-model; расширение join с
            <code> activity_event_measures</code> остаётся для следующих шагов.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadFacts()}
          className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
        >
          Обновить таблицу
        </button>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Limit
          <select
            value={limit}
            onChange={(event) => setLimit(Number(event.target.value))}
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
            value={semanticObjectKey}
            onChange={(event) => setSemanticObjectKey(event.target.value)}
            placeholder="sleep / recovery / ..."
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-800"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Value Object ID
          <input
            value={valueObjectId}
            onChange={(event) => setValueObjectId(event.target.value)}
            placeholder="uuid"
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-800"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Activity ID
          <input
            value={activityEventId}
            onChange={(event) => setActivityEventId(event.target.value)}
            placeholder="uuid"
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-800"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Status
          <input
            value={factStatus}
            onChange={(event) => setFactStatus(event.target.value)}
            placeholder="active / confirmed / ..."
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-800"
          />
        </label>
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
            Endpoint работает, но для текущего пользователя вернул
            <code> count: 0</code>. После реального сохранения facts через save
            gate новые строки должны появляться здесь.
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {facts.map((row, index) => (
                <tr key={row.factId ?? `${row.activityEventId ?? "fact"}-${index}`}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">
                    {compactId(row.factId)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">
                    {compactId(row.activityEventId)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">
                    {compactId(row.valueObjectId)}
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
                </tr>
              ))}
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
