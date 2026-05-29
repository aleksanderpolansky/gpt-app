"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";

import SemanticPersistenceGatePanel, {
  type SemanticPersistenceGateForUi,
} from "./SemanticPersistenceGatePanel";
import SemanticReviewActionsPanel, {
  type SemanticReviewActionCandidateForUi,
} from "./SemanticReviewActionsPanel";

type MetricCandidate = {
  metricKey?: string;
  value?: string | number | boolean | null;
  unit?: string | null;
  confidence?: number;
};

type CategoryCandidate = {
  candidateSlug?: string;
  candidateTitle?: string;
  semanticLayer?: string;
  categoryType?: string;
  confidence?: number;
  resolutionStatus?: string;
};

type ResolvedCategoryCandidate = {
  candidateSlug?: string;
  canonicalSlug?: string;
  semanticLayer?: string;
  categoryType?: string;
  resolutionStatus?: string;
  mappingStatus?: string;
  needsUserConfirmation?: boolean;
  confidence?: number;
};

type StateHookCandidate = {
  hookKey?: string;
  direction?: string;
  confidence?: number;
  notAStateFactYet?: boolean;
};

type ValueObjectCandidate = {
  candidateKey?: string;
  suggestedTitle?: string;
  role?: string;
  scope?: string;
  action?: string;
  confidence?: number;
  shouldCreateIfMissing?: boolean;
  shouldLinkActivity?: boolean;
  shouldTrackState?: boolean;
  needsUserConfirmation?: boolean;
  reasoning?: string;
};

type ExposureCandidate = {
  exposureKey?: string;
  activityLinkType?: string;
  valueObjectSuggestedTitle?: string;
  confidence?: number;
  expectedEffectDirection?: string;
  shouldCreateActivityLink?: boolean;
  shouldCreateStateDelta?: boolean;
  shouldCreateStateFact?: boolean;
  shouldCreateStateSnapshot?: boolean;
  needsUserConfirmation?: boolean;
  reasoning?: string;
};

type StateDeltaCandidate = {
  deltaKey?: string;
  dimensionKey?: string;
  kind?: string;
  targetValueObjectSuggestedTitle?: string;
  expectedDirection?: string;
  confidence?: number;
  shouldPersistNow?: boolean;
  eligibleForFutureStateDelta?: boolean;
  needsUserConfirmation?: boolean;
  notAStateFactYet?: boolean;
  notAStateSnapshotYet?: boolean;
  reasoning?: string;
};

type PreviewResponse = {
  ok?: boolean;
  endpoint?: string;
  pipeline?: string;
  mode?: string;
  reviewActionPolicy?: string;
  persistenceGatePolicy?: string;
  persistenceGate?: SemanticPersistenceGateForUi;
  semanticV3?: {
    metricCandidates?: MetricCandidate[];
    categoryCandidates?: CategoryCandidate[];
    resolvedCategoryCandidates?: ResolvedCategoryCandidate[];
    stateHookCandidates?: StateHookCandidate[];
    contractWarnings?: string[];
    contractErrors?: string[];
  };
  valueObjectCandidates?: ValueObjectCandidate[];
  exposureCandidates?: ExposureCandidate[];
  stateDeltaCandidates?: StateDeltaCandidate[];
  reviewActionCandidates?: SemanticReviewActionCandidateForUi[];
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
    gridTemplateColumns: "minmax(320px, 420px) 1fr",
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
    minHeight: "120px",
    resize: "vertical",
    borderRadius: "10px",
    border: "1px solid #3f3f46",
    background: "#050607",
    color: "#f4f4f5",
    padding: "10px",
    fontSize: "14px",
    lineHeight: 1.5,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    marginTop: "12px",
  },
  input: {
    width: "100%",
    borderRadius: "10px",
    border: "1px solid #3f3f46",
    background: "#050607",
    color: "#f4f4f5",
    padding: "10px",
    fontSize: "14px",
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
  error: {
    marginTop: "12px",
    border: "1px solid #7f1d1d",
    background: "#1f0a0a",
    color: "#fecaca",
    borderRadius: "10px",
    padding: "10px",
    fontSize: "13px",
  },
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(6, minmax(120px, 1fr))",
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
    fontSize: "24px",
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
  trueBadge: {
    borderColor: "#166534",
    color: "#bbf7d0",
    background: "#052e16",
  },
  falseBadge: {
    borderColor: "#3f3f46",
    color: "#d4d4d8",
    background: "#111113",
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
  muted: {
    color: "#a1a1aa",
  },
};

function formatNumber(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  return value.toFixed(2);
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return String(value);
}

function BoolBadge({ value }: { value: boolean | undefined }) {
  const isTrue = value === true;

  return (
    <span
      style={{
        ...styles.badge,
        ...(isTrue ? styles.trueBadge : styles.falseBadge),
      }}
    >
      {isTrue ? "true" : "false"}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div style={styles.muted}>{text}</div>;
}

export default function SemanticV3ReviewClient() {
  const [inputText, setInputText] = useState("учил ребёнка математике 30 минут");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [inputLanguage, setInputLanguage] = useState("ru");
  const [result, setResult] = useState<PreviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const metricCandidates = useMemo(
    () => result?.semanticV3?.metricCandidates ?? [],
    [result]
  );

  const categoryCandidates = useMemo(
    () => result?.semanticV3?.categoryCandidates ?? [],
    [result]
  );

  const resolvedCategoryCandidates = useMemo(
    () => result?.semanticV3?.resolvedCategoryCandidates ?? [],
    [result]
  );

  const stateHookCandidates = useMemo(
    () => result?.semanticV3?.stateHookCandidates ?? [],
    [result]
  );

  const valueObjectCandidates = useMemo(
    () => result?.valueObjectCandidates ?? [],
    [result]
  );

  const exposureCandidates = useMemo(
    () => result?.exposureCandidates ?? [],
    [result]
  );

  const stateDeltaCandidates = useMemo(
    () => result?.stateDeltaCandidates ?? [],
    [result]
  );

  const reviewActionCandidates = useMemo(
    () => result?.reviewActionCandidates ?? [],
    [result]
  );

  async function runPreview() {
    setIsLoading(true);
    setErrorText(null);

    try {
      const parsedDuration =
        durationMinutes.trim().length > 0
          ? Number.parseFloat(durationMinutes.replace(",", "."))
          : null;

      const response = await fetch("/api/activity/debug/semantic-v3-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          inputText,
          durationMinutes:
            parsedDuration !== null && Number.isFinite(parsedDuration)
              ? parsedDuration
              : null,
          inputLanguage,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Request failed with ${response.status}`);
      }

      const json = (await response.json()) as PreviewResponse;
      setResult(json);
    } catch (error) {
      setErrorText(
        error instanceof Error ? error.message : "Unknown preview error"
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main style={styles.shell}>
      <header style={styles.header}>
        <h1 style={styles.title}>Semantic Preview Review Card v0</h1>
        <p style={styles.subtitle}>
          Read-only UI for checking the chain: free text → categories → resolved
          bundle → Value Objects → exposures → state delta candidates → review
          actions.
        </p>
      </header>

      <div style={styles.grid}>
        <aside style={styles.panel}>
          <h2 style={styles.panelTitle}>Input</h2>

          <label style={styles.label} htmlFor="semantic-input">
            Activity text
          </label>
          <textarea
            id="semantic-input"
            style={styles.textarea}
            value={inputText}
            onChange={(event) => setInputText(event.target.value)}
          />

          <div style={styles.row}>
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

          <button
            type="button"
            style={{
              ...styles.button,
              ...(isLoading ? styles.buttonDisabled : {}),
            }}
            disabled={isLoading}
            onClick={runPreview}
          >
            {isLoading ? "Running preview..." : "Run read-only preview"}
          </button>

          {errorText ? <div style={styles.error}>{errorText}</div> : null}

          <div style={{ ...styles.section, marginTop: "18px" }}>
            <h3 style={styles.sectionTitle}>Write safety flags</h3>
            {result?.writes ? (
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <tbody>
                    {Object.entries(result.writes).map(([key, value]) => (
                      <tr key={key}>
                        <td style={styles.td}>{key}</td>
                        <td style={styles.td}>
                          <BoolBadge value={value} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState text="Run preview to see write flags." />
            )}
          </div>
        </aside>

        <section>
          <div style={styles.cards}>
            <div style={styles.card}>
              <div style={styles.cardValue}>{categoryCandidates.length}</div>
              <div style={styles.cardLabel}>category candidates</div>
            </div>
            <div style={styles.card}>
              <div style={styles.cardValue}>
                {resolvedCategoryCandidates.length}
              </div>
              <div style={styles.cardLabel}>resolved categories</div>
            </div>
            <div style={styles.card}>
              <div style={styles.cardValue}>{valueObjectCandidates.length}</div>
              <div style={styles.cardLabel}>VO candidates</div>
            </div>
            <div style={styles.card}>
              <div style={styles.cardValue}>{exposureCandidates.length}</div>
              <div style={styles.cardLabel}>exposures</div>
            </div>
            <div style={styles.card}>
              <div style={styles.cardValue}>{stateDeltaCandidates.length}</div>
              <div style={styles.cardLabel}>state deltas</div>
            </div>
            <div style={styles.card}>
              <div style={styles.cardValue}>{reviewActionCandidates.length}</div>
              <div style={styles.cardLabel}>review actions</div>
            </div>
          </div>

          <div style={styles.panel}>
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Metric candidates</h2>
              {metricCandidates.length > 0 ? (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>metricKey</th>
                        <th style={styles.th}>value</th>
                        <th style={styles.th}>unit</th>
                        <th style={styles.th}>confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metricCandidates.map((item, index) => (
                        <tr key={`${item.metricKey ?? "metric"}-${index}`}>
                          <td style={styles.td}>{item.metricKey ?? "—"}</td>
                          <td style={styles.td}>{formatValue(item.value)}</td>
                          <td style={styles.td}>{item.unit ?? "—"}</td>
                          <td style={styles.td}>
                            {formatNumber(item.confidence)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState text="No metric candidates yet." />
              )}
            </div>

            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Resolved category bundle</h2>
              {resolvedCategoryCandidates.length > 0 ? (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>candidateSlug</th>
                        <th style={styles.th}>layer</th>
                        <th style={styles.th}>type</th>
                        <th style={styles.th}>resolution</th>
                        <th style={styles.th}>mapping</th>
                        <th style={styles.th}>confirm?</th>
                        <th style={styles.th}>confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resolvedCategoryCandidates.map((item, index) => (
                        <tr key={`${item.candidateSlug ?? "category"}-${index}`}>
                          <td style={styles.td}>{item.candidateSlug ?? "—"}</td>
                          <td style={styles.td}>{item.semanticLayer ?? "—"}</td>
                          <td style={styles.td}>{item.categoryType ?? "—"}</td>
                          <td style={styles.td}>
                            {item.resolutionStatus ?? "—"}
                          </td>
                          <td style={styles.td}>{item.mappingStatus ?? "—"}</td>
                          <td style={styles.td}>
                            <BoolBadge value={item.needsUserConfirmation} />
                          </td>
                          <td style={styles.td}>
                            {formatNumber(item.confidence)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState text="No resolved categories yet." />
              )}
            </div>

            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>State hooks</h2>
              {stateHookCandidates.length > 0 ? (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>hookKey</th>
                        <th style={styles.th}>direction</th>
                        <th style={styles.th}>confidence</th>
                        <th style={styles.th}>not state fact?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stateHookCandidates.map((item, index) => (
                        <tr key={`${item.hookKey ?? "hook"}-${index}`}>
                          <td style={styles.td}>{item.hookKey ?? "—"}</td>
                          <td style={styles.td}>{item.direction ?? "—"}</td>
                          <td style={styles.td}>
                            {formatNumber(item.confidence)}
                          </td>
                          <td style={styles.td}>
                            <BoolBadge value={item.notAStateFactYet} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState text="No state hooks yet." />
              )}
            </div>

            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Value Object candidates</h2>
              {valueObjectCandidates.length > 0 ? (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>candidateKey</th>
                        <th style={styles.th}>title</th>
                        <th style={styles.th}>role</th>
                        <th style={styles.th}>scope</th>
                        <th style={styles.th}>action</th>
                        <th style={styles.th}>confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {valueObjectCandidates.map((item, index) => (
                        <tr key={`${item.candidateKey ?? "vo"}-${index}`}>
                          <td style={styles.td}>{item.candidateKey ?? "—"}</td>
                          <td style={styles.td}>{item.suggestedTitle ?? "—"}</td>
                          <td style={styles.td}>{item.role ?? "—"}</td>
                          <td style={styles.td}>{item.scope ?? "—"}</td>
                          <td style={styles.td}>{item.action ?? "—"}</td>
                          <td style={styles.td}>
                            {formatNumber(item.confidence)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState text="No Value Object candidates yet." />
              )}
            </div>

            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>
                Activity → VO exposure candidates
              </h2>
              {exposureCandidates.length > 0 ? (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>exposureKey</th>
                        <th style={styles.th}>link type</th>
                        <th style={styles.th}>VO title</th>
                        <th style={styles.th}>direction</th>
                        <th style={styles.th}>confidence</th>
                        <th style={styles.th}>create link?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exposureCandidates.map((item, index) => (
                        <tr key={`${item.exposureKey ?? "exposure"}-${index}`}>
                          <td style={styles.td}>{item.exposureKey ?? "—"}</td>
                          <td style={styles.td}>
                            {item.activityLinkType ?? "—"}
                          </td>
                          <td style={styles.td}>
                            {item.valueObjectSuggestedTitle ?? "—"}
                          </td>
                          <td style={styles.td}>
                            {item.expectedEffectDirection ?? "—"}
                          </td>
                          <td style={styles.td}>
                            {formatNumber(item.confidence)}
                          </td>
                          <td style={styles.td}>
                            <BoolBadge value={item.shouldCreateActivityLink} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState text="No exposure candidates yet." />
              )}
            </div>

            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>State delta candidates</h2>
              {stateDeltaCandidates.length > 0 ? (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>deltaKey</th>
                        <th style={styles.th}>dimension</th>
                        <th style={styles.th}>kind</th>
                        <th style={styles.th}>target VO</th>
                        <th style={styles.th}>persist now?</th>
                        <th style={styles.th}>not fact?</th>
                        <th style={styles.th}>confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stateDeltaCandidates.map((item, index) => (
                        <tr key={`${item.deltaKey ?? "delta"}-${index}`}>
                          <td style={styles.td}>{item.deltaKey ?? "—"}</td>
                          <td style={styles.td}>{item.dimensionKey ?? "—"}</td>
                          <td style={styles.td}>{item.kind ?? "—"}</td>
                          <td style={styles.td}>
                            {item.targetValueObjectSuggestedTitle ?? "—"}
                          </td>
                          <td style={styles.td}>
                            <BoolBadge value={item.shouldPersistNow} />
                          </td>
                          <td style={styles.td}>
                            <BoolBadge value={item.notAStateFactYet} />
                          </td>
                          <td style={styles.td}>
                            {formatNumber(item.confidence)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState text="No state delta candidates yet." />
              )}
            </div>

            <SemanticPersistenceGatePanel gate={result?.persistenceGate ?? null} />

            <SemanticReviewActionsPanel actions={reviewActionCandidates} />

            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Raw JSON</h2>
              {result ? (
                <pre style={styles.pre}>{JSON.stringify(result, null, 2)}</pre>
              ) : (
                <EmptyState text="Run preview to see full JSON." />
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}



