"use client";

import type { CSSProperties } from "react";

export type SemanticReviewActionCandidateForUi = {
  actionKey?: string;
  actionKind?: string;
  label?: string;
  targetType?: string;
  targetKey?: string;
  targetTitle?: string;
  riskLevel?: string;
  enabledInReadOnly?: boolean;
  wouldWriteNow?: boolean;
  requiresUserInput?: boolean;
  requiresPersistenceGate?: boolean;
  confidence?: number | null;
  reasoning?: string;
  safetyNotes?: string[];
};

type SemanticReviewActionsPanelProps = {
  actions: SemanticReviewActionCandidateForUi[];
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
  readOnlyBadge: {
    borderColor: "#166534",
    color: "#bbf7d0",
    background: "#052e16",
  },
  warningBadge: {
    borderColor: "#92400e",
    color: "#fde68a",
    background: "#2a1704",
  },
  dangerBadge: {
    borderColor: "#7f1d1d",
    color: "#fecaca",
    background: "#1f0a0a",
  },
  safeFalseBadge: {
    borderColor: "#166534",
    color: "#bbf7d0",
    background: "#052e16",
  },
  unsafeTrueBadge: {
    borderColor: "#7f1d1d",
    color: "#fecaca",
    background: "#1f0a0a",
  },
  muted: {
    color: "#a1a1aa",
  },
};

function formatNumber(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  return value.toFixed(2);
}

function RiskBadge({ value }: { value: string | undefined }) {
  const riskStyle =
    value === "read_only"
      ? styles.readOnlyBadge
      : value === "requires_user_confirmation"
        ? styles.warningBadge
        : styles.dangerBadge;

  return <span style={{ ...styles.badge, ...riskStyle }}>{value ?? "—"}</span>;
}

function BoolSafetyBadge({ value }: { value: boolean | undefined }) {
  const isTrue = value === true;

  return (
    <span
      style={{
        ...styles.badge,
        ...(isTrue ? styles.unsafeTrueBadge : styles.safeFalseBadge),
      }}
    >
      {isTrue ? "true" : "false"}
    </span>
  );
}

export default function SemanticReviewActionsPanel({
  actions,
}: SemanticReviewActionsPanelProps) {
  if (actions.length === 0) {
    return (
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Review action candidates</h2>
        <div style={styles.muted}>No review action candidates yet.</div>
      </div>
    );
  }

  return (
    <div style={styles.section}>
      <h2 style={styles.sectionTitle}>Review action candidates</h2>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>actionKind</th>
              <th style={styles.th}>target</th>
              <th style={styles.th}>label</th>
              <th style={styles.th}>risk</th>
              <th style={styles.th}>write now?</th>
              <th style={styles.th}>gate?</th>
              <th style={styles.th}>confidence</th>
              <th style={styles.th}>reasoning</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((action, index) => (
              <tr key={`${action.actionKey ?? "action"}-${index}`}>
                <td style={styles.td}>{action.actionKind ?? "—"}</td>
                <td style={styles.td}>
                  <div>{action.targetType ?? "—"}</div>
                  <div style={styles.muted}>{action.targetTitle ?? "—"}</div>
                </td>
                <td style={styles.td}>{action.label ?? "—"}</td>
                <td style={styles.td}>
                  <RiskBadge value={action.riskLevel} />
                </td>
                <td style={styles.td}>
                  <BoolSafetyBadge value={action.wouldWriteNow} />
                </td>
                <td style={styles.td}>
                  <BoolSafetyBadge value={action.requiresPersistenceGate} />
                </td>
                <td style={styles.td}>{formatNumber(action.confidence)}</td>
                <td style={styles.td}>{action.reasoning ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
