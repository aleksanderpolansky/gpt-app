"use client";

import type { CSSProperties } from "react";

type PersistenceGateBlockerForUi = {
  code?: string;
  message?: string;
  severity?: string;
};

type PersistenceGateTargetForUi = {
  targetType?: string;
  targetKey?: string;
  targetTitle?: string;
  status?: string;
  confidence?: number | null;
  reason?: string;
};

export type SemanticPersistenceGateForUi = {
  policy?: string;
  mode?: string;
  canPersistNow?: boolean;
  canCreateActivityEventNow?: boolean;
  canCreateValueObjectNow?: boolean;
  canCreateActivityValueObjectLinkNow?: boolean;
  canCreateStateDeltaNow?: boolean;
  canCreateStateFactNow?: boolean;
  canCreateStateSnapshotNow?: boolean;
  requiresExplicitGate?: boolean;
  requiresAuthenticatedActor?: boolean;
  requiresRlsRuntimeVerification?: boolean;
  requiresUserReview?: boolean;
  eligibleFutureTargets?: PersistenceGateTargetForUi[];
  blockedNowTargets?: PersistenceGateTargetForUi[];
  blockers?: PersistenceGateBlockerForUi[];
  warnings?: string[];
  safetyNotes?: string[];
  counts?: {
    resolvedCategories?: number;
    valueObjectCandidates?: number;
    exposureCandidates?: number;
    stateDeltaCandidates?: number;
    reviewActionCandidates?: number;
    eligibleFutureTargets?: number;
    blockedNowTargets?: number;
  };
};

type SemanticPersistenceGatePanelProps = {
  gate: SemanticPersistenceGateForUi | null;
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

function BoolGateBadge({ value }: { value: boolean | undefined }) {
  const isTrue = value === true;

  return (
    <span
      style={{
        ...styles.badge,
        ...(isTrue ? styles.warningBadge : styles.safeBadge),
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

function StatusBadge({ value }: { value: string | undefined }) {
  const style =
    value === "blocked_now" || value === "forbidden_as_state_fact"
      ? styles.blockingBadge
      : value === "requires_user_confirmation"
        ? styles.warningBadge
        : styles.safeBadge;

  return <span style={{ ...styles.badge, ...style }}>{value ?? "—"}</span>;
}

function EmptyState({ text }: { text: string }) {
  return <div style={styles.muted}>{text}</div>;
}

function TargetTable({
  title,
  targets,
}: {
  title: string;
  targets: PersistenceGateTargetForUi[];
}) {
  return (
    <div style={styles.section}>
      <h3 style={styles.sectionTitle}>{title}</h3>

      {targets.length > 0 ? (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>targetType</th>
                <th style={styles.th}>status</th>
                <th style={styles.th}>title</th>
                <th style={styles.th}>confidence</th>
                <th style={styles.th}>reason</th>
              </tr>
            </thead>
            <tbody>
              {targets.slice(0, 20).map((target, index) => (
                <tr key={`${target.targetType ?? "target"}-${target.targetKey ?? index}`}>
                  <td style={styles.td}>{target.targetType ?? "—"}</td>
                  <td style={styles.td}>
                    <StatusBadge value={target.status} />
                  </td>
                  <td style={styles.td}>
                    <div>{target.targetTitle ?? "—"}</div>
                    <div style={styles.muted}>{target.targetKey ?? "—"}</div>
                  </td>
                  <td style={styles.td}>{formatNumber(target.confidence)}</td>
                  <td style={styles.td}>{target.reason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState text="No targets yet." />
      )}

      {targets.length > 20 ? (
        <div style={styles.muted}>Showing first 20 of {targets.length} targets.</div>
      ) : null}
    </div>
  );
}

export default function SemanticPersistenceGatePanel({
  gate,
}: SemanticPersistenceGatePanelProps) {
  if (!gate) {
    return (
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Persistence gate</h2>
        <EmptyState text="Run preview to see persistence gate." />
      </div>
    );
  }

  const blockers = gate.blockers ?? [];
  const eligibleFutureTargets = gate.eligibleFutureTargets ?? [];
  const blockedNowTargets = gate.blockedNowTargets ?? [];

  return (
    <div style={styles.section}>
      <h2 style={styles.sectionTitle}>Persistence gate</h2>

      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.cardValue}>
            <BoolGateBadge value={gate.canPersistNow} />
          </div>
          <div style={styles.cardLabel}>canPersistNow</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardValue}>
            <BoolGateBadge value={gate.requiresExplicitGate} />
          </div>
          <div style={styles.cardLabel}>requiresExplicitGate</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardValue}>
            <BoolGateBadge value={gate.requiresAuthenticatedActor} />
          </div>
          <div style={styles.cardLabel}>requiresAuthenticatedActor</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardValue}>
            <BoolGateBadge value={gate.requiresRlsRuntimeVerification} />
          </div>
          <div style={styles.cardLabel}>requiresRlsRuntimeVerification</div>
        </div>
      </div>

      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.cardValue}>{gate.counts?.eligibleFutureTargets ?? 0}</div>
          <div style={styles.cardLabel}>eligible future targets</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardValue}>{gate.counts?.blockedNowTargets ?? 0}</div>
          <div style={styles.cardLabel}>blocked now targets</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardValue}>{blockers.length}</div>
          <div style={styles.cardLabel}>blockers</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardValue}>{gate.mode ?? "—"}</div>
          <div style={styles.cardLabel}>mode</div>
        </div>
      </div>

      <h3 style={styles.sectionTitle}>Blockers</h3>
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
        <EmptyState text="No blockers." />
      )}

      <TargetTable
        title="Blocked now targets"
        targets={blockedNowTargets}
      />

      <TargetTable
        title="Eligible future targets"
        targets={eligibleFutureTargets}
      />
    </div>
  );
}
