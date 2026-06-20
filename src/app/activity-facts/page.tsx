"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

type FactMetricValue = number | string | boolean | null;

type ActivityFact = {
  factId: string | null;
  userId: string | null;
  activityEventId: string | null;
  measureId: string | null;
  semanticObjectKey: string | null;
  valueObjectId: string | null;
  measureType: string | null;
  metricValue: FactMetricValue;
  metricValueSource: string | null;
  unit: string | null;
  factStatus: string | null;
  sourceType: string | null;
  confidence: number | null;
  performedByActorId: string | null;
  actingAsActorId: string | null;
  actingForActorId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type FactsApiResponse = {
  ok?: boolean;
  endpoint?: string;
  readStatus?: string;
  facts?: ActivityFact[];
  count?: number;
  filters?: Record<string, unknown>;
  ownership?: Record<string, unknown>;
  schemaMode?: Record<string, unknown>;
  sideEffects?: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
};

type LoadState =
  | {
      status: "idle" | "loading";
      message: string;
      response: FactsApiResponse | null;
    }
  | {
      status: "success" | "error";
      message: string;
      response: FactsApiResponse | null;
    };

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background: "#f1f5f9",
  padding: "24px",
};

const shellStyle: CSSProperties = {
  maxWidth: "1160px",
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: "18px",
};

const cardStyle: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: "24px",
  background: "#ffffff",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
};

const sectionPaddingStyle: CSSProperties = {
  padding: "20px",
};

const labelStyle: CSSProperties = {
  display: "block",
  marginBottom: "6px",
  fontSize: "11px",
  fontWeight: 850,
  letterSpacing: "0.12em",
  color: "#64748b",
  textTransform: "uppercase",
};

const inputStyle: CSSProperties = {
  width: "100%",
  minHeight: "40px",
  border: "1px solid #cbd5e1",
  borderRadius: "14px",
  padding: "0 12px",
  background: "#ffffff",
  color: "#0f172a",
  fontSize: "13px",
  outline: "none",
};

const primaryButtonStyle: CSSProperties = {
  minHeight: "40px",
  border: "1px solid #020617",
  borderRadius: "14px",
  padding: "0 16px",
  background: "#020617",
  color: "#ffffff",
  fontSize: "13px",
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  minHeight: "40px",
  border: "1px solid #cbd5e1",
  borderRadius: "14px",
  padding: "0 14px",
  background: "#ffffff",
  color: "#0f172a",
  fontSize: "13px",
  fontWeight: 750,
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const subtleButtonStyle: CSSProperties = {
  minHeight: "32px",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  padding: "0 10px",
  background: "#ffffff",
  color: "#334155",
  fontSize: "12px",
  fontWeight: 750,
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const monospaceStyle: CSSProperties = {
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
};

const factListStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
};

const factRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "minmax(170px, 1.15fr) minmax(135px, 0.9fr) minmax(130px, 0.72fr) minmax(120px, 0.62fr) minmax(108px, 0.55fr)",
  gap: "10px",
  alignItems: "center",
  border: "1px solid #e2e8f0",
  borderRadius: "18px",
  background: "#ffffff",
  padding: "12px",
};

const factRowSelectedStyle: CSSProperties = {
  ...factRowStyle,
  borderColor: "#bfdbfe",
  background: "#eff6ff",
};

const factRowHeaderStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "minmax(170px, 1.15fr) minmax(135px, 0.9fr) minmax(130px, 0.72fr) minmax(120px, 0.62fr) minmax(108px, 0.55fr)",
  gap: "10px",
  padding: "0 12px",
  color: "#64748b",
  fontSize: "10px",
  fontWeight: 900,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

const compactMetaStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  minWidth: 0,
};

const valueBadgeStyle: CSSProperties = {
  display: "inline-flex",
  minWidth: "42px",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "14px",
  background: "#eef2ff",
  color: "#1d4ed8",
  padding: "7px 10px",
  fontSize: "18px",
  fontWeight: 950,
};

function truncateMiddle(value: string | null, left = 8, right = 6) {
  if (!value) {
    return "—";
  }

  if (value.length <= left + right + 3) {
    return value;
  }

  return `${value.slice(0, left)}...${value.slice(-right)}`;
}

function formatMetricValue(value: FactMetricValue) {
  if (value === null || value === undefined) {
    return "—";
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return String(value);
}

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildQuery(params: {
  limit: string;
  semanticObjectKey: string;
  valueObjectId: string;
  activityEventId: string;
  factStatus: string;
}) {
  const search = new URLSearchParams();

  search.set("limit", params.limit || "50");

  if (params.semanticObjectKey.trim()) {
    search.set("semanticObjectKey", params.semanticObjectKey.trim());
  }

  if (params.valueObjectId.trim()) {
    search.set("valueObjectId", params.valueObjectId.trim());
  }

  if (params.activityEventId.trim()) {
    search.set("activityEventId", params.activityEventId.trim());
  }

  if (params.factStatus.trim()) {
    search.set("factStatus", params.factStatus.trim());
  }

  return `/api/activity/facts?${search.toString()}`;
}

function getStatusPillStyle(status: string | null): CSSProperties {
  if (status === "confirmed") {
    return {
      display: "inline-flex",
      width: "fit-content",
      alignItems: "center",
      borderRadius: "999px",
      background: "#dcfce7",
      color: "#166534",
      padding: "5px 9px",
      fontSize: "12px",
      fontWeight: 850,
    };
  }

  if (status === "rejected") {
    return {
      display: "inline-flex",
      width: "fit-content",
      alignItems: "center",
      borderRadius: "999px",
      background: "#fee2e2",
      color: "#991b1b",
      padding: "5px 9px",
      fontSize: "12px",
      fontWeight: 850,
    };
  }

  return {
    display: "inline-flex",
    width: "fit-content",
    alignItems: "center",
    borderRadius: "999px",
    background: "#f1f5f9",
    color: "#334155",
    padding: "5px 9px",
    fontSize: "12px",
    fontWeight: 850,
  };
}

function FactRow({
  fact,
  selected,
  onSelect,
}: {
  readonly fact: ActivityFact;
  readonly selected: boolean;
  readonly onSelect: () => void;
}) {
  return (
    <article style={selected ? factRowSelectedStyle : factRowStyle}>
      <div style={compactMetaStyle}>
        <div style={{ color: "#64748b", fontSize: "11px", fontWeight: 800 }}>
          Fact / Activity
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          <span
            title={fact.factId ?? undefined}
            style={{ ...monospaceStyle, color: "#0f172a", fontSize: "12px", fontWeight: 800 }}
          >
            F: {truncateMiddle(fact.factId, 6, 6)}
          </span>

          {fact.activityEventId ? (
            <Link
              href={`/activity-today?activityEventId=${encodeURIComponent(fact.activityEventId)}`}
              title={fact.activityEventId}
              style={{
                ...monospaceStyle,
                color: "#1d4ed8",
                fontSize: "12px",
                fontWeight: 850,
                textDecoration: "none",
              }}
            >
              A: {truncateMiddle(fact.activityEventId, 6, 6)}
            </Link>
          ) : (
            <span style={{ ...monospaceStyle, color: "#94a3b8", fontSize: "12px" }}>
              A: —
            </span>
          )}
        </div>

        <div style={{ color: "#64748b", fontSize: "12px" }}>
          {formatDate(fact.createdAt)}
        </div>
      </div>

      <div style={compactMetaStyle}>
        <div style={{ color: "#64748b", fontSize: "11px", fontWeight: 800 }}>
          Semantic
        </div>

        <div
          title={fact.semanticObjectKey ?? undefined}
          style={{
            ...monospaceStyle,
            color: "#0f172a",
            fontSize: "13px",
            fontWeight: 850,
            overflowWrap: "anywhere",
          }}
        >
          {fact.semanticObjectKey ?? "—"}
        </div>

        <div style={{ color: "#64748b", fontSize: "12px" }}>
          VO:{" "}
          {fact.valueObjectId ? (
            <Link
              href={`/value-objects/${encodeURIComponent(fact.valueObjectId)}`}
              title={fact.valueObjectId}
              style={{ color: "#1d4ed8", fontWeight: 800, textDecoration: "none" }}
            >
              {truncateMiddle(fact.valueObjectId, 6, 6)}
            </Link>
          ) : (
            "—"
          )}
        </div>
      </div>

      <div style={compactMetaStyle}>
        <div style={{ color: "#64748b", fontSize: "11px", fontWeight: 800 }}>
          Measure
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={valueBadgeStyle}>{formatMetricValue(fact.metricValue)}</span>
          <span style={{ color: "#0f172a", fontSize: "13px", fontWeight: 850 }}>
            {fact.unit ?? "—"}
          </span>
        </div>

        <div style={{ color: "#64748b", fontSize: "12px", fontWeight: 750 }}>
          {fact.measureType ?? "—"}
        </div>
      </div>

      <div style={compactMetaStyle}>
        <div style={{ color: "#64748b", fontSize: "11px", fontWeight: 800 }}>
          Status
        </div>

        <span style={getStatusPillStyle(fact.factStatus)}>
          {fact.factStatus ?? "—"}
        </span>

        <div style={{ color: "#64748b", fontSize: "12px" }}>
          {fact.sourceType ?? "—"}
        </div>
      </div>

      <div style={{ display: "grid", gap: "7px" }}>
        <button type="button" onClick={onSelect} style={subtleButtonStyle}>
          Details
        </button>

        <button
          type="button"
          onClick={onSelect}
          style={{
            ...subtleButtonStyle,
            borderColor: "#bbf7d0",
            color: "#166534",
          }}
        >
          Подтвердить
        </button>

        <button
          type="button"
          onClick={onSelect}
          style={{
            ...subtleButtonStyle,
            borderColor: "#fde68a",
            color: "#92400e",
          }}
        >
          Исправить
        </button>
      </div>
    </article>
  );
}

export default function ActivityFactsPage() {
  const [limit, setLimit] = useState("50");
  const [semanticObjectKey, setSemanticObjectKey] = useState("");
  const [valueObjectId, setValueObjectId] = useState("");
  const [activityEventId, setActivityEventId] = useState("");
  const [factStatus, setFactStatus] = useState("");
  const [selectedFactId, setSelectedFactId] = useState<string | null>(null);
  const [state, setState] = useState<LoadState>({
    status: "idle",
    message: "Факты ещё не загружены.",
    response: null,
  });

  const queryUrl = useMemo(() => {
    return buildQuery({
      limit,
      semanticObjectKey,
      valueObjectId,
      activityEventId,
      factStatus,
    });
  }, [limit, semanticObjectKey, valueObjectId, activityEventId, factStatus]);

  const facts = state.response?.facts ?? [];
  const selectedFact =
    facts.find((fact) => fact.factId === selectedFactId) ?? facts[0] ?? null;

  const loadFacts = useCallback(async () => {
    setState({
      status: "loading",
      message: "Загружаю факты активности...",
      response: state.response,
    });

    try {
      const response = await fetch(queryUrl, {
        method: "GET",
        credentials: "same-origin",
      });

      const json = (await response.json().catch(() => {
        return {
          ok: false,
          errorCode: "ACTIVITY_FACTS_RESPONSE_NOT_JSON",
          errorMessage: "Response was not valid JSON.",
        };
      })) as FactsApiResponse;

      if (!response.ok || json.ok !== true) {
        setState({
          status: "error",
          message:
            json.errorMessage ??
            `Не удалось загрузить факты. HTTP status: ${response.status}`,
          response: json,
        });

        return;
      }

      setState({
        status: "success",
        message:
          (json.count ?? json.facts?.length ?? 0) > 0
            ? "Факты загружены."
            : "Фактов для текущих фильтров пока нет.",
        response: json,
      });

      const nextFacts = json.facts ?? [];

      if (nextFacts.length > 0) {
        setSelectedFactId((current) => {
          if (current && nextFacts.some((fact) => fact.factId === current)) {
            return current;
          }

          return nextFacts[0]?.factId ?? null;
        });
      } else {
        setSelectedFactId(null);
      }
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : String(error),
        response: null,
      });
    }
  }, [queryUrl, state.response]);

  function resetFilters() {
    setLimit("50");
    setSemanticObjectKey("");
    setValueObjectId("");
    setActivityEventId("");
    setFactStatus("");
  }

  useEffect(() => {
    void loadFacts();
    // The first load intentionally runs once after page mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={pageStyle}>
      <div style={shellStyle}>
        <section style={cardStyle}>
          <div style={sectionPaddingStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "16px",
                alignItems: "flex-start",
                flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: 0, flex: "1 1 560px" }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "12px",
                    fontWeight: 900,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "#2563eb",
                  }}
                >
                  Activity facts · Step 13 / 81
                </p>

                <h1 style={{ margin: "10px 0 0 0", fontSize: "28px", color: "#020617" }}>
                  Таблица фактов активности
                </h1>

                <p
                  style={{
                    margin: "12px 0 0 0",
                    maxWidth: "820px",
                    color: "#475569",
                    lineHeight: 1.6,
                  }}
                >
                  Страница читает реальные сохранённые факты через{" "}
                  <code>GET /api/activity/facts</code>. Основная таблица заменена на
                  компактный список без горизонтальной прокрутки.
                </p>
              </div>

              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", flexWrap: "wrap" }}>
                <Link href="/activity-facts/save-test" style={secondaryButtonStyle}>
                  Save Test
                </Link>
                <Link href="/workspace" style={secondaryButtonStyle}>
                  Workspace
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section style={cardStyle}>
          <div style={sectionPaddingStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "21px", color: "#020617" }}>
                  Фильтры
                </h2>
                <p style={{ margin: "8px 0 0 0", color: "#475569" }}>
                  Измени поля и нажми <strong>Применить фильтры</strong>.
                </p>
              </div>

              <div
                style={{
                  alignSelf: "flex-start",
                  border: "1px solid #86efac",
                  borderRadius: "999px",
                  background: "#dcfce7",
                  color: "#166534",
                  padding: "8px 12px",
                  fontSize: "13px",
                  fontWeight: 800,
                }}
              >
                {state.status === "loading" ? "Загрузка..." : "Фильтры применены"}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "12px",
                marginTop: "18px",
              }}
            >
              <label>
                <span style={labelStyle}>Limit</span>
                <select
                  value={limit}
                  onChange={(event) => setLimit(event.target.value)}
                  style={inputStyle}
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </label>

              <label>
                <span style={labelStyle}>Semantic key</span>
                <input
                  value={semanticObjectKey}
                  onChange={(event) => setSemanticObjectKey(event.target.value)}
                  placeholder="watching_reels"
                  style={inputStyle}
                />
              </label>

              <label>
                <span style={labelStyle}>Value Object ID</span>
                <input
                  value={valueObjectId}
                  onChange={(event) => setValueObjectId(event.target.value)}
                  placeholder="uuid"
                  style={inputStyle}
                />
              </label>

              <label>
                <span style={labelStyle}>Activity ID</span>
                <input
                  value={activityEventId}
                  onChange={(event) => setActivityEventId(event.target.value)}
                  placeholder="uuid"
                  style={inputStyle}
                />
              </label>

              <label>
                <span style={labelStyle}>Status</span>
                <select
                  value={factStatus}
                  onChange={(event) => setFactStatus(event.target.value)}
                  style={inputStyle}
                >
                  <option value="">Все статусы</option>
                  <option value="confirmed">confirmed</option>
                  <option value="pending_review">pending_review</option>
                  <option value="rejected">rejected</option>
                  <option value="superseded">superseded</option>
                </select>
              </label>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "16px", flexWrap: "wrap" }}>
              <button type="button" onClick={loadFacts} style={primaryButtonStyle}>
                Применить фильтры
              </button>
              <button type="button" onClick={resetFilters} style={secondaryButtonStyle}>
                Сбросить
              </button>
            </div>

            <div
              style={{
                marginTop: "16px",
                border: "1px solid #e2e8f0",
                borderRadius: "18px",
                background: "#f8fafc",
                padding: "12px",
                color: "#334155",
                fontSize: "13px",
                overflowWrap: "anywhere",
              }}
            >
              <strong>GET</strong>{" "}
              <span style={monospaceStyle}>{queryUrl}</span>
              <br />
              <span>
                sideEffects: dbWritesExecuted=false, sqlExecuted=false,
                openAiCallExecuted=false
              </span>
            </div>
          </div>
        </section>

        <section
          style={{
            ...cardStyle,
            borderColor:
              state.status === "error"
                ? "#fecdd3"
                : state.status === "success"
                  ? "#bbf7d0"
                  : "#e2e8f0",
          }}
        >
          <div style={sectionPaddingStyle}>
            <h2 style={{ margin: 0, fontSize: "18px", color: "#020617" }}>
              Status
            </h2>
            <p
              style={{
                margin: "10px 0 0 0",
                color:
                  state.status === "error"
                    ? "#be123c"
                    : state.status === "success"
                      ? "#166534"
                      : "#475569",
                fontWeight: 800,
              }}
            >
              {state.message}
            </p>
          </div>
        </section>

        <section style={{ ...cardStyle, padding: "14px" }}>
          <div style={factRowHeaderStyle}>
            <span>IDs</span>
            <span>Semantic</span>
            <span>Measure</span>
            <span>Status</span>
            <span>Actions</span>
          </div>

          <div style={{ height: "10px" }} />

          <div style={factListStyle}>
            {facts.length === 0 ? (
              <div
                style={{
                  border: "1px dashed #cbd5e1",
                  borderRadius: "18px",
                  padding: "24px",
                  textAlign: "center",
                  color: "#64748b",
                  background: "#f8fafc",
                }}
              >
                Сохранённых фактов для текущих фильтров нет.
              </div>
            ) : (
              facts.map((fact) => (
                <FactRow
                  key={fact.factId ?? `${fact.activityEventId}-${fact.semanticObjectKey}`}
                  fact={fact}
                  selected={selectedFact?.factId === fact.factId}
                  onSelect={() => setSelectedFactId(fact.factId)}
                />
              ))
            )}
          </div>
        </section>

        <section style={cardStyle}>
          <div style={sectionPaddingStyle}>
            <p
              style={{
                margin: 0,
                fontSize: "12px",
                fontWeight: 900,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#4f46e5",
              }}
            >
              Linked fact preview · read-only actions
            </p>

            <h2 style={{ margin: "10px 0 0 0", fontSize: "22px", color: "#020617" }}>
              Selected fact preview
            </h2>

            {selectedFact ? (
              <div
                style={{
                  marginTop: "16px",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "12px",
                }}
              >
                <div style={{ border: "1px solid #e2e8f0", borderRadius: "16px", padding: "14px" }}>
                  <div style={labelStyle}>Type</div>
                  <strong>{selectedFact.measureType ?? "—"}</strong>
                </div>

                <div style={{ border: "1px solid #e2e8f0", borderRadius: "16px", padding: "14px" }}>
                  <div style={labelStyle}>Value</div>
                  <strong>{formatMetricValue(selectedFact.metricValue)}</strong>
                  <div style={{ marginTop: "4px", color: "#64748b", fontSize: "12px" }}>
                    {selectedFact.metricValueSource ?? "value source unknown"}
                  </div>
                </div>

                <div style={{ border: "1px solid #e2e8f0", borderRadius: "16px", padding: "14px" }}>
                  <div style={labelStyle}>Unit</div>
                  <strong>{selectedFact.unit ?? "—"}</strong>
                </div>

                <div style={{ border: "1px solid #e2e8f0", borderRadius: "16px", padding: "14px" }}>
                  <div style={labelStyle}>Semantic key</div>
                  <span style={{ ...monospaceStyle, overflowWrap: "anywhere" }}>
                    {selectedFact.semanticObjectKey ?? "—"}
                  </span>
                </div>

                <div style={{ border: "1px solid #e2e8f0", borderRadius: "16px", padding: "14px" }}>
                  <div style={labelStyle}>Status</div>
                  <strong>{selectedFact.factStatus ?? "—"}</strong>
                </div>

                <div style={{ border: "1px solid #e2e8f0", borderRadius: "16px", padding: "14px" }}>
                  <div style={labelStyle}>Created at</div>
                  <strong>{formatDate(selectedFact.createdAt)}</strong>
                </div>
              </div>
            ) : (
              <p style={{ marginTop: "16px", color: "#64748b" }}>
                Fact ещё не выбран. После появления строк нажми Details.
              </p>
            )}
          </div>
        </section>

        <section style={cardStyle}>
          <div
            style={{
              ...sectionPaddingStyle,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "14px",
            }}
          >
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "16px", padding: "14px" }}>
              <div style={labelStyle}>Rows</div>
              <strong>{state.response?.count ?? facts.length}</strong>
            </div>

            <div style={{ border: "1px solid #e2e8f0", borderRadius: "16px", padding: "14px" }}>
              <div style={labelStyle}>Ownership rule</div>
              <span>activity_object_facts.user_id equals authenticated app_users.id</span>
            </div>

            <div style={{ border: "1px solid #e2e8f0", borderRadius: "16px", padding: "14px" }}>
              <div style={labelStyle}>Schema mode</div>
              <span>value is read from value_numeric/value_text/value_boolean</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
