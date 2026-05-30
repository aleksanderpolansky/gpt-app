"use client";

import { useState } from "react";
import type { CSSProperties } from "react";

type BlockerForUi = {
  code?: string;
  severity?: string;
  message?: string;
};

type AuthenticatedContextForUi = {
  policy?: string;
  mode?: string;
  canTrustClientIdentity?: boolean;
  authenticatedUserAvailable?: boolean;
  actorAvailable?: boolean;
  rlsVerificationAvailable?: boolean;
  canResolveOwnerNow?: boolean;
  canOpenWriteGate?: boolean;
  clientProvided?: {
    authenticatedUserId?: string | null;
    actorId?: string | null;
    rlsVerificationToken?: string | null;
  };
  serverResolved?: {
    authenticatedUserId?: string | null;
    actorId?: string | null;
    rlsVerificationToken?: string | null;
  };
  blockers?: BlockerForUi[];
  requiredBeforeRealPersistence?: string[];
  safetyNotes?: string[];
};

type RouteGateForUi = {
  policy?: string;
  canWriteNow?: boolean;
  canExecuteRouteNow?: boolean;
  sqlAllowedNow?: boolean;
  supabaseInsertAllowedNow?: boolean;
  matchedPreviewTarget?: {
    found?: boolean;
    targetKey?: string | null;
    targetType?: string | null;
    status?: string | null;
    reason?: string | null;
  };
  blockers?: BlockerForUi[];
};

type DryRunForUi = {
  policy?: string;
  mode?: string;
  dryRunOnly?: boolean;
  canWriteNow?: boolean;
  sqlAllowedNow?: boolean;
  supabaseInsertAllowedNow?: boolean;
  authenticatedContext?: AuthenticatedContextForUi;
  routeGate?: RouteGateForUi;
  warnings?: string[];
  writes?: Record<string, boolean>;
  safetyNotes?: string[];
};

type DryRunResponseForUi = {
  ok?: boolean;
  endpoint?: string;
  policy?: string;
  authenticatedContextPolicy?: string;
  dryRun?: DryRunForUi;
  writes?: Record<string, boolean>;
};

const styles: Record<string, CSSProperties> = {
  shell: {
    minHeight: "100vh",
    background: "#050607",
    color: "#f4f4f5",
    padding: "24px",
    fontFamily:
      "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  },
  header: {
    border: "1px solid #2a2f3a",
    borderRadius: "14px",
    padding: "18px",
    background:
      "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(3,7,18,0.95))",
    marginBottom: "18px",
  },
  title: {
    margin: 0,
    fontSize: "24px",
    lineHeight: 1.2,
  },
  subtitle: {
    marginTop: "8px",
    marginBottom: 0,
    color: "#a1a1aa",
    fontSize: "14px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "minmax(340px, 460px) 1fr",
    gap: "18px",
    alignItems: "start",
  },
  panel: {
    border: "1px solid #27272a",
    borderRadius: "14px",
    background: "#0a0a0b",
    padding: "16px",
    boxShadow: "0 12px 32px rgba(0,0,0,0.25)",
  },
  panelTitle: {
    margin: "0 0 12px 0",
    fontSize: "15px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#d4d4d8",
  },
  label: {
    display: "block",
    fontSize: "12px",
    color: "#a1a1aa",
    marginBottom: "6px",
  },
  textarea: {
    width: "100%",
    minHeight: "110px",
    resize: "vertical",
    borderRadius: "10px",
    border: "1px solid #3f3f46",
    background: "#050607",
    color: "#f4f4f5",
    padding: "10px",
    fontSize: "14px",
    lineHeight: 1.5,
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
  row2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    marginTop: "12px",
  },
  row1: {
    marginTop: "12px",
  },
  checkboxRow: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    marginTop: "12px",
    color: "#d4d4d8",
    fontSize: "13px",
  },
  button: {
    width: "100%",
    marginTop: "14px",
    border: "1px solid #60a5fa",
    borderRadius: "10px",
    padding: "11px 12px",
    background: "#0f172a",
    color: "#bfdbfe",
    cursor: "pointer",
    fontWeight: 700,
  },
  buttonDisabled: {
    opacity: 0.55,
    cursor: "not-allowed",
  },
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(140px, 1fr))",
    gap: "10px",
    marginBottom: "18px",
  },
  card: {
    border: "1px solid #27272a",
    borderRadius: "12px",
    padding: "12px",
    background: "#09090b",
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
  section: {
    marginBottom: "18px",
  },
  sectionTitle: {
    margin: "0 0 10px 0",
    fontSize: "15px",
    color: "#f4f4f5",
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
    marginTop: "12px",
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
  pre: {
    maxHeight: "360px",
    overflow: "auto",
    background: "#050607",
    border: "1px solid #27272a",
    borderRadius: "12px",
    padding: "12px",
    fontSize: "12px",
    lineHeight: 1.45,
    whiteSpace: "pre-wrap",
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

function BlockersTable({
  title,
  blockers,
}: {
  title: string;
  blockers: BlockerForUi[];
}) {
  return (
    <div style={styles.section}>
      <h2 style={styles.sectionTitle}>{title}</h2>

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
        <div style={styles.muted}>No blockers.</div>
      )}
    </div>
  );
}

function KeyValueTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, string | boolean | null | undefined]>;
}) {
  return (
    <div style={styles.section}>
      <h2 style={styles.sectionTitle}>{title}</h2>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <tbody>
            {rows.map(([key, value]) => (
              <tr key={key}>
                <td style={styles.td}>{key}</td>
                <td style={styles.td}>
                  {typeof value === "boolean" ? (
                    <FalseIsSafeBadge value={value} />
                  ) : (
                    String(value ?? "—")
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SemanticDryRunReviewClient() {
  const [inputText, setInputText] = useState("учил ребёнка математике 30 минут");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [inputLanguage, setInputLanguage] = useState("ru");
  const [requestedIntent, setRequestedIntent] = useState(
    "persist_value_object_candidate"
  );
  const [requestedTargetKey, setRequestedTargetKey] = useState(
    "vo:personal:child-learning-support"
  );
  const [authenticatedUserId, setAuthenticatedUserId] = useState(
    "client-user-untrusted"
  );
  const [actorId, setActorId] = useState("client-actor-untrusted");
  const [rlsVerificationToken, setRlsVerificationToken] = useState(
    "client-rls-token-untrusted"
  );
  const [userConfirmed, setUserConfirmed] = useState(true);
  const [explicitWriteExecutionEnabled, setExplicitWriteExecutionEnabled] =
    useState(true);

  const [result, setResult] = useState<DryRunResponseForUi | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const dryRun = result?.dryRun ?? null;
  const authenticatedContext = dryRun?.authenticatedContext ?? null;
  const routeGate = dryRun?.routeGate ?? null;

  async function runDryRun() {
    setIsLoading(true);
    setErrorText(null);

    try {
      const response = await fetch("/api/activity/semantic/persistence-dry-run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          inputText,
          durationMinutes: parseDuration(durationMinutes),
          inputLanguage,
          requestedIntent,
          requestedTargetKey,
          userConfirmed,
          explicitWriteExecutionEnabled,
          authenticatedUserId,
          actorId,
          rlsVerificationToken,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Request failed with ${response.status}`);
      }

      const json = (await response.json()) as DryRunResponseForUi;
      setResult(json);
    } catch (error) {
      setErrorText(
        error instanceof Error ? error.message : "Unknown dry-run error"
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main style={styles.shell}>
      <header style={styles.header}>
        <h1 style={styles.title}>Authenticated Dry-Run Context Review</h1>
        <p style={styles.subtitle}>
          Non-debug dry-run route: client identity is displayed as untrusted;
          write gate stays closed until future server-side auth, actor resolution
          and RLS verification.
        </p>
      </header>

      <div style={styles.grid}>
        <aside style={styles.panel}>
          <h2 style={styles.panelTitle}>Dry-run input</h2>

          <label style={styles.label} htmlFor="activity-input">
            Activity text
          </label>
          <textarea
            id="activity-input"
            style={styles.textarea}
            value={inputText}
            onChange={(event) => setInputText(event.target.value)}
          />

          <div style={styles.row2}>
            <div>
              <label style={styles.label} htmlFor="duration">
                Duration minutes
              </label>
              <input
                id="duration"
                style={styles.input}
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(event.target.value)}
              />
            </div>

            <div>
              <label style={styles.label} htmlFor="language">
                Language
              </label>
              <input
                id="language"
                style={styles.input}
                value={inputLanguage}
                onChange={(event) => setInputLanguage(event.target.value)}
              />
            </div>
          </div>

          <div style={styles.row1}>
            <label style={styles.label} htmlFor="intent">
              requestedIntent
            </label>
            <select
              id="intent"
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

          <div style={styles.row1}>
            <label style={styles.label} htmlFor="target">
              requestedTargetKey
            </label>
            <input
              id="target"
              style={styles.input}
              value={requestedTargetKey}
              onChange={(event) => setRequestedTargetKey(event.target.value)}
            />
          </div>

          <div style={styles.row1}>
            <label style={styles.label} htmlFor="auth-user">
              client-provided authenticatedUserId
            </label>
            <input
              id="auth-user"
              style={styles.input}
              value={authenticatedUserId}
              onChange={(event) => setAuthenticatedUserId(event.target.value)}
            />
          </div>

          <div style={styles.row1}>
            <label style={styles.label} htmlFor="actor">
              client-provided actorId
            </label>
            <input
              id="actor"
              style={styles.input}
              value={actorId}
              onChange={(event) => setActorId(event.target.value)}
            />
          </div>

          <div style={styles.row1}>
            <label style={styles.label} htmlFor="rls">
              client-provided rlsVerificationToken
            </label>
            <input
              id="rls"
              style={styles.input}
              value={rlsVerificationToken}
              onChange={(event) => setRlsVerificationToken(event.target.value)}
            />
          </div>

          <label style={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={userConfirmed}
              onChange={(event) => setUserConfirmed(event.target.checked)}
            />
            userConfirmed
          </label>

          <label style={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={explicitWriteExecutionEnabled}
              onChange={(event) =>
                setExplicitWriteExecutionEnabled(event.target.checked)
              }
            />
            client requests explicitWriteExecutionEnabled
          </label>

          <button
            type="button"
            style={{
              ...styles.button,
              ...(isLoading ? styles.buttonDisabled : {}),
            }}
            disabled={isLoading}
            onClick={runDryRun}
          >
            {isLoading ? "Running dry-run..." : "Run authenticated dry-run"}
          </button>

          {errorText ? <div style={styles.error}>{errorText}</div> : null}
        </aside>

        <section>
          <div style={styles.cards}>
            <div style={styles.card}>
              <div style={styles.cardValue}>
                <TrueIsSafeBadge value={dryRun?.dryRunOnly} />
              </div>
              <div style={styles.cardLabel}>dryRunOnly</div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardValue}>
                <FalseIsSafeBadge value={dryRun?.canWriteNow} />
              </div>
              <div style={styles.cardLabel}>canWriteNow</div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardValue}>
                <FalseIsSafeBadge
                  value={authenticatedContext?.canOpenWriteGate}
                />
              </div>
              <div style={styles.cardLabel}>canOpenWriteGate</div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardValue}>
                <FalseIsSafeBadge
                  value={authenticatedContext?.canTrustClientIdentity}
                />
              </div>
              <div style={styles.cardLabel}>canTrustClientIdentity</div>
            </div>
          </div>

          <div style={styles.panel}>
            {!dryRun ? (
              <div style={styles.muted}>
                Run dry-run to see authenticated context and route gate.
              </div>
            ) : (
              <>
                <KeyValueTable
                  title="Authenticated context"
                  rows={[
                    ["policy", authenticatedContext?.policy],
                    ["mode", authenticatedContext?.mode],
                    [
                      "authenticatedUserAvailable",
                      authenticatedContext?.authenticatedUserAvailable,
                    ],
                    ["actorAvailable", authenticatedContext?.actorAvailable],
                    [
                      "rlsVerificationAvailable",
                      authenticatedContext?.rlsVerificationAvailable,
                    ],
                    ["canResolveOwnerNow", authenticatedContext?.canResolveOwnerNow],
                    ["canOpenWriteGate", authenticatedContext?.canOpenWriteGate],
                    [
                      "canTrustClientIdentity",
                      authenticatedContext?.canTrustClientIdentity,
                    ],
                    [
                      "client authenticatedUserId",
                      authenticatedContext?.clientProvided?.authenticatedUserId,
                    ],
                    ["client actorId", authenticatedContext?.clientProvided?.actorId],
                    [
                      "client rlsVerificationToken",
                      authenticatedContext?.clientProvided?.rlsVerificationToken,
                    ],
                  ]}
                />

                <BlockersTable
                  title="Authenticated context blockers"
                  blockers={authenticatedContext?.blockers ?? []}
                />

                <KeyValueTable
                  title="Route gate"
                  rows={[
                    ["policy", routeGate?.policy],
                    ["canWriteNow", routeGate?.canWriteNow],
                    ["canExecuteRouteNow", routeGate?.canExecuteRouteNow],
                    ["sqlAllowedNow", routeGate?.sqlAllowedNow],
                    [
                      "supabaseInsertAllowedNow",
                      routeGate?.supabaseInsertAllowedNow,
                    ],
                    [
                      "matchedPreviewTarget",
                      routeGate?.matchedPreviewTarget?.found,
                    ],
                    [
                      "matched targetKey",
                      routeGate?.matchedPreviewTarget?.targetKey,
                    ],
                  ]}
                />

                <BlockersTable
                  title="Route gate blockers"
                  blockers={routeGate?.blockers ?? []}
                />

                <div style={styles.section}>
                  <h2 style={styles.sectionTitle}>Warnings</h2>
                  {dryRun.warnings && dryRun.warnings.length > 0 ? (
                    <ul style={styles.list}>
                      {dryRun.warnings.map((warning, index) => (
                        <li key={`${warning}-${index}`}>{warning}</li>
                      ))}
                    </ul>
                  ) : (
                    <div style={styles.muted}>No warnings.</div>
                  )}
                </div>

                <KeyValueTable
                  title="Write flags"
                  rows={Object.entries(dryRun.writes ?? {})}
                />

                <div style={styles.section}>
                  <h2 style={styles.sectionTitle}>Raw JSON</h2>
                  <pre style={styles.pre}>
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
