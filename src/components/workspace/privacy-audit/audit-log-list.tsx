import type {
  AuditEvent,
  PrivacyAuditEventStatus,
  PrivacyLevel,
} from "./privacy-audit.types";
import { AuditEventCard } from "./audit-event-card";
import {
  getAuditEventStatusLabel,
  getAuditStatusClassName,
} from "./privacy-audit.utils";

interface AuditLogListProps {
  readonly auditEvents: readonly AuditEvent[];
  readonly privacyLevels: readonly PrivacyLevel[];
}

const auditStatuses: readonly PrivacyAuditEventStatus[] = [
  "inferred",
  "confirmed",
  "rejected",
  "corrected",
];

export function AuditLogList({
  auditEvents,
  privacyLevels,
}: AuditLogListProps) {
  const statusCounts = auditStatuses.map((status) => ({
    status,
    count: auditEvents.filter((event) => event.status === status).length,
  }));

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-2 border-b border-border pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">
            Audit log
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Read-only list of inferred, confirmed, rejected, and corrected
            meanings with visible reasons, sources, and privacy levels.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{auditEvents.length}</span>{" "}
          audit events
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-4">
        {statusCounts.map(({ status, count }) => (
          <div
            key={status}
            className={`rounded-lg border px-3 py-2 ${getAuditStatusClassName(
              status,
            )}`}
          >
            <p className="text-xs font-medium uppercase tracking-wide opacity-80">
              {getAuditEventStatusLabel(status)}
            </p>
            <p className="mt-1 text-lg font-semibold">{count}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {auditEvents.map((event) => {
          const privacyLevel = privacyLevels.find(
            (level) => level.id === event.privacyLevelId,
          );

          return (
            <AuditEventCard
              key={event.id}
              event={event}
              privacyLevel={privacyLevel}
            />
          );
        })}
      </div>

      <div className="mt-5 rounded-lg border border-dashed border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
        Audit log is display-only in UI-13. It does not write corrections,
        update resolver state, or persist feedback.
      </div>
    </section>
  );
}
