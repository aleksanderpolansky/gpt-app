"use client";

import { useState } from "react";
import type { CSSProperties } from "react";

type RouteGateBlockerForUi = {
  code?: string;
  severity?: string;
  message?: string;
};

type RouteGateMatchedTargetForUi = {
  found?: boolean;
  targetKey?: string | null;
  targetType?: string | null;
  status?: string | null;
  reason?: string | null;
};

type RouteGateForUi = {
  policy?: string;
  mode?: string;
  canExecuteRouteNow?: boolean;
  canWriteNow?: boolean;
  wouldWriteNow?: boolean;
  sqlAllowedNow?: boolean;
  supabaseInsertAllowedNow?: boolean;
  canCreateActivityEventNow?: boolean;
  canCreateCategoryResolutionNow?: boolean;
  canCreateValueObjectNow?: boolean;
  canCreateActivityValueObjectLinkNow?: boolean;
  canCreateStateDeltaNow?: boolean;
  canCreateStateFactNow?: boolean;
  canCreateStateSnapshotNow?: boolean;
  matchedPreviewTarget?: RouteGateMatchedTargetForUi;
  blockers?: RouteGateBlockerForUi[];
  requiredBeforeRealPersistence?: string[];
  allowedFutureWriteKinds?: string[];
  forbiddenWriteKinds?: string[];
  safetyNotes?: string[];
};

type RouteGateResponseForUi = {
  ok?: boolean;
  policy?: string;
  mode?: string;
  routeGate?: RouteGateForUi;
  writes?: Record<string, boolean>;
};

type SemanticRouteGatePanelProps = {
  inputText: string;
  durationMinutesText: string;
  inputLanguage: string;
};

const styles: Record<string, CSSProperties> = {
  section: {
    marginBottom: "18px",
  },
  sectionTitle: {
    margin: "0 0 10px 0",
    fontSize: "15px",
    color: "#f4f4f5",
  },
  panel: {
    border: "1px solid #27272a",
    borderRadius: "12px",
    padding: "12px",
    background: "#09090b",
    marginBottom: "12px",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "10px",
    marginBottom: "12px",
  },
  label: {
    display: "block",
    fontSize: "12px",
    color: "#a1a1aa",
    marginBottom: "6px",
  },
  input: {
    width: "100%",
    borderRadius: "10px",
    border: "1px solid #3f3f46",
    background: "#050607",
    color: "#f4f4f5",
    padding: "10px",
    fontSize: "13px",
  },
  select: {
    width: "100%",
    borderRadius: "10px",
    border: "1px solid #3f3f46",
    background: "#050607",
    color: "#f4f4f5",
    padding: "10px",
    fontSize: "13px",
  },
  button: {
    border: "1px solid #60a5fa",
    borderRadius: "10px",
    padding: "10px 12px",
    background: "#0f172a",
    color: "#bfdbfe",
    cursor: "pointer",
    fontWeight: 700,
    marginBottom: "12px",
  },
  buttonDisabled: {
    opacity: 0.55,
    cursor: "not-allowed",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(140px, 1fr))",
    gap: "10px",
    marginBottom: "12px",
  },
  card: {
    border: "1px solid #27272a",
    borderRadius: "12px",
    padding: "12px",
    background: "#050607",
  },
  cardValue: {
    fontSize: "18px",
    fontWeight: 800,
  },
  cardLabel: {
    marginTop: "4px",
    color: "#a1a1aa",
    fontSize: "12px",
  },
  tableWrap: {
    overflowX: "auto",
    border: "1px solid #27272a",
    borderRadius: "12px",
    marginBottom: "12px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13px",
  },
  th: {
    textAlign: "left",
    color: "#a1a1aa",
    background: "#111113",
    borderBottom: "1px solid #27272a",
    padding: "9px",
    whiteSpace: "nowrap",
  },
  td: {
    borderBottom: "1px solid #1f1f23",
    padding: "9px",
    verticalAlign: "top",
  },
  badge: {
    display: "inline-block",
    border: "1px solid #3f3f46",
    borderRadius: "999px",
    padding: "2px 8px",
    fontSize: "12px",
    color: "#d4d4d8",
    background: "#111113",
    whiteSpace: "nowrap",
  },
  safeBadge: {
    borderColor: "#166534",
    color: "#bbf7d0",
    background: "#052e16",
  },
  warningBadge: {
    borderColor: "#92400e",
    color: "#fde68a",
    background: "#2a1704",
  },
  blockingBadge: {
    borderColor: "#7f1d1d",
    color: "#fecaca",
    background: "#1f0a0a",
  },
  error: {
    marginBottom: "12px",
    border: "1px solid #7f1d1d",
    background: "#1f0a0a",
    color: "#fecaca",
    borderRadius: "10px",
    padding: "10px",
    fontSize: "13px",
  },
  muted: {
    color: "#a1a1aa",
  },
  list: {
    margin: 0,
    paddingLeft: "18px",
    color: "#d4d4d8",
    fontSize: "13px",
    lineHeight: 1.5,
  },
};

function parseDuration(value: string): number | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number.parseFloat(trimmed.replace(",", "."));

  return Number.isFinite(parsed) ? parsed : null;
}

function FalseIsSafeBadge({ value }: { value: boolean | undefined }) {
  const isTrue = value === true;

  return (
    <span
      style={{
        ...styles.badge,
        ...(isTrue ? styles.blockingBadge : styles.safeBadge),
      }}
    >
      {isTrue ? "true" : "false"}
    </span>
  );
}

function TrueIsSafeBadge({ value }: { value: boolean | undefined }) {
  const isTrue = value === true;

  return (
    <span
      style={{
        ...styles.badge,
        ...(isTrue ? styles.safeBadge : styles.warningBadge),
      }}
    >
      {isTrue ? "true" : "false"}
    </span>
  );
}

function SeverityBadge({ value }: { value: string | undefined }) {
  const style =
    value === "blocking"
      ? styles.blockingBadge
      : value === "warning"
        ? styles.warningBadge
        : styles.safeBadge;

  return <span style={{ ...styles.badge, ...style }}>{value ?? "—"}</span>;
}

function EmptyState({ text }: { text: string }) {
  return <div style={styles.muted}>{text}</div>;
}

export default function SemanticRouteGatePanel({
  inputText,
  durationMinutesText,
  inputLanguage,
}: SemanticRouteGatePanelProps) {
  const [requestedIntent, setRequestedIntent] = useState(
    "persist_value_object_candidate"
  );
  const [requestedTargetKey, setRequestedTargetKey] = useState(
    "vo:personal:child-learning-support"
  );
  const [requestedActionKey, setRequestedActionKey] = useState("");
  const [response, setResponse] = useState<RouteGateResponseForUi | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const routeGate = response?.routeGate ?? null;
  const blockers = routeGate?.blockers ?? [];
  const matchedTarget = routeGate?.matchedPreviewTarget ?? null;

  async function runRouteGate() {
    setIsLoading(true);
    setErrorText(null);

    try {
      const result = await fetch(
        "/api/activity/debug/semantic-v3-persistence-route-gate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
          },
          body: JSON.stringify({
            inputText,
            durationMinutes: parseDuration(durationMinutesText),
            inputLanguage,
            requestedIntent,
            requestedTargetKey,
            requestedActionKey:
              requestedActionKey.trim().length > 0
                ? requestedActionKey.trim()
                : null,
            userConfirmed: true,
            explicitWriteExecutionEnabled: false,
            sandboxContractOnly: true,
          }),
        }
      );

      if (!result.ok) {
        const text = await result.text();
        throw new Error(text || `Request failed with ${result.status}`);
      }

      const json = (await result.json()) as RouteGateResponseForUi;
      setResponse(json);
    } catch (error) {
      setErrorText(
        error instanceof Error ? error.message : "Unknown route gate error"
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={styles.section}>
      <h2 style={styles.sectionTitle}>Persistence route gate contract</h2>

      <div style={styles.panel}>
        <div style={styles.row}>
          <div>
            <label style={styles.label} htmlFor="route-gate-intent">
              requestedIntent
            </label>
            <select
              id="route-gate-intent"
              style={styles.select}
              value={requestedIntent}
              onChange={(event) => setRequestedIntent(event.target.value)}
            >
              <option value="persist_activity_event">persist_activity_event</option>
              <option value="persist_category_resolution">
                persist_category_resolution
              </option>
              <option value="persist_value_object_candidate">
                persist_value_object_candidate
              </option>
              <option value="persist_activity_value_object_link">
                persist_activity_value_object_link
              </option>
              <option value="persist_state_delta_candidate">
                persist_state_delta_candidate
              </option>
              <option value="execute_review_action">execute_review_action</option>
            </select>
          </div>

          <div>
            <label style={styles.label} htmlFor="route-gate-target">
              requestedTargetKey
            </label>
            <input
              id="route-gate-target"
              style={styles.input}
              value={requestedTargetKey}
              onChange={(event) => setRequestedTargetKey(event.target.value)}
            />
          </div>

          <div>
            <label style={styles.label} htmlFor="route-gate-action">
              requestedActionKey optional
            </label>
            <input
              id="route-gate-action"
              style={styles.input}
              value={requestedActionKey}
              onChange={(event) => setRequestedActionKey(event.target.value)}
              placeholder="review:..."
            />
          </div>
        </div>

        <button
          type="button"
          style={{
            ...styles.button,
            ...(isLoading ? styles.buttonDisabled : {}),
          }}
          disabled={isLoading}
          onClick={runRouteGate}
        >
          {isLoading
            ? "Running route gate contract..."
            : "Run route gate contract"}
        </button>

        {errorText ? <div style={styles.error}>{errorText}</div> : null}

        {!routeGate ? (
          <EmptyState text="Run route gate contract to see route-level blockers." />
        ) : (
          <>
            <div style={styles.grid}>
              <div style={styles.card}>
                <div style={styles.cardValue}>
                  <FalseIsSafeBadge value={routeGate.canWriteNow} />
                </div>
                <div style={styles.cardLabel}>canWriteNow</div>
              </div>
              <div style={styles.card}>
                <div style={styles.cardValue}>
                  <FalseIsSafeBadge value={routeGate.canExecuteRouteNow} />
                </div>
                <div style={styles.cardLabel}>canExecuteRouteNow</div>
              </div>
              <div style={styles.card}>
                <div style={styles.cardValue}>
                  <FalseIsSafeBadge value={routeGate.sqlAllowedNow} />
                </div>
                <div style={styles.cardLabel}>sqlAllowedNow</div>
              </div>
              <div style={styles.card}>
                <div style={styles.cardValue}>
                  <TrueIsSafeBadge value={matchedTarget?.found} />
                </div>
                <div style={styles.cardLabel}>matchedPreviewTarget</div>
              </div>
            </div>

            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>matched target</th>
                    <th style={styles.th}>type</th>
                    <th style={styles.th}>status</th>
                    <th style={styles.th}>reason</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={styles.td}>
                      {matchedTarget?.targetKey ?? "—"}
                    </td>
                    <td style={styles.td}>
                      {matchedTarget?.targetType ?? "—"}
                    </td>
                    <td style={styles.td}>
                      {matchedTarget?.status ?? "—"}
                    </td>
                    <td style={styles.td}>
                      {matchedTarget?.reason ?? "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 style={styles.sectionTitle}>Route blockers</h3>
            {blockers.length > 0 ? (
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>code</th>
                      <th style={styles.th}>severity</th>
                      <th style={styles.th}>message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blockers.map((blocker, index) => (
                      <tr key={`${blocker.code ?? "blocker"}-${index}`}>
                        <td style={styles.td}>{blocker.code ?? "—"}</td>
                        <td style={styles.td}>
                          <SeverityBadge value={blocker.severity} />
                        </td>
                        <td style={styles.td}>{blocker.message ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState text="No route blockers." />
            )}

            <h3 style={styles.sectionTitle}>Required before real persistence</h3>
            {routeGate.requiredBeforeRealPersistence &&
            routeGate.requiredBeforeRealPersistence.length > 0 ? (
              <ul style={styles.list}>
                {routeGate.requiredBeforeRealPersistence.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            ) : (
              <EmptyState text="No requirements listed." />
            )}

            <h3 style={{ ...styles.sectionTitle, marginTop: "12px" }}>
              Forbidden write kinds
            </h3>
            {routeGate.forbiddenWriteKinds &&
            routeGate.forbiddenWriteKinds.length > 0 ? (
              <ul style={styles.list}>
                {routeGate.forbiddenWriteKinds.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            ) : (
              <EmptyState text="No forbidden writes listed." />
            )}
          </>
        )}
      </div>
    </div>
  );
}
