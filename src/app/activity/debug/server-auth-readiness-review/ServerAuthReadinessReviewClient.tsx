"use client";

import { useState } from "react";
import type { CSSProperties } from "react";

type BlockerForUi = {
  code?: string;
  severity?: string;
  message?: string;
};

type ServerAuthGateForUi = {
  policy?: string;
  mode?: string;
  readyForRealPersistence?: boolean;
  canOpenWriteGate?: boolean;
  canTrustClientIdentity?: boolean;
  canResolveOwnerNow?: boolean;
  serverAuthenticatedUserAvailable?: boolean;
  serverActorResolutionAvailable?: boolean;
  serverOrganizationResolutionAvailable?: boolean;
  serverRlsVerificationAvailable?: boolean;
  serverWriteGateAvailable?: boolean;
  sqlAllowedNow?: boolean;
  supabaseInsertAllowedNow?: boolean;
  canCreateActivityEventNow?: boolean;
  canCreateValueObjectNow?: boolean;
  canCreateActivityValueObjectLinkNow?: boolean;
  canCreateStateDeltaNow?: boolean;
  canCreateStateFactNow?: boolean;
  clientProvided?: {
    authenticatedUserId?: string | null;
    actorId?: string | null;
    organizationId?: string | null;
    rlsVerificationToken?: string | null;
    requestedIntent?: string | null;
    requestedTargetKey?: string | null;
  };
  serverResolved?: {
    authenticatedUserId?: string | null;
    actorId?: string | null;
    organizationId?: string | null;
    rlsVerificationToken?: string | null;
    ownerScope?: string | null;
  };
  blockers?: BlockerForUi[];
  requiredBeforeRealPersistence?: string[];
  futureIntegrationChecklist?: string[];
  forbiddenShortcuts?: string[];
  writes?: Record<string, boolean>;
  safetyNotes?: string[];
};

type ServerAuthResponseForUi = {
  ok?: boolean;
  endpoint?: string;
  policy?: string;
  mode?: string;
  gate?: ServerAuthGateForUi;
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
    lineHeight: 1.5,
  },
  layout: {
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
  row: {
    marginTop: "12px",
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

function SeverityBadge({ value }: { value: string | undefined }) {
  const style =
    value === "blocking"
      ? styles.blockingBadge
      : value === "warning"
        ? styles.warningBadge
        : styles.safeBadge;

  return <span style={{ ...styles.badge, ...style }}>{value ?? "—"}</span>;
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

function BlockersTable({
  blockers,
}: {
  blockers: BlockerForUi[];
}) {
  return (
    <div style={styles.section}>
      <h2 style={styles.sectionTitle}>Blockers</h2>

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

function ListSection({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div style={styles.section}>
      <h2 style={styles.sectionTitle}>{title}</h2>

      {items.length > 0 ? (
        <ul style={styles.list}>
          {items.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <div style={styles.muted}>No items.</div>
      )}
    </div>
  );
}

export default function ServerAuthReadinessReviewClient() {
  const [authenticatedUserId, setAuthenticatedUserId] = useState(
    "client-user-untrusted"
  );
  const [actorId, setActorId] = useState("client-actor-untrusted");
  const [organizationId, setOrganizationId] = useState(
    "client-organization-untrusted"
  );
  const [rlsVerificationToken, setRlsVerificationToken] = useState(
    "client-rls-token-untrusted"
  );
  const [requestedIntent, setRequestedIntent] = useState(
    "persist_value_object_candidate"
  );
  const [requestedTargetKey, setRequestedTargetKey] = useState(
    "vo:personal:child-learning-support"
  );

  const [result, setResult] = useState<ServerAuthResponseForUi | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const gate = result?.gate ?? null;

  async function runGate() {
    setIsLoading(true);
    setErrorText(null);

    try {
      const response = await fetch(
        "/api/activity/semantic/server-auth-readiness",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
          },
          body: JSON.stringify({
            authenticatedUserId,
            actorId,
            organizationId,
            rlsVerificationToken,
            requestedIntent,
            requestedTargetKey,
          }),
        }
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Request failed with ${response.status}`);
      }

      const json = (await response.json()) as ServerAuthResponseForUi;
      setResult(json);
    } catch (error) {
      setErrorText(
        error instanceof Error
          ? error.message
          : "Unknown server-auth readiness error"
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main style={styles.shell}>
      <header style={styles.header}>
        <h1 style={styles.title}>Server Auth Readiness Gate</h1>
        <p style={styles.subtitle}>
          Read-only design gate for future semantic persistence. Client-provided
          identity is displayed as untrusted. The write gate remains closed until
          real server-side auth, actor resolution and RLS verification are proven.
        </p>
      </header>

      <div style={styles.layout}>
        <aside style={styles.panel}>
          <h2 style={styles.panelTitle}>Client diagnostic input</h2>

          <div style={styles.row}>
            <label style={styles.label} htmlFor="auth-user">
              authenticatedUserId from client body
            </label>
            <input
              id="auth-user"
              style={styles.input}
              value={authenticatedUserId}
              onChange={(event) => setAuthenticatedUserId(event.target.value)}
            />
          </div>

          <div style={styles.row}>
            <label style={styles.label} htmlFor="actor">
              actorId from client body
            </label>
            <input
              id="actor"
              style={styles.input}
              value={actorId}
              onChange={(event) => setActorId(event.target.value)}
            />
          </div>

          <div style={styles.row}>
            <label style={styles.label} htmlFor="organization">
              organizationId from client body
            </label>
            <input
              id="organization"
              style={styles.input}
              value={organizationId}
              onChange={(event) => setOrganizationId(event.target.value)}
            />
          </div>

          <div style={styles.row}>
            <label style={styles.label} htmlFor="rls">
              rlsVerificationToken from client body
            </label>
            <input
              id="rls"
              style={styles.input}
              value={rlsVerificationToken}
              onChange={(event) => setRlsVerificationToken(event.target.value)}
            />
          </div>

          <div style={styles.row}>
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

          <div style={styles.row}>
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

          <button
            type="button"
            style={{
              ...styles.button,
              ...(isLoading ? styles.buttonDisabled : {}),
            }}
            disabled={isLoading}
            onClick={runGate}
          >
            {isLoading ? "Running readiness gate..." : "Run readiness gate"}
          </button>

          {errorText ? <div style={styles.error}>{errorText}</div> : null}
        </aside>

        <section>
          <div style={styles.cards}>
            <div style={styles.card}>
              <div style={styles.cardValue}>
                <FalseIsSafeBadge value={gate?.readyForRealPersistence} />
              </div>
              <div style={styles.cardLabel}>readyForRealPersistence</div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardValue}>
                <FalseIsSafeBadge value={gate?.canOpenWriteGate} />
              </div>
              <div style={styles.cardLabel}>canOpenWriteGate</div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardValue}>
                <FalseIsSafeBadge value={gate?.canTrustClientIdentity} />
              </div>
              <div style={styles.cardLabel}>canTrustClientIdentity</div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardValue}>
                <FalseIsSafeBadge value={gate?.serverRlsVerificationAvailable} />
              </div>
              <div style={styles.cardLabel}>serverRlsVerificationAvailable</div>
            </div>
          </div>

          <div style={styles.panel}>
            {!gate ? (
              <div style={styles.muted}>
                Run readiness gate to see server-auth blockers.
              </div>
            ) : (
              <>
                <KeyValueTable
                  title="Gate status"
                  rows={[
                    ["policy", gate.policy],
                    ["mode", gate.mode],
                    ["readyForRealPersistence", gate.readyForRealPersistence],
                    ["canOpenWriteGate", gate.canOpenWriteGate],
                    ["canTrustClientIdentity", gate.canTrustClientIdentity],
                    ["canResolveOwnerNow", gate.canResolveOwnerNow],
                    [
                      "serverAuthenticatedUserAvailable",
                      gate.serverAuthenticatedUserAvailable,
                    ],
                    [
                      "serverActorResolutionAvailable",
                      gate.serverActorResolutionAvailable,
                    ],
                    [
                      "serverOrganizationResolutionAvailable",
                      gate.serverOrganizationResolutionAvailable,
                    ],
                    [
                      "serverRlsVerificationAvailable",
                      gate.serverRlsVerificationAvailable,
                    ],
                    ["serverWriteGateAvailable", gate.serverWriteGateAvailable],
                    ["sqlAllowedNow", gate.sqlAllowedNow],
                    ["supabaseInsertAllowedNow", gate.supabaseInsertAllowedNow],
                    ["canCreateStateFactNow", gate.canCreateStateFactNow],
                  ]}
                />

                <KeyValueTable
                  title="Client-provided values are untrusted"
                  rows={[
                    [
                      "client authenticatedUserId",
                      gate.clientProvided?.authenticatedUserId,
                    ],
                    ["client actorId", gate.clientProvided?.actorId],
                    ["client organizationId", gate.clientProvided?.organizationId],
                    [
                      "client rlsVerificationToken",
                      gate.clientProvided?.rlsVerificationToken,
                    ],
                    ["requestedIntent", gate.clientProvided?.requestedIntent],
                    ["requestedTargetKey", gate.clientProvided?.requestedTargetKey],
                  ]}
                />

                <KeyValueTable
                  title="Server-resolved values"
                  rows={[
                    [
                      "server authenticatedUserId",
                      gate.serverResolved?.authenticatedUserId,
                    ],
                    ["server actorId", gate.serverResolved?.actorId],
                    ["server organizationId", gate.serverResolved?.organizationId],
                    [
                      "server rlsVerificationToken",
                      gate.serverResolved?.rlsVerificationToken,
                    ],
                    ["ownerScope", gate.serverResolved?.ownerScope],
                  ]}
                />

                <BlockersTable blockers={gate.blockers ?? []} />

                <ListSection
                  title="Required before real persistence"
                  items={gate.requiredBeforeRealPersistence ?? []}
                />

                <ListSection
                  title="Future integration checklist"
                  items={gate.futureIntegrationChecklist ?? []}
                />

                <ListSection
                  title="Forbidden shortcuts"
                  items={gate.forbiddenShortcuts ?? []}
                />

                <KeyValueTable
                  title="Write flags"
                  rows={Object.entries(gate.writes ?? {})}
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
