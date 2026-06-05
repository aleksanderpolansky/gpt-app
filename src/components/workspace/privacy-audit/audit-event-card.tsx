import type { AuditEvent, PrivacyLevel } from "./privacy-audit.types";
import {
  formatConfidencePercent,
  getAuditEventStatusLabel,
  getAuditEventSummary,
  getAuditStatusClassName,
  getPrivacyLevelClassName,
  getVisibilityLabel,
} from "./privacy-audit.utils";

interface AuditEventCardProps {
  readonly event: AuditEvent;
  readonly privacyLevel?: PrivacyLevel;
}

export function AuditEventCard({ event, privacyLevel }: AuditEventCardProps) {
  return (
    <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getAuditStatusClassName(
                event.status,
              )}`}
            >
              {getAuditEventStatusLabel(event.status)}
            </span>

            <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {event.sourceType}
            </span>
          </div>

          <h3 className="text-base font-semibold text-foreground">
            {event.sourceLabel}
          </h3>

          <p className="text-sm leading-6 text-muted-foreground">
            {getAuditEventSummary(event)}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Confidence
          </p>
          <p className="mt-1 font-semibold text-foreground">
            {formatConfidencePercent(event.confidence)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {event.previousValue ? (
          <div className="rounded-lg border border-border bg-background/60 px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Previous value
            </p>
            <p className="mt-1 text-sm text-foreground">
              {event.previousValue}
            </p>
          </div>
        ) : null}

        <div className="rounded-lg border border-border bg-background/60 px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Inferred value
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {event.inferredValue}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-background/60 px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Actor
          </p>
          <p className="mt-1 text-sm text-foreground">{event.actorLabel}</p>
        </div>

        <div className="rounded-lg border border-border bg-background/60 px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Created
          </p>
          <p className="mt-1 text-sm text-foreground">
            {event.createdAtLabel}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-dashed border-border bg-muted px-3 py-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Reason
        </p>
        <p className="mt-1 text-sm leading-6 text-foreground">{event.reason}</p>
      </div>

      {privacyLevel ? (
        <div
          className={`mt-4 rounded-lg border p-3 ${getPrivacyLevelClassName(
            privacyLevel.level,
          )}`}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide opacity-80">
                Privacy level
              </p>
              <p className="mt-1 text-sm font-semibold">
                {privacyLevel.label}
              </p>
            </div>

            <span className="rounded-full border border-current px-2.5 py-1 text-xs font-medium">
              {getVisibilityLabel(privacyLevel.visibility)}
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
          Privacy level reference: {event.privacyLevelId}
        </div>
      )}
    </article>
  );
}
